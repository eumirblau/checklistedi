import { JefeDeGrupo, Obra, Instalacion, ChecklistItem, TipoInstalacion, EstadoItem } from '../types';

const BASE_URL = 'https://europe-west1-checkedhid.cloudfunctions.net';

// API Service con fallback a datos offline para mayor estabilidad
class ApiService {
  private obraCache: { [jefeNombre: string]: Obra[] } = {};
  private obraCacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  private useOfflineMode: boolean = false; // Flag para alternar entre online/offline

  // Datos de respaldo para cuando falla la conexión
  private datosOffline = {
    jefes: [
      { id: '1', nombre: 'Juan Pérez', email: 'juan.perez@empresa.com' },
      { id: '2', nombre: 'María García', email: 'maria.garcia@empresa.com' },
      { id: '3', nombre: 'Carlos López', email: 'carlos.lopez@empresa.com' },
      { id: '4', nombre: 'Ana Martínez', email: 'ana.martinez@empresa.com' },
    ],
    obras: {
      'Juan Pérez': [
        { id: 'obra-001', nombre: 'Edificio Central', spreadsheetId: 'test-sheet-001', ubicacion: 'Madrid Centro', estado: 'Activo' },
        { id: 'obra-002', nombre: 'Torre Norte', spreadsheetId: 'test-sheet-002', ubicacion: 'Madrid Norte', estado: 'En Progreso' },
      ],
      'María García': [
        { id: 'obra-003', nombre: 'Complejo Sur', spreadsheetId: 'test-sheet-003', ubicacion: 'Madrid Sur', estado: 'Activo' },
        { id: 'obra-004', nombre: 'Plaza Este', spreadsheetId: 'test-sheet-004', ubicacion: 'Madrid Este', estado: 'Completado' },
      ],
      'Carlos López': [
        { id: 'obra-005', nombre: 'Parque Oeste', spreadsheetId: 'test-sheet-005', ubicacion: 'Madrid Oeste', estado: 'Activo' },
      ],
      'Ana Martínez': [
        { id: 'obra-006', nombre: 'Centro Comercial', spreadsheetId: 'test-sheet-006', ubicacion: 'Madrid', estado: 'En Progreso' },
      ],
    },
    instalaciones: {
      'test-sheet-001': ['Instalación Eléctrica', 'Instalación de Agua', 'Sistema de Seguridad'],
      'test-sheet-002': ['Red de Datos', 'Climatización', 'Ascensores'],
      'test-sheet-003': ['Iluminación', 'Fontanería', 'Gas Natural'],
      'test-sheet-004': ['Aire Acondicionado', 'Sistemas de Alarma'],
      'test-sheet-005': ['Riego Automático', 'Iluminación Exterior'],
      'test-sheet-006': ['Escaleras Mecánicas', 'Sistema de Sonido', 'Videovigilancia'],
    }
  };
  // ✅ ARQUITECTURA ESCALABLE: Obtener ID real de spreadsheet dinámicamente
  public async mapToRealSpreadsheetId(obraIdOrName: string): Promise<string> {
    console.log(`[ApiService.mapToRealSpreadsheetId] Received obraIdOrName: ${obraIdOrName}`);

    // Validar que obraIdOrName no sea undefined/null
    if (!obraIdOrName || typeof obraIdOrName !== 'string') {
      console.error(`[ApiService.mapToRealSpreadsheetId] obraIdOrName es undefined/null/invalid: ${obraIdOrName}`);
      throw new Error('ID de obra no válido');
    }

    // Primero verificar si ya es un ID de Google Sheets válido
    if (obraIdOrName.match(/^[a-zA-Z0-9_-]{44}$/) || obraIdOrName.length > 40) {
      console.log(`[ApiService.mapToRealSpreadsheetId] ${obraIdOrName} parece ser ya un ID de Google Sheets, devolviendo tal como está`);
      return obraIdOrName;
    }

    try {
      // Buscar en todas las obras cacheadas de todos los jefes
      for (const [jefeNombre, obras] of Object.entries(this.obraCache)) {
        const obra = obras.find(o => o.id === obraIdOrName || o.nombre === obraIdOrName);
        if (obra && obra.spreadsheetId) {
          console.log(`[ApiService.mapToRealSpreadsheetId] Found ${obraIdOrName} in cache for ${jefeNombre}: ${obra.spreadsheetId}`);
          return obra.spreadsheetId;
        }
      }

      // Si no está en cache, intentar obtener obras de todos los jefes
      console.log('[ApiService.mapToRealSpreadsheetId] Not found in cache, refreshing from API...');
      const jefes = await this.getJefesDeGrupo();
      for (const jefe of jefes) {
        const obras = await this.getObrasPorJefe(jefe.nombre);
        const obra = obras.find(o => o.id === obraIdOrName || o.nombre === obraIdOrName);
        if (obra && obra.spreadsheetId) {
          console.log(`[ApiService.mapToRealSpreadsheetId] Found ${obraIdOrName} for ${jefe.nombre}: ${obra.spreadsheetId}`);
          return obra.spreadsheetId;
        }
      }
    } catch (error) {
      console.warn(`[ApiService.mapToRealSpreadsheetId] Error dinámico: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Si todo falla, devolver un ID por defecto (San Blas)
    const defaultId = '1__5J8ykBjRvgFYW3d4i0vCyM6ukZ4Ax4Pf21N2Le7tw';
    console.warn(`[ApiService.mapToRealSpreadsheetId] ⚠️ Obra '${obraIdOrName}' no encontrada. Usando ID por defecto: ${defaultId}`);
    return defaultId;
  }  // Method to fetch installations for a given construction work (obra)
  async getInstalacionesDeObra(obraIdOrName: string): Promise<Instalacion[]> {
    console.log(`[ApiService.getInstalacionesDeObra] Called with obraIdOrName: ${obraIdOrName}`);
    // Make sure to call the unified mapToRealSpreadsheetId
    const spreadsheetId = await this.mapToRealSpreadsheetId(obraIdOrName);
    console.log(`[ApiService.getInstalacionesDeObra] Mapped obraIdOrName '${obraIdOrName}' to spreadsheetId: ${spreadsheetId}`);
    
    try {
      // Crear AbortController para timeout personalizado
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout
      
      const response = await fetch(`${BASE_URL}/getInstalacionesDeObra?spreadsheetId=${spreadsheetId}`, {
        signal: controller.signal, // Agregar signal para timeout
      });
      
      clearTimeout(timeoutId); // Limpiar timeout si la respuesta llega a tiempo
      
      if (!response.ok) {
        console.error(`[ApiService.getInstalacionesDeObra] API error for ${obraIdOrName} (ID: ${spreadsheetId}): ${response.status}`);
        throw new Error(`Error fetching instalaciones for ${obraIdOrName}: ${response.statusText}`);
      }
      
      // La API puede devolver strings (nombres) u objetos completos desde la hoja maestra
      const data = await response.json();
      console.log('✅ Instalaciones obtenidas de Google Sheets (raw):', data);
      
      if (!Array.isArray(data)) {
        console.warn('⚠️ API devolvió datos inválidos para instalaciones');
        return [];
      }
      
      return data.map((item: any, index: number) => {
        if (typeof item === 'string') {
          // Si es solo el nombre, crear objeto básico
          return {
            id: `${spreadsheetId}-${item.replace(/\s+/g, '-')}-${index}`,
            nombre: item,
            nombreAmigable: item, // Usar el nombre real sin modificar
            tipo: TipoInstalacion.OTROS, // Tipo por defecto hasta que venga de la hoja
            estado: EstadoItem.PENDIENTE, // Estado por defecto hasta que venga de la hoja
          };
        } else {
          // Si es objeto completo de la hoja maestra, usar todos los datos reales
          return {
            id: item.id || `${spreadsheetId}-${item.nombre || 'sin-nombre'}-${index}`,
            nombre: item.nombre || item,
            nombreAmigable: item.nombreAmigable || item.nombre || item,
            tipo: item.tipo || TipoInstalacion.OTROS,
            estado: item.estado || EstadoItem.PENDIENTE,
          };
        }
      });
    } catch (error) {
      console.error(`[ApiService.getInstalacionesDeObra] Error fetching or processing instalaciones for ${obraIdOrName} (ID: ${spreadsheetId}):`, error);
      throw error;
    }
  }
  // Method to fetch checklist items for a specific installation and obra
  async getItemsDeChecklist(obraIdOrName: string, instalacionNombre: string): Promise<ChecklistItem[]> {
    console.log(`[ApiService.getItemsDeChecklist] Called with obraIdOrName: ${obraIdOrName}, instalacion: ${instalacionNombre}`);

    // Extract the actual sheet name from the instalacionNombre if it's a composite ID
    // Format: spreadsheetId-SHEETNAME-index -> we need just SHEETNAME
    let actualSheetName = instalacionNombre;
    if (instalacionNombre.includes('-') && instalacionNombre.length > 40) {
      // This looks like a composite ID, extract the sheet name
      const parts = instalacionNombre.split('-');
      if (parts.length >= 3) {
        // Remove the first part (spreadsheetId) and last part (index)
        // Join the middle parts in case the sheet name itself contains dashes
        actualSheetName = parts.slice(1, -1).join('-');
        console.log(`[ApiService.getItemsDeChecklist] Extracted sheet name '${actualSheetName}' from composite ID '${instalacionNombre}'`);
      }
    }    // Make sure to call the unified mapToRealSpreadsheetId
    const spreadsheetId = await this.mapToRealSpreadsheetId(obraIdOrName);    console.log(`[ApiService.getItemsDeChecklist] Mapped obraIdOrName '${obraIdOrName}' to spreadsheetId: ${spreadsheetId} for instalacion ${actualSheetName}`);
    
    try {
      // Crear AbortController para timeout personalizado
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
      
      const response = await fetch(`${BASE_URL}/getItemsDeChecklist?spreadsheetId=${spreadsheetId}&pestana=${encodeURIComponent(actualSheetName)}`, {
        signal: controller.signal, // Agregar signal para timeout
      });
      
      clearTimeout(timeoutId); // Limpiar timeout si la respuesta llega a tiempo
      
      if (!response.ok) {
        console.error(`[ApiService.getItemsDeChecklist] API error for ${obraIdOrName}/${actualSheetName} (ID: ${spreadsheetId}): ${response.status}`);
        throw new Error(`Error fetching items for ${obraIdOrName}/${actualSheetName}: ${response.statusText}`);
      }      // La API devuelve array de objetos con la estructura real de Google Sheets
      const itemsData = await response.json() as unknown as any[];
      console.log('✅ Datos raw de API recibidos:', JSON.stringify(itemsData, null, 2));
      
      // MAPEO REAL con los datos de Google Sheets
      return itemsData.map((item: any, index: number) => {
        // Determinar si está completado basado en s_contrato
        const isCompleted = item.s_contrato === '√' || item.s_contrato === 'true' || item.s_contrato === true;
        
        // Crear ID único basado en la fila o contenido
        const itemId = item.id || `${spreadsheetId}-${index}-${(item.unidad || item.descripcion || 'item').replace(/\s+/g, '-')}`;
        
        console.log(`[ApiService.getItemsDeChecklist] Procesando item ${index}:`, {
          unidad: item.unidad,
          descripcion: item.descripcion,
          s_contrato: item.s_contrato,
          isCompleted,
          rowIndex: item.rowIndex || index + 2 // +2 porque las filas empiezan en 2 en Google Sheets
        });
        
        return {
          id: itemId,
          descripcion: String(item.descripcion || '').trim(),
          completado: isCompleted,
          observaciones: String(item.observaciones || '').trim(),
          unidad: String(item.unidad || '').trim(),
          s_contrato: String(item.s_contrato || '').trim(),
          fechapp: String(item.fechapp || '').trim(),
          cantidad: item.cantidad ? Number(item.cantidad) : undefined,
          fechaCompletado: isCompleted ? (item.fechapp || new Date().toISOString()) : undefined,
          rowIndex: item.rowIndex || index + 2, // Índice real de la fila en Google Sheets
          meta: item.meta ? String(item.meta) : undefined,
          actual: item.actual ? String(item.actual) : undefined,
          subItems: [],
        };
      }).filter(item => {
        // Filtrar items que tengan al menos unidad o descripción
        const hasContent = item.unidad || item.descripcion;
        if (!hasContent) {
          console.log('[ApiService.getItemsDeChecklist] Filtrando item vacío:', item);
        }
        return hasContent;
      });
    } catch (error) {
      console.error(`[ApiService.getItemsDeChecklist] Error fetching or processing items for ${obraIdOrName}/${instalacionNombre} (ID: ${spreadsheetId}):`, error);
      throw error;
    }
  }
  // Method to save checklist items
  async guardarChecks(
    obraIdOrName: string,
    instalacionNombre: string,
    itemsToSave: ChecklistItem[],
    usuario: string,
    cargo: string,
    _obraNombreOriginal: string
  ): Promise<any> {
    console.log(`[ApiService.guardarChecks] Called with obraIdOrName: ${obraIdOrName}, instalacion: ${instalacionNombre}`);

    // Extract the actual sheet name from the instalacionNombre if it's a composite ID
    // Format: spreadsheetId-SHEETNAME-index -> we need just SHEETNAME
    let actualSheetName = instalacionNombre;
    if (instalacionNombre.includes('-') && instalacionNombre.length > 40) {
      // This looks like a composite ID, extract the sheet name
      const parts = instalacionNombre.split('-');
      if (parts.length >= 3) {
        // Remove the first part (spreadsheetId) and last part (index)
        // Join the middle parts in case the sheet name itself contains dashes
        actualSheetName = parts.slice(1, -1).join('-');
        console.log(`[ApiService.guardarChecks] Extracted sheet name '${actualSheetName}' from composite ID '${instalacionNombre}'`);
      }
    }

    // Make sure to call the unified mapToRealSpreadsheetId
    const spreadsheetId = await this.mapToRealSpreadsheetId(obraIdOrName);
    console.log(`[ApiService.guardarChecks] Mapped obraIdOrName '${obraIdOrName}' to spreadsheetId: ${spreadsheetId} for instalacion ${actualSheetName}`);

    // 🔧 FIX: Función helper para formatear observaciones con historial
    const formatObservationWithHistory = (existingObservations: string, newObservation: string, userName: string): string => {
      const now = new Date();
      const timestamp = now.toLocaleDateString('es-ES') + ' ' + now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      if (!newObservation || newObservation.trim() === '') {
        return existingObservations || '';
      }
      
      const formattedNewObservation = `[${timestamp}] ${userName}: ${newObservation.trim()}`;
      
      if (!existingObservations || existingObservations.trim() === '') {
        return formattedNewObservation;
      }
      
      return `${existingObservations}\n\n${formattedNewObservation}`;
    };

    // 🔧 FIX: Filtrar items que han sido modificados o tienen observaciones
    const itemsWithChanges = itemsToSave.filter(item => {
      // Incluir items que tienen rowIndex válido Y (están marcados O tienen observaciones)
      const hasValidRowIndex = typeof item.rowIndex === 'number' && item.rowIndex > 0;
      const isMarked = item.completado === true; // Solo items marcados o con observaciones
      const hasObservations = item.observaciones && item.observaciones.trim() !== '';
      
      // Incluir si tiene rowIndex válido Y (está marcado O tiene observaciones)
      return hasValidRowIndex && (isMarked || hasObservations);
    });

    console.log(`📋 Filtrando items: ${itemsToSave.length} total -> ${itemsWithChanges.length} con cambios válidos`);

    // 🔧 FIX: Transformar al formato backend usando rowIndex REAL y fecha actual
    const currentDate = new Date().toLocaleDateString('es-ES');
    
    const backendItems = itemsWithChanges.map((item) => {
      // Usar el rowIndex REAL del item, no un índice artificial
      const realRowIndex = item.rowIndex || 2; // Fallback si no hay rowIndex
      
      // 🔧 ESTRATEGIA CONSERVADORA: Solo enviar cambios explícitos
      // - Si está marcado (completado: true) → enviar '√' y fecha
      // - Si no está marcado pero tiene observaciones → enviar '' (mantener estado actual)
      const s_contrato = item.completado ? '√' : ''; // Solo marcar explícitamente, no desmarcar
      const fechapp = item.completado ? currentDate : '';
      
      return {
        rowIndex: realRowIndex,
        s_contrato: s_contrato,
        fechapp: fechapp,
        observaciones: item.observaciones || '',
      };
    });

    console.log(`📤 Enviando ${backendItems.length} items al backend:`, backendItems);

    // No need to check if spreadsheetId is undefined
    try {
      const response = await fetch(`${BASE_URL}/guardarChecks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            spreadsheetId,
            pestana: actualSheetName,
            items: backendItems,
            usuario: usuario,
            cargo: cargo,
          }),
        }
      );
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[ApiService.guardarChecks] API error for ${obraIdOrName}/${instalacionNombre} (ID: ${spreadsheetId}): ${response.status} - ${errorBody}`);
        throw new Error(`Error guardando checks for ${obraIdOrName}/${instalacionNombre}: ${response.statusText} - ${errorBody}`);
      }
      const responseData: any = await response.json() as unknown as any; // Add type for responseData
      console.log(`✅ [ApiService.guardarChecks] Guardado exitoso:`, responseData);
      return responseData;
    } catch (error) {
      console.error(`[ApiService.guardarChecks] Error saving checks for ${obraIdOrName}/${instalacionNombre} (ID: ${spreadsheetId}):`, error);
      throw error;
    }
  }  // Helper para procesar nombres (sin modificaciones artificiales)
  private generarNombreAmigable(nombreOriginal: string): string {
    // Devolver el nombre original sin modificaciones artificiales
    // Los nombres deben venir correctos desde la hoja maestra
    return nombreOriginal.trim();
  }
  // Calculate execution percentage for a construction site
  async calcularPorcentajeEjecucion(obraIdOrName: string): Promise<number> {
    try {
      const spreadsheetId = await this.mapToRealSpreadsheetId(obraIdOrName);
      // No undefined check needed for spreadsheetId
      console.log('📊 Calculando porcentaje de ejecución para:', { obraIdOrName, spreadsheetId });
      const instalaciones = await this.getInstalacionesDeObra(obraIdOrName);
      if (instalaciones.length === 0) {
        console.log('⚠️ No hay instalaciones para calcular porcentaje');
        return 0;
      }
      let totalItems = 0;
      let itemsCompletados = 0;
      for (const instalacion of instalaciones) {
        try {
          const items = await this.getItemsDeChecklist(obraIdOrName, instalacion.nombre);
          totalItems += items.length;
          // Corrected to use item.completado (boolean) as per ChecklistItem type
          itemsCompletados += items.filter(item => item.completado === true).length;
          console.log(`📋 Instalación ${instalacion.nombre}: ${items.filter(item => item.completado === true).length}/${items.length} completados`);
        } catch (error) {
          console.warn(`⚠️ Error obteniendo items para instalación ${instalacion.nombre}:`, error);
        }
      }
      const porcentaje = totalItems > 0 ? Math.round((itemsCompletados / totalItems) * 100) : 0;
      console.log(`✅ Porcentaje total de ejecución para ${obraIdOrName}: ${porcentaje}% (${itemsCompletados}/${totalItems})`);
      return porcentaje;
    } catch (error) {      console.error('❌ Error calculando porcentaje de ejecución:', error);
      return 0;
    }
  }
  // Get list of group leaders
  async getJefesDeGrupo(): Promise<JefeDeGrupo[]> {
    console.log('📊 [ApiService.getJefesDeGrupo] Iniciando obtención de jefes...');
    console.log('📊 [ApiService.getJefesDeGrupo] URL base:', BASE_URL);
    console.log('📊 [ApiService.getJefesDeGrupo] URL completa:', `${BASE_URL}/getJefesDeGrupo`);
    
    // Si está en modo offline, usar datos locales
    if (this.useOfflineMode) {
      console.log('📱 [ApiService.getJefesDeGrupo] Usando datos offline para jefes');
      return this.datosOffline.jefes;
    }
    
    try {
      console.log('🌐 [ApiService.getJefesDeGrupo] Intentando conectar a la API...');
      
      // Crear AbortController para timeout personalizado
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ [ApiService.getJefesDeGrupo] Timeout de 8 segundos alcanzado');
        controller.abort();
      }, 8000); // 8 segundos timeout
      
      const response = await fetch(`${BASE_URL}/getJefesDeGrupo`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal, // Agregar signal para timeout
      });
      
      clearTimeout(timeoutId); // Limpiar timeout si la respuesta llega a tiempo
      console.log('📡 [ApiService.getJefesDeGrupo] Respuesta recibida. Status:', response.status, 'OK:', response.ok);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      // La API puede devolver un array de strings (nombres) o objetos completos
      const data = await response.json();
      console.log('✅ [ApiService.getJefesDeGrupo] Jefes obtenidos de Google Sheets (raw):', data);
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No se pudieron obtener los jefes de grupo');
      }
        // Si son strings simples, crear objetos básicos sin email artificial
      const jefes = data.map((item, index) => {
        if (typeof item === 'string') {
          return {
            id: (index + 1).toString(),
            nombre: item,
            email: '', // Sin email artificial, usar dato real de la hoja si está disponible
          };
        } else {
          // Si ya son objetos completos de la hoja maestra
          return {
            id: item.id || (index + 1).toString(),
            nombre: item.nombre || item,
            email: item.email || '', // Solo usar email si viene de la hoja
          };
        }
      });
      
      console.log('🔄 [ApiService.getJefesDeGrupo] Jefes procesados desde hoja maestra:', jefes);
      console.log('✅ [ApiService.getJefesDeGrupo] Retornando', jefes.length, 'jefes de la API real');
      return jefes;
    } catch (error) {
      console.warn('⚠️ [ApiService.getJefesDeGrupo] Error conectando con Google Sheets:', error);
      console.warn('⚠️ [ApiService.getJefesDeGrupo] Tipo de error:', typeof error, error?.constructor?.name);
      if (error instanceof Error) {
        console.warn('⚠️ [ApiService.getJefesDeGrupo] Mensaje de error:', error.message);
        console.warn('⚠️ [ApiService.getJefesDeGrupo] Stack:', error.stack);
      }
      console.log('📱 [ApiService.getJefesDeGrupo] Cambiando a modo offline temporal');
      
      // Usar datos offline como fallback
      console.log('📱 [ApiService.getJefesDeGrupo] Retornando', this.datosOffline.jefes.length, 'jefes offline');
      return this.datosOffline.jefes;
    }
  }  async getObrasPorJefe(jefeNombre: string): Promise<Obra[]> {
    console.log('📊 [ApiService.getObrasPorJefe] Iniciando obtención de obras para jefe:', jefeNombre);
    console.log('📊 [ApiService.getObrasPorJefe] URL completa:', `${BASE_URL}/getObrasPorJefe?jefe=${encodeURIComponent(jefeNombre)}`);
    
    // Si está en modo offline, usar datos locales
    if (this.useOfflineMode) {
      console.log('📱 [ApiService.getObrasPorJefe] Usando datos offline para obras del jefe:', jefeNombre);
      return this.datosOffline.obras[jefeNombre] || [];
    }
    
    try {
      console.log('🌐 [ApiService.getObrasPorJefe] Intentando conectar a la API...');
      
      // Crear AbortController para timeout personalizado
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ [ApiService.getObrasPorJefe] Timeout de 8 segundos alcanzado');
        controller.abort();
      }, 8000); // 8 segundos timeout
      
      const response = await fetch(`${BASE_URL}/getObrasPorJefe?jefe=${encodeURIComponent(jefeNombre)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal, // Agregar signal para timeout
      });
      
      clearTimeout(timeoutId); // Limpiar timeout si la respuesta llega a tiempo
      console.log('📡 [ApiService.getObrasPorJefe] Respuesta recibida. Status:', response.status, 'OK:', response.ok);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      // Asumimos que la API devuelve un array de objetos. Cada objeto DEBE tener:
      // - 'id': Identificador de la obra en la app (ej: "ObraID001J")
      // - 'nombre': Nombre de la obra (ej: "Copia dneutra")
      // - 'spreadsheetId': EL ID REAL DE LA HOJA DE GOOGLE SHEETS (ej: "17OfTNY0OBiId27vCXqIa7p8nhmuvvk9Mh9C_WLGcnhA")
      // Otros campos como 'centro', 'googleSheetId' son opcionales o pueden ser alias.
      const data = await response.json() as unknown as Array<{
        id?: string;                 // Identificador de la obra en la app
        nombre?: string;             // Nombre de la obra
        spreadsheetId?: string;      // ID REAL DE LA HOJA DE GOOGLE SHEETS (campo esperado)
        centro?: string;             // Posible alias para 'nombre' o 'id' si la API lo usa así
        googleSheetId?: string;      // Posible alias para 'spreadsheetId' si la API lo usa así
        ubicacion?: string;
        estado?: string;
      }>;
      console.log('✅ Obras obtenidas de Google Sheets para', jefeNombre, '(raw):', data);
      if (!Array.isArray(data)) {
        console.warn('⚠️ API devolvió datos inválidos para obras');
        throw new Error('API devolvió datos inválidos');
      }        const obras = data.map((item: any, index: number): Obra => {
        // ✅ ARQUITECTURA ESCALABLE: La API ahora devuelve IDs reales de Google Sheets
        // Formato esperado: {centro: "ObraID003J", spreadsheetId: "17OfTNY0OBiId27vCXqIa7p8nhmuvvk9Mh9C_WLGcnhA"}
        const obraAppId = item.centro || item.id || item.nombre || `obra-${index}-${Math.random().toString(36).substr(2, 9)}`;
        const obraNombre = item.nombre || item.centro || `Obra ${index + 1}`;
        const realSheetId = item.spreadsheetId; // ✅ Ahora contiene el ID real de Google Sheets
        
        console.log(`🔍 [ApiService.getObrasPorJefe] Procesando obra ${index}:`, {
          obraAppId,
          obraNombre,
          realSheetId,
          itemRaw: item
        });
        
        if (!realSheetId) {
          console.warn(`❌ Obra ${obraNombre} (${obraAppId}) no tiene spreadsheetId desde la API. Las instalaciones no cargarán.`);
        } else {
          console.log(`✅ Obra ${obraNombre} (${obraAppId}) con ID real: ${realSheetId}`);
        }        return {
          id: obraAppId, // ID de la obra en la app (ej: "ObraID003J")
          nombre: obraNombre, // Nombre de la obra
          spreadsheetId: realSheetId as string, // ID real de Google Sheets
          ubicacion: item.ubicacion || 'Madrid',
          estado: item.estado || 'Activo',        };
      });
      console.log('🔄 [ApiService.getObrasPorJefe] Obras mapeadas (desde API) correctamente:', obras);
      console.log('✅ [ApiService.getObrasPorJefe] Retornando', obras.length, 'obras de la API real para', jefeNombre);
      return obras;
    } catch (error) {
      console.warn('⚠️ [ApiService.getObrasPorJefe] Error conectando con Google Sheets para obras:', error);
      console.warn('⚠️ [ApiService.getObrasPorJefe] Tipo de error:', typeof error, error?.constructor?.name);
      if (error instanceof Error) {
        console.warn('⚠️ [ApiService.getObrasPorJefe] Mensaje de error:', error.message);
      }
      console.log('📱 [ApiService.getObrasPorJefe] Usando datos offline para obras del jefe:', jefeNombre);
      
      // Usar datos offline como fallback
      const obrasOffline = this.datosOffline.obras[jefeNombre] || [];
      console.log('📱 [ApiService.getObrasPorJefe] Retornando', obrasOffline.length, 'obras offline para', jefeNombre);
      return obrasOffline;
    }
  }
}
export default new ApiService();
