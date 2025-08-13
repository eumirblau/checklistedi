import React from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    Text as RNText,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import ApiService from '../../services/ApiService';
import { Instalacion } from '../../types';
import { useCallback, useEffect, useState } from '../react-hooks';

// Componente Text seguro que previene el error "Text strings must be rendered within a <Text> component"
const Text = ({ children, style, ...props }: any) => {
  const safeContent = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(item => safeContent(item)).join('');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <RNText style={style} {...props}>
      {safeContent(children)}
    </RNText>
  );
};
type InstalacionesScreenNavigationProp = any;
type InstalacionesScreenRouteProp = any;
interface Props {
  navigation: InstalacionesScreenNavigationProp;
  route: InstalacionesScreenRouteProp;
}
const InstalacionesScreen = ({ navigation, route }: Props) => {
  const { obraId, obraNombre = '', jefeNombre, usuario } = route.params || {};

  const safeText = (text: any): string => {
    return typeof text === 'string' ? text : '';
  };

  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realSpreadsheetId, setRealSpreadsheetId] = useState<string | null>(null);  const handleGoBack = () => {
    // Volver a ObrasScreen con los parámetros correctos
    navigation.navigate('Obras', { 
      jefeId: jefeNombre,
      jefeNombre: jefeNombre,
      usuario: usuario 
    });
  };
  const loadInstalaciones = useCallback(async () => {
    try {
      setLoading(true);
      
      // Validar que tengamos un obraId válido
      if (!obraId) {
        console.error('❌ Error: obraId no definido. Usando obraNombre como fallback:', obraNombre);
        if (!obraNombre) {
          Alert.alert(
            'Error de Configuración',
            'No se pudo identificar la obra. Vuelva a la pantalla anterior e inténtelo de nuevo.'
          );
          setInstalaciones([]);
          setLoading(false);
          return;
        }
      }
      
      // Usar obraId o obraNombre como fallback
      const obraIdentifier = obraId || obraNombre;
      
      // 1. Resolver el realSpreadsheetId primero
      const resolvedSpreadsheetId = await ApiService.mapToRealSpreadsheetId(obraIdentifier);
      if (!resolvedSpreadsheetId) {
        console.error('❌ Error: No se pudo resolver el realSpreadsheetId para la obra:', obraIdentifier);
        Alert.alert(
          'Error de Configuración',
          'No se pudo encontrar el ID de la hoja de cálculo para esta obra. Contacte al administrador.'
        );        setInstalaciones([]); // Limpiar instalaciones si no hay ID
        setLoading(false);
        return;
      }      setRealSpreadsheetId(resolvedSpreadsheetId);
      
      // 2. Usar el resolvedSpreadsheetId para obtener las pestañas (instalaciones)
      const data = await ApiService.getPestanasDeObra(resolvedSpreadsheetId);
      setInstalaciones(data || []);
    } catch (error) {
      console.error('❌ Error cargando instalaciones:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar las instalaciones. Verifique su conexión a internet.',
        [{ text: 'Reintentar', onPress: loadInstalaciones }]      );
      setInstalaciones([]);
    } finally {
      setLoading(false);
    }
  }, [obraId, obraNombre, jefeNombre]);
  
  useEffect(() => {
    loadInstalaciones();
  }, [obraId, obraNombre, navigation, loadInstalaciones]);
  const onRefresh = async () => {
    setRefreshing(true);
    await loadInstalaciones();
    setRefreshing(false);
  };
  const handleInstalacionPress = async (instalacion: Instalacion) => {
    if (!realSpreadsheetId) {
      console.error('Error: realSpreadsheetId no está disponible al presionar instalación.');
      Alert.alert('Error', 'No se pudo determinar la hoja de cálculo para esta obra.');
      return;
    }
    navigation.navigate('Checklist', {
      instalacionId: instalacion.id,
      instalacionNombre: instalacion.nombre,
      spreadsheetId: realSpreadsheetId,
      usuario: usuario,
      obraNombre: obraNombre,
      jefeNombre: jefeNombre,
      obraId: obraId,
    });
  };
  const renderInstalacion = ({ item }: { item: Instalacion }) => {
    if (!item) {
      return null;
    }

    // Validación exhaustiva de datos
    const safeItem = {
      id: item?.id || `instalacion-${Math.random()}`,
      nombre: item?.nombre || 'Sin nombre',
      tipo: item?.tipo || '',
      estado: item?.estado || ''
    };

    const nombre = String(safeItem.nombre).trim() || 'Sin nombre';
    const tipo = String(safeItem.tipo).trim();
    const estado = String(safeItem.estado).trim();

    const getInitials = (name: string): string => {
      try {
        return name
          .split(' ')
          .map(word => word.charAt(0))
          .join('')
          .substring(0, 2)
          .toUpperCase() || 'SN';
      } catch {
        return 'SN';
      }
    };

    return (
      <TouchableOpacity
        style={styles.instalacionCard}
        onPress={() => handleInstalacionPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.instalacionCardContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(nombre)}</Text>
            </View>
          </View>
          <View style={styles.instalacionInfo}>
            <Text style={styles.instalacionNombre}>{nombre}</Text>
            {tipo && (
              <Text style={styles.instalacionTipo}>🔧 {tipo}</Text>
            )}
            {estado && (
              <View style={[styles.estadoBadge, getEstadoStyle(estado)]}>
                <Text style={styles.estadoText}>{estado}</Text>
              </View>
            )}
          </View>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };const getEstadoStyle = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'completo':
      case 'completado':
        return styles.estadoCompleto;
      case 'pendiente':
      case 'en proceso':
        return styles.estadoPendiente;
      case 'revision':
      case 'revisión':
        return styles.estadoRevision;
      default:
        return styles.estadoDefault;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.gradientBackground]}>
        <StatusBar barStyle="light-content" backgroundColor="#4a6cf7" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Cargando instalaciones...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.gradientBackground]}>
      <StatusBar barStyle="light-content" backgroundColor="#4a6cf7" />
      
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.welcomeText}>Obra: {safeText(obraNombre)}</Text>
        <Text style={styles.title}>⚡ Instalaciones</Text>
        <Text style={styles.subtitle}>Selecciona una instalación para continuar</Text>
      </View>

      <View style={styles.listWrapper}>
        <FlatList
          data={instalaciones || []}
          renderItem={renderInstalacion}
          keyExtractor={(item: Instalacion, index: number) => {
            const safeId = item?.id || item?.nombre || `instalacion-${index}`;
            return String(safeId);
          }}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#fff"
              titleColor="#fff"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay instalaciones disponibles</Text>
              <Text style={styles.emptySubtext}>Desliza hacia abajo para refrescar</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    backgroundColor: '#4a6cf7',
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
    paddingBottom: 20,
  },
  instalacionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#4a6cf7',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 108, 247, 0.1)',
  },
  instalacionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4a6cf7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4a6cf7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instalacionInfo: {
    flex: 1,
  },
  instalacionNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 6,
  },
  instalacionTipo: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
    marginBottom: 8,
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  estadoCompleto: {
    backgroundColor: '#48bb78',
  },
  estadoPendiente: {
    backgroundColor: '#ed8936',
  },
  estadoRevision: {
    backgroundColor: '#4a6cf7',
  },
  estadoDefault: {
    backgroundColor: '#a0aec0',
  },
  arrowContainer: {
    marginLeft: 10,
  },
  arrow: {
    fontSize: 18,
    color: '#4a6cf7',
    fontWeight: 'bold',
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
export default InstalacionesScreen;
