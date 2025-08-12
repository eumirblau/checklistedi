import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Text as RNText,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
// ...existing code...
// ...ya importados arriba, eliminar duplicado
import ApiService from '../../services/ApiService';
import { ChecklistItem } from '../../types';

// Componente Text seguro que previene el error "Text strings must be rendered within a <Text> component"
const Text = ({ children, style, ...props }: any) => {
  const safeContent = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(item => safeContent(item)).join('');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }; // <--- aquí debe ir la llave

  return (
    <RNText style={style} {...props}>
      {safeContent(children)}
    </RNText>
  );
};

type ChecklistScreenNavigationProp = any;
type ChecklistScreenRouteProp = any;

interface Props {
  navigation: ChecklistScreenNavigationProp;
  route: ChecklistScreenRouteProp;
}

const ChecklistScreen = ({ navigation, route }: Props) => {
  const { instalacionId, instalacionNombre, spreadsheetId, usuario, obraNombre, obraId, jefeNombre } = route.params;

  const [grupos, setGrupos] = useState<{ encabezado: string, itemCount: number }[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]); // ✅ AGREGADO: Estado para items
  const [loading, setLoading] = useState(true);

  const handleGoBack = () => {
    navigation.navigate('Instalaciones', {
      obraId,
      obraNombre,
      jefeNombre,
      usuario,
      spreadsheetId,
    });
  };

  // ✅ APK ORIGINAL: Función SIMPLIFICADA - Solo cargar datos para obtener grupos/encabezados
  const loadGrupos = async () => {
    try {
      setLoading(true);
      console.log('🔄 [APK ORIGINAL] ChecklistScreen cargando datos desde Google Sheets...');
      
      // Obtener datos solo para extraer los grupos
      const data = await ApiService.getItemsDeChecklist(spreadsheetId, instalacionNombre);
      
      console.log('📊 DATOS RECIBIDOS para grupos:', data?.length || 0, 'items');
      
      // Filtrar "no check" y procesar grupos
      const validatedData = (data || []).filter(item => {
        // Filtramos items vacíos
        if (!item.unidad && !item.descripcion) return false;
        
        // Filtramos items que contienen "no check" en la descripción
        if (item.descripcion && item.descripcion.toLowerCase().includes('no check')) return false;

        return true;
      });

      // Guardar items validados para cálculos de progreso
      setItems(validatedData);

      // Agrupar por encabezados para mostrar solo la lista de grupos
      const gruposDetectados = agruparPorEncabezados(validatedData);
      const gruposConConteo = gruposDetectados.map(grupo => ({
        encabezado: grupo.encabezado,
        itemCount: grupo.items.length
      }));
      
      console.log('✅ GRUPOS DETECTADOS:', gruposConConteo);
      setGrupos(gruposConConteo);
    } catch (error) {
      Alert.alert(
        'Error',
        `No se pudieron cargar los grupos: ${error instanceof Error ? error.message : String(error)}`,
        [{ text: 'Reintentar', onPress: loadGrupos }]
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ APK ORIGINAL: Solo cargar datos la primera vez, NO refrescar automáticamente
  useEffect(() => {
    console.log('🔄 ChecklistScreen montado - cargando datos SOLO la primera vez...');
    loadGrupos();
  }, []); // Sin dependencias - solo se ejecuta una vez al montar

  // ✅ APK ORIGINAL: Listener para actualizar progreso cuando volvemos de GrupoChecklistScreen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 ChecklistScreen focused - recalculando progreso...');
      // Solo recalcular progreso si ya tenemos datos, NO recargar desde API
      if (items.length > 0) {
        const gruposActualizados = agruparPorEncabezados(items);
        const gruposConConteo = gruposActualizados.map(grupo => ({
          encabezado: grupo.encabezado,
          itemCount: grupo.items.length
        }));
        setGrupos(gruposConConteo);
        console.log('✅ Progreso recalculado sin recargar datos');
      }
    });

    return unsubscribe;
  }, [navigation, items]);

  // Agrupación de items por encabezados detectados
  function agruparPorEncabezados(items: ChecklistItem[]) {
    // Detectar dinámicamente los encabezados presentes en los datos
    const grupos: { encabezado: string, items: ChecklistItem[] }[] = [];
    let grupoActual: { encabezado: string, items: ChecklistItem[] } | null = null;
    let ultimoEncabezado = '';
    for (const item of items) {
      const unidad = item.unidad?.trim() || '';
      const descripcion = item.descripcion?.trim().toUpperCase() || '';
      // Si la unidad es un encabezado (mayúsculas y sin números) o la descripción es especial
      if (
        unidad && unidad === unidad.toUpperCase() && !/\d/.test(unidad) && unidad.length > 2 && unidad !== ultimoEncabezado
        || ["EXISTENTE NO SE MODIFICA","NO ES MOTIVO DE LA OBRA","NO SE HA INICIADO","OBSERVACIONES/ANOTACIONES","FIRMAS"].includes(descripcion)
      ) {
        grupoActual = { encabezado: unidad || descripcion, items: [] };
        grupos.push(grupoActual);
        ultimoEncabezado = unidad || descripcion;
      } else if (grupoActual) {
        grupoActual.items.push(item);
      }
    }
    // Solo devolver grupos con al menos un item
    return grupos.filter(g => g.items.length > 0);
  }

  const gruposChecklist = agruparPorEncabezados(items);
  const completedCount = items.filter(item => item.completado).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  if (loading) {
    return (
      <View style={[styles.container, styles.gradientBackground]}>
        <StatusBar barStyle="light-content" backgroundColor="#4a6cf7" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Cargando checklist...</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.container, styles.gradientBackground]}>
      {/* Aquí NO debe haber galería de fotos, solo navegación a GrupoChecklistScreen */}
      <StatusBar barStyle="light-content" backgroundColor="#4a6cf7" />
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.welcomeText}>Instalación: {instalacionNombre}</Text>
        <Text style={styles.title}>📋 Checklist</Text>
        <Text style={styles.subtitle}>
          {`${String(completedCount)} de ${String(totalCount)} completados (${String(Math.round(progress))}%)`}
        </Text>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.round(progress)}%` }]} />
          </View>
        </View>
      </View>
      <View style={styles.listWrapper}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContainer}>
          {/* Grupos - siempre navegar a GrupoChecklistScreen */}
          {gruposChecklist.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay items en este checklist</Text>
              <Text style={styles.emptySubtext}>Desliza hacia abajo para refrescar</Text>
            </View>
          ) : (
            gruposChecklist.map((grupo, idx) => (
              <TouchableOpacity
                key={idx}
                style={{ marginBottom: 12, backgroundColor: '#e2e8f0', borderRadius: 12, padding: 16 }}
                onPress={() => {
                  const params = {
                    grupo: grupo.encabezado,
                    items: grupo.items,
                    // Parámetros necesarios para el guardado
                    spreadsheetId,
                    instalacionNombre,
                    usuario,
                    obraNombre,
                  };
                  console.log('NAVEGANDO A GrupoChecklistScreen CON:', params);
                  navigation.navigate('GrupoChecklistScreen', params);
                }}
              >
                <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#4a6cf7' }}>{grupo.encabezado}</Text>
                <Text style={{ color: '#718096', fontSize: 14 }}>{grupo.items.length} ítems</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  gradientBackground: {
    backgroundColor: '#667eea',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    marginBottom: 15,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '400',
    marginBottom: 15,
  },
  progressBarContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  listWrapper: {
    flex: 1,
    backgroundColor: '#f8f9ff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
    marginTop: -10,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#4a5568',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    fontWeight: '400',
  },
});

export default ChecklistScreen;

