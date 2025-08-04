interface ChecklistItem {
  id: string;
  unidad: string;
  descripcion: string;
  observaciones: string;
  completado: boolean;
  fechaCompletado?: string;
  rowIndex?: number; // Índice de fila en Google Sheets
}

class ApiService {
  private baseUrl: string;

  constructor() {
    // URL base de la API de Google Cloud Functions
    this.baseUrl = 'https://us-central1-checklistedhinor.cloudfunctions.net';
  }

  /**
   * Obtiene los items del checklist para una instalación específica
   * Basado en la implementación del APK original
   */
  async getItemsDeChecklist(obraIdOrName: string, instalacionNombre: string): Promise<ChecklistItem[]> {
    try {
      console.log(`[ApiService.getItemsDeChecklist] Called with obraIdOrName: ${obraIdOrName}, instalacion: ${instalacionNombre}`);
      
      // Determinar nombre real de la pestaña
      let actualSheetName = instalacionNombre;
      if (instalacionNombre.includes('|')) {
        actualSheetName = instalacionNombre.split('|')[0].trim();
        console.log(`[ApiService.getItemsDeChecklist] Extracted sheet name '${actualSheetName}' from composite ID '${instalacionNombre}'`);
      }
      
      // URL del endpoint correcta
      const response = await fetch(`${this.baseUrl}/getItemsDeChecklist?spreadsheetId=${obraIdOrName}&pestana=${encodeURIComponent(actualSheetName)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`[ApiService.getItemsDeChecklist] API error for ${obraIdOrName}/${actualSheetName}: ${response.status}`);
        throw new Error(`Error HTTP: ${response.status}`);
      }

      // La API devuelve un objeto con propiedad items
      const responseData = await response.json();
      console.log('✅ Datos raw de API recibidos:', JSON.stringify(responseData, null, 2));
      
      // Extraer el array de items del objeto respuesta
      const itemsData = responseData.items;
      if (!Array.isArray(itemsData)) {
        console.warn('⚠️ API devolvió datos inválidos para items');
        return [];
      }
      
      // Los datos vienen como array de arrays
      console.log(`📊 [ApiService.getItemsDeChecklist] Procesando ${itemsData.length} filas de datos`);
      
      const items = itemsData
        .map((row: any[], index: number) => {
          // Verificar que sea un array válido
          if (!Array.isArray(row)) {
            console.log(`⚠️ [ApiService.getItemsDeChecklist] Fila ${index} no es array:`, row);
            return null;
          }
          
          // Mapear las columnas según la estructura de Google Sheets
          // 🔧 ACTUALIZADO: Columna P (row[15]) = Observaciones según reporte del usuario
          const unidad = row[1] ? String(row[1]).trim() : '';
          const descripcion = row[5] ? String(row[5]).trim() : '';
          const s_contrato = row[12] ? String(row[12]).trim() : '';
          const fechapp = row[14] ? String(row[14]).trim() : ''; // Columna O para fechapp
          const observaciones = row[15] ? String(row[15]).trim() : ''; // 🔧 FIX: Columna P = row[15]
          
          // 🔍 DEBUG: Verificar observaciones
          console.log(`🔍 [DEBUG] Fila ${index} - observaciones: "${observaciones}"`);
          
          // Determinar si está completado
          const isCompleted = s_contrato === '√' || s_contrato === 'true';
          
          // Crear ID único
          const itemId = `${obraIdOrName}-${index}-${(unidad || descripcion || 'item').replace(/\s+/g, '-')}`;
          
          return {
            id: itemId,
            descripcion: descripcion,
            completado: isCompleted,
            observaciones: observaciones || '',
            unidad: unidad || '',
            fechaCompletado: isCompleted ? (fechapp || new Date().toISOString()) : undefined,
            rowIndex: index + 1, // 🔧 CRÍTICO: Índice real de la fila en Google Sheets
          };
        })
        .filter((item): item is NonNullable<typeof item> => {
          // Filtrar items nulos y que tengan contenido
          if (!item) return false;
          const hasContent = Boolean(item.unidad || item.descripcion);
          return hasContent;
        });
      
      return items;
    } catch (error) {
      console.error('❌ Error en getItemsDeChecklist:', error);
      throw error;
    }
  }

  /**
   * Guarda el checklist completo con todos los items y sus estados
   * Implementación exacta basada en guardarChecks del APK original
   */
  async guardarChecks(
    obraIdOrName: string,
    instalacionNombre: string,
    itemsToSave: ChecklistItem[],
    usuario: string,
    cargo: string,
    _obraNombreOriginal: string
  ): Promise<void> {
    try {
      console.log(`[ApiService.guardarChecks] Called with obraIdOrName: ${obraIdOrName}, instalacion: ${instalacionNombre}`);
      
      // Determinar nombre real de la pestaña
      let actualSheetName = instalacionNombre;
      if (instalacionNombre.includes('|')) {
        actualSheetName = instalacionNombre.split('|')[0].trim();
        console.log(`[ApiService.guardarChecks] Extracted sheet name '${actualSheetName}' from composite ID '${instalacionNombre}'`);
      }

      // Filtrar items que han sido modificados o tienen observaciones
      const itemsWithChanges = itemsToSave.filter(item => {
        const hasValidRowIndex = typeof item.rowIndex === 'number' && item.rowIndex > 0;
        const isMarked = item.completado === true;
        const hasObservations = item.observaciones && item.observaciones.trim() !== '';
        return hasValidRowIndex && (isMarked || hasObservations);
      });

      console.log(`📋 Filtrando items: ${itemsToSave.length} total -> ${itemsWithChanges.length} con cambios válidos`);

      // Transformar al formato backend usando rowIndex REAL
      const currentDate = new Date().toLocaleDateString('es-ES');
      
      const backendItems = itemsWithChanges.map((item) => {
        console.log(`📝 Procesando item para guardar:`, {
          id: item.id,
          descripcion: item.descripcion,
          completado: item.completado,
          observaciones: item.observaciones,
          rowIndex: item.rowIndex
        });

        return {
          rowIndex: item.rowIndex, // 🔧 CRÍTICO: Usar rowIndex real de Google Sheets
          descripcion: item.descripcion || '',
          unidad: item.unidad || '',
          completado: item.completado || false,
          observaciones: item.observaciones || '',
          fechaCompletado: item.completado ? currentDate : '',
          s_contrato: item.completado ? '√' : '',
          fechapp: item.completado ? currentDate : ''
        };
      });

      console.log(`📤 Enviando ${backendItems.length} items al backend:`, backendItems);

      const response = await fetch(`${this.baseUrl}/guardarChecks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spreadsheetId: obraIdOrName,
          pestana: actualSheetName,
          items: backendItems,
          usuario: usuario,
          cargo: cargo,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[ApiService.guardarChecks] API error: ${response.status} - ${errorBody}`);
        throw new Error(`Error guardando checklist: ${response.status} - ${errorBody}`);
      }

      const responseData = await response.json();
      console.log('✅ Checklist guardado exitosamente:', responseData);
      
    } catch (error) {
      console.error('❌ Error en guardarChecks:', error);
      throw error;
    }
  }

  /**
   * Obtiene las instalaciones de una obra específica
   * Basado en la implementación del APK original
   */
  async getInstalaciones(spreadsheetId: string, obraNombre: string): Promise<any[]> {
    try {
      console.log('🔄 Obteniendo instalaciones para obra:', obraNombre);
      
      const response = await fetch(`${this.baseUrl}/instalaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spreadsheetId,
          obraNombre
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Instalaciones recibidas:', data);
      
      return data || [];
    } catch (error) {
      console.error('❌ Error obteniendo instalaciones:', error);
      throw error;
    }
  }

  /**
   * Obtiene las obras disponibles
   * Basado en la implementación del APK original
   */
  async getObras(spreadsheetId: string): Promise<any[]> {
    try {
      console.log('🔄 Obteniendo obras...');
      
      const response = await fetch(`${this.baseUrl}/obras`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spreadsheetId
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Obras recibidas:', data);
      
      return data || [];
    } catch (error) {
      console.error('❌ Error obteniendo obras:', error);
      throw error;
    }
  }

  /**
   * Configurar la URL base del API
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
    console.log('🔧 URL base configurada:', url);
  }

  /**
   * Obtener la URL base actual
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Instancia única del servicio (singleton)
const apiService = new ApiService();

export default apiService;
