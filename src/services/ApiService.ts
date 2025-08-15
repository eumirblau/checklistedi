import { ChecklistItem, EstadoItem, Instalacion, JefeDeGrupo, Obra, TipoInstalacion } from '../types';

const BASE_URL = 'https://us-central1-checklistedhinor.cloudfunctions.net';

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
      // Instalaciones reales para las obras de Javier
      '1YWMpahk6CAtw1trGiKuLMlJRTL0JOy9x7rRkxrAaRn4': ['Instalación Eléctrica Principal', 'Sistema de Climatización', 'Red de Datos'],
      '15EYdKNe_GqHi918p8CVh3-RjCc-zEy8jrdWNdoX61A': ['Instalación Hidráulica', 'Sistema de Seguridad', 'Iluminación LED'],
      '17OfTNY0OBiId27vCXqIa7p8nhmuvvk9Mh9C_WLGcnhA': ['Sistema de Aire Acondicionado', 'Red Eléctrica', 'Instalación de Gas'],
      '1ICEl45f3I59Iz4JDTRHD17huoiyISBxCO9eRXWcPdyU': ['Instalación de Fontanería', 'Sistema de Alarmas', 'Climatización Central'],
    }
  };
  // ✅ ARQUITECTURA ESCALABLE: Obtener ID real de spreadsheet dinámicamente
  public async mapToRealSpreadsheetId(obraIdOrName: string): Promise<string> {
    console.log(`🚀 [ApiService.mapToRealSpreadsheetId] INICIO - Received obraIdOrName: ${obraIdOrName}`);
    console.log(`🔍 [ApiService.mapToRealSpreadsheetId] Tipo:`, typeof obraIdOrName);

    // Validar que obraIdOrName no sea undefined/null
    if (!obraIdOrName || typeof obraIdOrName !== 'string') {
      console.error(`❌ [ApiService.mapToRealSpreadsheetId] obraIdOrName es undefined/null/invalid: ${obraIdOrName}`);
      throw new Error('ID de obra no válido');
    }

    // Primero verificar si ya es un ID de Google Sheets válido
    if (obraIdOrName.match(/^[a-zA-Z0-9_-]{44}$/) || obraIdOrName.length > 40) {
      console.log(`[ApiService.mapToRealSpreadsheetId] ${obraIdOrName} parece ser ya un ID de Google Sheets, devolviendo tal como está`);
      return obraIdOrName;
    }

    try {
      // Buscar en todas las obras cacheadas de todos los jefes
      console.log('[ApiService.mapToRealSpreadsheetId] Buscando en cache...');
      console.log('[ApiService.mapToRealSpreadsheetId] Cache disponible:', Object.keys(this.obraCache));
      
      for (const [jefeNombre, obras] of Object.entries(this.obraCache)) {
        console.log(`[ApiService.mapToRealSpreadsheetId] Revisando ${obras.length} obras de ${jefeNombre}:`, obras.map(o => `${o.id}:${o.nombre}`));
        const obra = obras.find(o => o.id === obraIdOrName || o.nombre === obraIdOrName);
        if (obra && obra.spreadsheetId) {
          console.log(`[ApiService.mapToRealSpreadsheetId] ✅ Found ${obraIdOrName} in cache for ${jefeNombre}: ${obra.spreadsheetId}`);
          return obra.spreadsheetId;
        }
      }

      // Si no está en cache, intentar obtener obras de todos los jefes
      console.log('[ApiService.mapToRealSpreadsheetId] Not found in cache, refreshing from API...');
      const jefes = await this.getJefesDeGrupo();
      console.log('[ApiService.mapToRealSpreadsheetId] Jefes obtenidos:', jefes.map(j => j.nombre));
      
      for (const jefe of jefes) {
        console.log(`[ApiService.mapToRealSpreadsheetId] Obteniendo obras de ${jefe.nombre}...`);
        const obras = await this.getObrasPorJefe(jefe.nombre);
        console.log(`[ApiService.mapToRealSpreadsheetId] Obras de ${jefe.nombre}:`, obras.map(o => `${o.id}:${o.nombre}:${o.spreadsheetId}`));
        
        const obra = obras.find(o => o.id === obraIdOrName || o.nombre === obraIdOrName);
        if (obra && obra.spreadsheetId) {
          console.log(`[ApiService.mapToRealSpreadsheetId] ✅ Found ${obraIdOrName} for ${jefe.nombre}: ${obra.spreadsheetId}`);
          return obra.spreadsheetId;
        }
      }
    } catch (error) {
      console.warn(`[ApiService.mapToRealSpreadsheetId] Error dinámico: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Si no se encuentra la obra, devolver null o lanzar error
    console.error(`[ApiService.mapToRealSpreadsheetId] ❌ Obra '${obraIdOrName}' no encontrada en ningún jefe`);
    throw new Error(`Obra '${obraIdOrName}' no encontrada`);
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
      
      // La API devuelve un objeto con propiedad 'instalaciones': {"instalaciones": [...]}
      const data = await response.json();
      console.log('✅ Instalaciones obtenidas de Google Sheets (raw):', data);
      
      // Extraer el array de instalaciones del objeto respuesta
      const instalacionesRaw = data.instalaciones;
      console.log('🔍 [ApiService.getInstalacionesDeObra] instalacionesRaw extraído:', instalacionesRaw);
      console.log('🔍 [ApiService.getInstalacionesDeObra] Es array?', Array.isArray(instalacionesRaw));
      console.log('🔍 [ApiService.getInstalacionesDeObra] Longitud:', instalacionesRaw?.length);
      
      if (!Array.isArray(instalacionesRaw)) {
        console.warn('⚠️ API devolvió datos inválidos para instalaciones');
        return [];
      }
      
      console.log('🚦 [ApiService.getInstalacionesDeObra] Verificando si array está vacío...');
      console.log('🚦 [ApiService.getInstalacionesDeObra] instalacionesRaw.length:', instalacionesRaw.length);
      
      // Si la API devuelve un array vacío, usar datos offline como fallback
      if (instalacionesRaw.length === 0) {
        console.log('📱 [ApiService.getInstalacionesDeObra] API devolvió array vacío, usando datos offline');
        console.log('🔍 [ApiService.getInstalacionesDeObra] Buscando instalaciones offline para spreadsheetId:', spreadsheetId);
        console.log('🗂️ [ApiService.getInstalacionesDeObra] Instalaciones offline disponibles:', Object.keys(this.datosOffline.instalaciones));
        
        const instalacionesOffline = this.datosOffline.instalaciones[spreadsheetId] || [];
        console.log('📋 [ApiService.getInstalacionesDeObra] Instalaciones encontradas para', spreadsheetId, ':', instalacionesOffline);
        
        if (instalacionesOffline.length === 0) {
          console.warn('⚠️ [ApiService.getInstalacionesDeObra] No hay instalaciones offline para este spreadsheetId');
          return [];
        }
        
        const result = instalacionesOffline.map((nombre: string, index: number) => ({
          id: `${spreadsheetId}-${nombre.replace(/\s+/g, '-')}-${index}`,
          nombre: nombre,
          nombreAmigable: nombre,
          tipo: TipoInstalacion.OTROS,
          estado: EstadoItem.PENDIENTE,
        }));
        
        console.log('✅ [ApiService.getInstalacionesDeObra] Retornando instalaciones offline:', result);
        return result;
      }
      
      return instalacionesRaw.map((item: any, index: number) => {
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
      console.log('📱 [ApiService.getInstalacionesDeObra] Usando datos offline como fallback por error');
      console.log('🔍 [ApiService.getInstalacionesDeObra] Buscando instalaciones offline para spreadsheetId:', spreadsheetId);
      console.log('🗂️ [ApiService.getInstalacionesDeObra] Instalaciones offline disponibles:', Object.keys(this.datosOffline.instalaciones));
      
      const instalacionesOffline = this.datosOffline.instalaciones[spreadsheetId] || [];
      console.log('📋 [ApiService.getInstalacionesDeObra] Instalaciones encontradas para', spreadsheetId, ':', instalacionesOffline);
      
      if (instalacionesOffline.length === 0) {
        console.warn('⚠️ [ApiService.getInstalacionesDeObra] No hay instalaciones offline para este spreadsheetId');
        return [];
      }
      
      const result = instalacionesOffline.map((nombre: string, index: number) => ({
        id: `${spreadsheetId}-${nombre.replace(/\s+/g, '-')}-${index}`,
        nombre: nombre,
        nombreAmigable: nombre,
        tipo: TipoInstalacion.OTROS,
        estado: EstadoItem.PENDIENTE,
      }));
      
      console.log('✅ [ApiService.getInstalacionesDeObra] Retornando instalaciones offline por error:', result);
      return result;
    }
  }

  // Función simple para obtener pestañas (instalaciones) de una obra
  async getPestanasDeObra(spreadsheetId: string): Promise<Instalacion[]> {
    console.log(`🚀 [ApiService.getPestanasDeObra] INICIO - Called with spreadsheetId: ${spreadsheetId}`);
    console.log(`🔍 [ApiService.getPestanasDeObra] Tipo de spreadsheetId:`, typeof spreadsheetId);
    console.log(`📏 [ApiService.getPestanasDeObra] Longitud de spreadsheetId:`, spreadsheetId?.length);
    
    if (!spreadsheetId) {
      console.error(`❌ [ApiService.getPestanasDeObra] spreadsheetId es null/undefined`);
      return [];
    }
    
    try {
      // Usar el endpoint correcto para obtener pestañas
      const response = await fetch(`${BASE_URL}/getPestanasDeObra?spreadsheetId=${spreadsheetId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [getPestanasDeObra] API response:', data);
        
        if (data.pestanas && Array.isArray(data.pestanas) && data.pestanas.length > 0) {
          // Convertir pestañas a instalaciones
          const result = data.pestanas.map((pestana: any, index: number) => ({
            id: `${spreadsheetId}-${pestana.title.replace(/\s+/g, '-')}-${index}`,
            nombre: pestana.title,
            nombreAmigable: pestana.title,
            tipo: TipoInstalacion.OTROS,
            estado: EstadoItem.PENDIENTE,
          }));
          
          console.log('✅ [getPestanasDeObra] Retornando pestañas de API:', result);
          return result;
        }
      }
    } catch (error) {
      console.log('⚠️ [getPestanasDeObra] API error, usando fallback:', error);
    }
    
    // Fallback: usar datos offline
    console.log('📱 [getPestanasDeObra] Usando datos offline para spreadsheetId:', spreadsheetId);
    console.log('🗂️ [getPestanasDeObra] Claves disponibles:', Object.keys(this.datosOffline.instalaciones));
    
    const instalacionesOffline = this.datosOffline.instalaciones[spreadsheetId] || [];
    console.log('📋 [getPestanasDeObra] Instalaciones offline encontradas:', instalacionesOffline);
    
    const result = instalacionesOffline.map((nombre: string, index: number) => ({
      id: `${spreadsheetId}-${nombre.replace(/\s+/g, '-')}-${index}`,
      nombre: nombre,
      nombreAmigable: nombre,
      tipo: TipoInstalacion.OTROS,
      estado: EstadoItem.PENDIENTE,
    }));
    
    console.log('✅ [getPestanasDeObra] Retornando:', result);
    return result;
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
      }      // La API devuelve un objeto con propiedad 'items': {"items": [...]}
      const responseData = await response.json();
      console.log('✅ Datos raw de API recibidos:', JSON.stringify(responseData, null, 2));
      
      // Extraer el array de items del objeto respuesta
      const itemsData = responseData.items;
      if (!Array.isArray(itemsData)) {
        console.warn('⚠️ API devolvió datos inválidos para items');
        return [];
      }
      
      // Los datos vienen como array de arrays: [["","ACOMETIDA BT","","","","EXISTENTE NO SE MODIFICA"], ...]
      // Necesitamos mapear cada fila (array) a un objeto ChecklistItem
      console.log(`📊 [ApiService.getItemsDeChecklist] Procesando ${itemsData.length} filas de datos`);

      return itemsData.map((row: any[], index: number) => {
        // Verificar que sea un array válido
        if (!Array.isArray(row)) {
          console.log(`⚠️ [ApiService.getItemsDeChecklist] Fila ${index} no es array:`, row);
          return null;
        }

        // Mapear las columnas según la estructura de Google Sheets
        // 🔧 ACTUALIZADO: Columna P (row[15]) = Observaciones según reporte del usuario
        const unidad = row[1] ? String(row[1]).trim() : '';
        const descripcion = row[5] ? String(row[5]).trim() : '';
        const s_contrato = row[11] ? String(row[11]).trim() : ''; // 🔧 FIX: Columna L = row[11] (no row[12])
        const fechapp = row[14] ? String(row[14]).trim() : ''; // Intentar columna O para fechapp
        const observaciones = row[15] ? String(row[15]).trim() : ''; // 🔧 FIX: Columna P = row[15]

        // Determinar si está completado
        const isCompleted = s_contrato === '√' || s_contrato === 'true';

        // Crear ID único
        const itemId = `${spreadsheetId}-${index}-${(unidad || descripcion || 'item').replace(/\s+/g, '-')}`;

        console.log(`[ApiService.getItemsDeChecklist] Procesando fila ${index}:`, {
          unidad,
          descripcion,
          s_contrato,
          observaciones: observaciones || 'SIN OBSERVACIONES',
          fechapp,
          isCompleted,
          rowIndex: index + 2 // 🔧 FIX: rowIndex correcto - idx 0 = fila 2, idx 1 = fila 3, etc.
        });

        return {
          id: itemId,
          descripcion: descripcion,
          completado: isCompleted,
          observaciones: observaciones || undefined,
          unidad: unidad || undefined,
          s_contrato: s_contrato || undefined,
          fechapp: fechapp || undefined,
          cantidad: undefined,
          fechaCompletado: isCompleted ? (fechapp || new Date().toISOString()) : undefined,
          rowIndex: index + 2, // 🔧 FIX: Índice real de la fila en Google Sheets (A2=2, A3=3, etc.)
          meta: undefined,
          actual: undefined,
          subItems: [],
        };
      }).filter(item => {
        // Filtrar items nulos y que tengan contenido
        if (!item) return false;
        const hasContent = Boolean(item.unidad || item.descripcion);
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
      
      console.log(`📝 Item ${item.unidad || item.descripcion}: observaciones="${item.observaciones || 'VACÍAS'}" rowIndex=${realRowIndex}`);
      
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

    // Si está en modo offline, usar datos locales y marcar el flag
    if (this.useOfflineMode) {
      console.log('📱 [ApiService.getJefesDeGrupo] Usando datos offline para jefes');
      return Object.assign([], this.datosOffline.jefes, { isOffline: true });
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

      // La API devuelve un objeto con propiedad 'jefes': {"jefes": [["JEFES DE GRUPO"], ["Monserrat"], ...]}
      const data = await response.json();
      console.log('✅ [ApiService.getJefesDeGrupo] Jefes obtenidos de Google Sheets (raw):', data);

      // Extraer el array de jefes del objeto respuesta
      const jefesRaw = data.jefes;
      if (!Array.isArray(jefesRaw) || jefesRaw.length === 0) {
        throw new Error('No se pudieron obtener los jefes de grupo');
      }

      // Filtrar el header y obtener nombres únicos de jefes
      const nombresJefes = jefesRaw
        .filter(row => Array.isArray(row) && row.length > 0 && row[0] !== 'JEFES DE GRUPO')
        .map(row => row[0])
        .filter((nombre, index, array) => array.indexOf(nombre) === index);

      // Si son strings simples, crear objetos básicos sin email artificial
      const jefes = nombresJefes.map((nombre, index) => ({
        id: (index + 1).toString(),
        nombre: nombre,
        email: '', // Sin email artificial, usar dato real de la hoja si está disponible
      }));

      console.log('🔄 [ApiService.getJefesDeGrupo] Jefes procesados desde hoja maestra:', jefes);
      console.log('✅ [ApiService.getJefesDeGrupo] Retornando', jefes.length, 'jefes de la API real');
      // Retornar solo jefes reales y marcar el flag offline en false
      return Object.assign([], jefes, { isOffline: false });
    } catch (error) {
      console.warn('⚠️ [ApiService.getJefesDeGrupo] Error conectando con Google Sheets:', error);
      console.warn('⚠️ [ApiService.getJefesDeGrupo] Tipo de error:', typeof error, error?.constructor?.name);
      if (error instanceof Error) {
        console.warn('⚠️ [ApiService.getJefesDeGrupo] Mensaje de error:', error.message);
        console.warn('⚠️ [ApiService.getJefesDeGrupo] Stack:', error.stack);
      }
      console.log('📱 [ApiService.getJefesDeGrupo] Cambiando a modo offline temporal');

      // Usar datos offline como fallback y marcar el flag
      console.log('📱 [ApiService.getJefesDeGrupo] Retornando', this.datosOffline.jefes.length, 'jefes offline');
      return Object.assign([], this.datosOffline.jefes, { isOffline: true });
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
      // La API devuelve un objeto con propiedad 'obras': {"obras": [["Javier","ObraID001J","Copia de Barajas pabellón","https://docs.google.com/..."], ...]}
      const data = await response.json();
      console.log('✅ Obras obtenidas de Google Sheets para', jefeNombre, '(raw):', data);
      
      // Extraer el array de obras del objeto respuesta
      const obrasRaw = data.obras;
      if (!Array.isArray(obrasRaw)) {
        console.warn('⚠️ API devolvió datos inválidos para obras');
        throw new Error('API devolvió datos inválidos');
      }
      
      // Procesar las obras - cada fila puede venir como objeto {idObra, nombreObra} o array [jefe, obraId, nombre, url]
      const obras = obrasRaw.map((row: any, index: number): Obra => {
        // Si es un objeto con idObra y nombreObra
        if (row && typeof row === 'object' && !Array.isArray(row) && row.idObra && row.nombreObra) {
          const url = row.idObra;
          let spreadsheetId = '';
          
          // Extraer spreadsheetId de la URL de Google Sheets
          if (url && typeof url === 'string' && url.includes('spreadsheets/d/')) {
            const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
            spreadsheetId = match ? match[1] : '';
          }
          
          console.log(`🔍 [ApiService.getObrasPorJefe] Procesando obra ${index} (formato objeto):`, {
            url,
            nombre: row.nombreObra,
            spreadsheetId
          });
          
          return {
            id: spreadsheetId || `obra-${index}`,
            nombre: row.nombreObra || `Obra ${index + 1}`,
            spreadsheetId: spreadsheetId,
            ubicacion: row.nombreObra || '',
            estado: 'Activo'
          };
        }
        
        // Si es un array [jefe, obraId, nombre, url] (formato anterior)
        if (Array.isArray(row) && row.length >= 4) {
          const [jefe, obraId, nombre, url] = row;
          
          // Extraer spreadsheetId de la URL de Google Sheets
          let spreadsheetId = '';
          if (url && typeof url === 'string' && url.includes('spreadsheets/d/')) {
            const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
            spreadsheetId = match ? match[1] : '';
          }
          
          console.log(`🔍 [ApiService.getObrasPorJefe] Procesando obra ${index} (formato array):`, {
            jefe,
            obraId,
            nombre,
            url,
            spreadsheetId
          });
          
          return {
            id: obraId || `obra-${index}`,
            nombre: nombre || `Obra ${index + 1}`,
            spreadsheetId: spreadsheetId,
            ubicacion: nombre || '',
            estado: 'Activo'
          };
        }
        
        // Formato incorrecto - fallback
        console.warn(`⚠️ Fila de obra ${index} tiene formato incorrecto:`, row);
        return {
          id: `obra-${index}`,
          nombre: `Obra ${index + 1}`,
          spreadsheetId: '',
          ubicacion: '',
          estado: 'Activo'
        };
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

  // Nueva función para actualizar la URL de foto en la columna S (19)
  // Función para actualizar URL de foto usando endpoint guardarChecks existente
  async updatePhotoUrl(
    obraIdOrName: string,
    instalacionNombre: string,
    itemId: string,
    photoUrl: string
  ): Promise<any> {
    console.log(`[ApiService.updatePhotoUrl] Called with obraIdOrName: ${obraIdOrName}, instalacion: ${instalacionNombre}, itemId: ${itemId}`);
    console.log(`[ApiService.updatePhotoUrl] Photo URL to update: ${photoUrl}`);

    // Extract the actual sheet name from the instalacionNombre if it's a composite ID
    let actualSheetName = instalacionNombre;
    if (instalacionNombre.includes('-') && instalacionNombre.length > 40) {
      const parts = instalacionNombre.split('-');
      if (parts.length >= 3) {
        actualSheetName = parts.slice(1, -1).join('-');
        console.log(`[ApiService.updatePhotoUrl] Extracted sheet name '${actualSheetName}' from composite ID '${instalacionNombre}'`);
      }
    }

    // Map to real spreadsheet ID
    const spreadsheetId = await this.mapToRealSpreadsheetId(obraIdOrName);
    console.log(`[ApiService.updatePhotoUrl] Mapped obraIdOrName '${obraIdOrName}' to spreadsheetId: ${spreadsheetId}`);

    // Extraer rowIndex del itemId - manejar diferentes formatos
    let rowIndex = null;
    
    // Caso 1: itemId es solo un número (ej: "11")
    if (/^\d+$/.test(itemId)) {
      rowIndex = parseInt(itemId);
      console.log(`[ApiService.updatePhotoUrl] ItemId is numeric, using as rowIndex: ${rowIndex}`);
    } 
    // Caso 2: itemId es completo (ej: "15UNDktnDzB_8lHkxx4QjKYRfABX4_M2wjCXx61Wh474-9-Aérea-ó-enterrada")
    else {
      const parts = itemId.split('-');
      rowIndex = parts.length > 1 ? parseInt(parts[parts.length - 2]) : null;
      console.log(`[ApiService.updatePhotoUrl] Extracting rowIndex from full itemId: ${rowIndex}`);
    }
    
    if (!rowIndex || isNaN(rowIndex)) {
      throw new Error(`No se pudo extraer rowIndex válido del itemId: ${itemId}`);
    }

    console.log(`[ApiService.updatePhotoUrl] Final rowIndex: ${rowIndex} from itemId: ${itemId}`);

    try {
      // Crear item especial para actualización de foto usando guardarChecks
      const photoUpdateItem = {
        id: itemId,
        rowIndex: rowIndex,
        photoUrl: photoUrl,
        // Flag especial para indicar que es actualización de foto únicamente
        isPhotoUpdate: true
      };

      console.log(`[ApiService.updatePhotoUrl] Sending photo update via guardarChecks:`, photoUpdateItem);
      console.log(`[ApiService.updatePhotoUrl] Request details:`, {
        spreadsheetId,
        pestana: actualSheetName,
        rowIndex,
        photoUrl: photoUrl.substring(0, 100) + '...'
      });

      const requestBody = {
        spreadsheetId,
        pestana: actualSheetName,
        items: [photoUpdateItem],
        usuario: 'Sistema_Foto',
        cargo: 'Automatico',
        // ✅ Parámetros requeridos por el backend para detectar actualización de foto
        isPhotoUpdate: true,
        updatePhotoOnly: true,
        photoUrl: photoUrl,     // ✅ AÑADIDO: PhotoUrl en nivel raíz
        itemId: rowIndex        // ✅ AÑADIDO: ItemId como rowIndex para el backend
      };

      console.log(`[ApiService.updatePhotoUrl] Full request body:`, {
        ...requestBody,
        photoUrl: photoUrl.substring(0, 100) + '...',
        items: requestBody.items.map(item => ({
          ...item,
          photoUrl: item.photoUrl?.substring(0, 100) + '...'
        }))
      });

      const response = await fetch(`${BASE_URL}/guardarChecks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[ApiService.updatePhotoUrl] API error: ${response.status} - ${errorBody}`);
        console.error(`[ApiService.updatePhotoUrl] Failed request details:`, {
          spreadsheetId,
          pestana: actualSheetName,
          rowIndex,
          itemId
        });
        
        // Si es un error de "entity not found", intentemos una estrategia alternativa
        if (errorBody.includes('Requested entity was not found')) {
          console.warn(`[ApiService.updatePhotoUrl] Entity not found, this might be expected for some items. Continuing...`);
          return { success: false, error: 'Entity not found', skipError: true };
        }
        
        throw new Error(`Error updating photo URL: ${response.statusText} - ${errorBody}`);
      }

      const result = await response.json();
      console.log('✅ [ApiService.updatePhotoUrl] Photo URL updated successfully via guardarChecks:', result);
      return result;

    } catch (error) {
      console.error('❌ [ApiService.updatePhotoUrl] Error updating photo URL via guardarChecks:', error);
      throw error;
    }
  }
}
export default new ApiService();

