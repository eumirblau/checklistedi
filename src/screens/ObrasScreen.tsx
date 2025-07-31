import ApiService from ' ../../services/ApiService';
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
import { Obra } from '../../types';
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
type ObrasScreenNavigationProp = any;
type ObrasScreenRouteProp = any;
interface Props {
  navigation: ObrasScreenNavigationProp;
  route: ObrasScreenRouteProp;
}
const ObrasScreen = ({ navigation, route }: Props) => {
  const { jefeId, jefeNombre = '', usuario } = route.params || {};
  
  const safeText = (text: any): string => {
    return typeof text === 'string' ? text : '';
  };
  
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const handleGoBack = () => {
    // Volver directamente a JefeDeGrupo
    navigation.navigate('Jefes', { usuario });
  };

  const loadObras = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 ObrasScreen: Iniciando carga de obras para jefe:', jefeId);
      const data = await ApiService.getObrasPorJefe(jefeId);
      console.log('✅ ObrasScreen: Obras recibidas:', data);
      setObras(data);
    } catch (error) {
      console.error('❌ ObrasScreen: Error cargando obras:', error);      Alert.alert(
        'Error de Conexión',
        'No se pudieron cargar las obras. Verifique su conexión a internet y vuelva a intentar.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Reintentar', onPress: loadObras },
        ]
      );
    } finally {
      setLoading(false);
    }  }, [jefeId]);

  useEffect(() => {
    loadObras();
  }, [jefeId, jefeNombre, navigation, loadObras]);
  const onRefresh = async () => {
    setRefreshing(true);
    await loadObras();
    setRefreshing(false);
  };

  const handleObraPress = (obra: Obra) => {
    console.log('🔍 DEBUG ObrasScreen - Obra seleccionada:', {
      id: obra.id,
      nombre: obra.nombre,
      spreadsheetId: obra.spreadsheetId,
      obraIdToPass: obra.id, // Use technical ID for API calls
    });
    navigation.navigate('Instalaciones', {
      obraId: obra.id, // Pass technical ID (e.g., ObraID001M) for API calls
      obraNombre: obra.nombre,
      jefeNombre: jefeNombre,
      usuario: usuario,
    });
  };  const renderObra = ({ item }: { item: Obra }) => {
    if (!item || !item.nombre) {
      return null;
    }

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
    };

    return (
      <TouchableOpacity
        style={styles.obraCard}
        onPress={() => handleObraPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.obraCardContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(String(item.nombre || ''))}</Text>
            </View>
          </View>
          <View style={styles.obraInfo}>
            <Text style={styles.obraNombre}>{String(item.nombre || '')}</Text>
            {item.ubicacion && (
              <Text style={styles.obraUbicacion}>📍 {String(item.ubicacion)}</Text>
            )}
            {item.estado && (
              <View style={[styles.estadoBadge, getEstadoStyle(String(item.estado))]}>
                <Text style={styles.estadoText}>{String(item.estado)}</Text>
              </View>
            )}
          </View>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };  const getEstadoStyle = (estado: string) => {
    if (estado.includes('%')) {
      const percentage = parseInt(estado.match(/(\d+)%/)?.[1] || '0', 10);
      if (percentage >= 80) {
        return styles.estadoCompletado;
      }
      if (percentage >= 50) {
        return styles.estadoEnProgreso;
      }
      if (percentage >= 20) {
        return styles.estadoActivo;
      }
      return styles.estadoInicio;
    }

    switch (estado.toLowerCase()) {
      case 'activo':
      case 'en progreso':
        return styles.estadoActivo;
      case 'completado':
      case 'finalizado':
        return styles.estadoCompletado;
      case 'pausado':
      case 'suspendido':
        return styles.estadoPausado;
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
          <Text style={styles.loadingText}>Cargando obras...</Text>
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
        <Text style={styles.welcomeText}>Jefe: {safeText(jefeNombre)}</Text>
        <Text style={styles.title}>🏗️ Obras Asignadas</Text>
        <Text style={styles.subtitle}>Selecciona una obra para continuar</Text>
      </View>

      <View style={styles.listWrapper}>
        <FlatList
          data={obras || []}
          renderItem={renderObra}
          keyExtractor={(item: Obra) => item.id.toString()}
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
              <Text style={styles.emptyText}>No hay obras asignadas</Text>
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
  obraCard: {
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
  obraCardContent: {
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
  obraInfo: {
    flex: 1,
  },
  obraNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 6,
  },
  obraUbicacion: {
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
  estadoActivo: {
    backgroundColor: '#48bb78',
  },
  estadoEnProgreso: {
    backgroundColor: '#ed8936',
  },
  estadoInicio: {
    backgroundColor: '#f56565',
  },
  estadoCompletado: {
    backgroundColor: '#4a6cf7',
  },
  estadoPausado: {
    backgroundColor: '#ed8936',
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
export default ObrasScreen;
