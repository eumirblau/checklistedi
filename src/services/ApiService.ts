export interface ChecklistItem {
  id: string;
  unidad: string;
  descripcion: string;
  observaciones: string;
  completado: boolean;
  fechapp?: string;
  rowIndex?: number;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    // URL base de la API de Google Cloud Functions (nuestra API actual que funciona)
    this.baseUrl = 'https://us-central1-checklistedhinor.cloudfunctions.net';
  }

  /**
   * Obtiene los items del checklist para una instalación específica
   * Basado en la implementación del APK original pero adaptado para nuestra API actual
   */
  async getItemsDeChecklist(obraIdOrName: string, instalacionNombre: string): Promise<ChecklistItem[]> {
    try {
      console.log(`[ApiService.getItemsDeChecklist] Called with obraIdOrName: ${obraIdOrName}, instalacion: ${instalacionNombre}`);
      
      // Usar directamente el nombre de la instalación
      const actualSheetName = instalacionNombre;
      console.log(`[ApiService.getItemsDeChecklist] Using sheet name: ${actualSheetName}`);
      
      // URL del endpoint con nuestros parámetros actuales
      const url = `${this.baseUrl}/getItemsDeChecklist?spreadsheetId=${encodeURIComponent(obraIdOrName)}&pestana=${encodeURIComponent(actualSheetName)}`;
      console.log(`[ApiService.getItemsDeChecklist] Calling URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`[ApiService.getItemsDeChecklist] API error for ${obraIdOrName}/${actualSheetName}: ${response.status}`);
        throw new Error(`Error fetching items: ${response.status} - ${response.statusText}`);
      }

      const rawData = await response.json();
      console.log('✅ Datos raw de API recibidos:', rawData);
      
      // Verificar si la respuesta es un array directamente o tiene una propiedad
      let itemsArray;
      if (Array.isArray(rawData)) {
        itemsArray = rawData;
      } else if (rawData.items && Array.isArray(rawData.items)) {
        itemsArray = rawData.items;
      } else {
        console.error('[ApiService.getItemsDeChecklist] Respuesta de API no tiene formato esperado:', rawData);
        throw new Error('Formato de respuesta inválido de la API');
      }

      console.log(`[ApiService.getItemsDeChecklist] Items array length: ${itemsArray.length}`);

      const mappedItems = itemsArray.map((item: any, index: number) => {
        // Log detallado del item raw antes del mapeo
        console.log(`🔍 [ApiService.getItemsDeChecklist] Item RAW ${index}:`, {
          id: item.id,
          unidad: item.unidad,
          descripcion: item.descripcion,
          observaciones: item.observaciones,
          completado: item.completado,
          s_contrato: item.s_contrato,
          fechapp: item.fechapp,
          fechaCompletado: item.fechaCompletado,
          // Mostrar todas las propiedades para ver qué más hay
          allProps: Object.keys(item)
        });
        
        const mapped = {
          id: item.id || `item_${index}`,
          unidad: String(item.unidad || ''),
          descripcion: String(item.descripcion || ''),
          observaciones: String(item.observaciones || ''),
          completado: item.completado === true || item.completado === 'true' || item.completado === '√' || item.s_contrato === '√',
          fechapp: item.fechapp || item.fechaCompletado || undefined,
          rowIndex: item.rowIndex || index
        };
        
        // Log del item después del mapeo
        console.log(`✅ [ApiService.getItemsDeChecklist] Item MAPEADO ${index}:`, mapped);
        
        return mapped;
      });

      console.log(`[ApiService.getItemsDeChecklist] Mapped ${mappedItems.length} items`);

      const items = mappedItems.filter((item: any) => {
        // Filtro básico: items que tengan contenido (como en el APK original)
        const hasContent = Boolean(item.unidad || item.descripcion);
        if (!hasContent) {
          console.log('[ApiService.getItemsDeChecklist] Filtrando item vacío:', item);
          return false;
        }
        return true;
      });

      console.log(`✅ [ApiService.getItemsDeChecklist] Returning ${items.length} filtered items`);
      return items;
    } catch (error) {
      console.error(`❌ [ApiService.getItemsDeChecklist] Error fetching checklist for ${obraIdOrName}/${instalacionNombre}:`, error);
      throw error;
    }
  }

  /**
   * Guarda los checks y observaciones en el backend
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
      console.log(`[ApiService.guardarChecks] Items to save count: ${itemsToSave.length}`);
      
      // Log detallado de cada item que se va a guardar
      itemsToSave.forEach((item, index) => {
        console.log(`[ApiService.guardarChecks] Item ${index + 1}:`, {
          id: item.id,
          unidad: item.unidad,
          descripcion: item.descripcion?.substring(0, 50) + '...',
          observaciones: item.observaciones ? 'SÍ (' + item.observaciones.length + ' chars)' : 'NO',
          completado: item.completado,
          fechapp: item.fechapp,
          rowIndex: item.rowIndex
        });
      });
      
      const url = `${this.baseUrl}/guardarChecks`;
      const payload = {
        obraIdOrName,
        instalacionNombre,
        items: itemsToSave,
        usuario,
        cargo,
        obraNombreOriginal: _obraNombreOriginal
      };
      
      console.log('[ApiService.guardarChecks] Payload structure:', {
        obraIdOrName,
        instalacionNombre,
        itemsCount: itemsToSave.length,
        usuario,
        cargo,
        obraNombreOriginal: _obraNombreOriginal
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log(`[ApiService.guardarChecks] Response status: ${response.status}`);
      console.log(`[ApiService.guardarChecks] Response ok: ${response.ok}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ApiService.guardarChecks] Error response: ${errorText}`);
        throw new Error(`Error guardando checklist: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ [ApiService.guardarChecks] Respuesta completa del servidor:', result);
      
      // Verificar si el servidor indica éxito
      if (result.success !== undefined && !result.success) {
        console.error('❌ [ApiService.guardarChecks] El servidor reportó error:', result.error || result.message);
        throw new Error(`Error del servidor: ${result.error || result.message || 'Error desconocido'}`);
      }
      
    } catch (error) {
      console.error(`❌ [ApiService.guardarChecks] Error guardando checklist:`, error);
      throw error;
    }
  }

  async getObras(spreadsheetId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/obras`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spreadsheetId })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('❌ Error obteniendo obras:', error);
      throw error;
    }
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

const apiService = new ApiService();
export default apiService;
