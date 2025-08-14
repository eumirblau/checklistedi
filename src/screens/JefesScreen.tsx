import React from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useCallback, useEffect, useState } from '../react-hooks';
import ApiService from '../services/ApiService';
import { JefeDeGrupo } from '../types';

type JefesScreenNavigationProp = any;
type JefesScreenRouteProp = any;

interface Props {
  navigation: JefesScreenNavigationProp;
  route: JefesScreenRouteProp;
}

const JefesScreen = ({ navigation, route }: Props) => {
  const { usuario } = route.params;
  const [jefes, setJefes] = useState<JefeDeGrupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadJefes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ApiService.getJefesDeGrupo();
      // Filtrar jefes con obras reales
      const jefesConObras: JefeDeGrupo[] = [];
      for (const jefe of data) {
        const obras = await ApiService.getObrasPorJefe(jefe.nombre);
        if (obras && obras.length > 0) {
          jefesConObras.push(jefe);
        }
      }
      setJefes(jefesConObras);
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudieron cargar los jefes de grupo. Verifique su conexión a internet.',
        [{ text: 'Reintentar', onPress: loadJefes }]
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJefes();
  }, [loadJefes]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJefes();
    setRefreshing(false);
  };

  const handleJefePress = (jefe: JefeDeGrupo) => {
    navigation.navigate('Obras', {
      jefeId: jefe.nombre,
      jefeNombre: jefe.nombre,
      usuario: usuario, // ✅ CORREGIDO: Mantener el usuario real del login, no el jefe
    });
  };

  const renderJefe = ({ item }: { item: JefeDeGrupo }) => {
    if (!item || !item.nombre || typeof item.nombre !== 'string') {
      console.log('⚠️ Invalid item in renderJefe:', item);
      return null;
    }

    const nombre = String(item.nombre || '').trim();
    const email = item.email ? String(item.email).trim() : '';
    
    if (!nombre) {
      console.log('⚠️ Empty nombre in renderJefe:', item);
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
        style={styles.jefeCard}
        onPress={() => handleJefePress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.jefeCardContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(nombre)}</Text>
            </View>
          </View>
          <View style={styles.jefeInfo}>
            <Text style={styles.jefeNombre}>{nombre}</Text>
            {email && (
              <Text style={styles.jefeEmail}>✉ {email}</Text>
            )}
          </View>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.gradientBackground]}>
        <StatusBar barStyle="light-content" backgroundColor="#4a6cf7" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Cargando jefes de grupo...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.gradientBackground]}>
      <StatusBar barStyle="light-content" backgroundColor="#4a6cf7" />
      
      <View style={styles.headerContainer}>
        <Text style={styles.welcomeText}>Hola, {usuario.nombre}</Text>
        <Text style={styles.title}>Jefes de Grupo</Text>
        <Text style={styles.subtitle}>Selecciona un responsable para continuar</Text>
      </View>

      <View style={styles.listWrapper}>
        <FlatList
          data={jefes || []}
          renderItem={renderJefe}
          keyExtractor={(item: JefeDeGrupo) => {
            const key = item?.id ? String(item.id) : `jefe-${Math.random()}`;
            return key;
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
              <Text style={styles.emptyText}>No hay jefes de grupo disponibles</Text>
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
  jefeCard: {
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
  jefeCardContent: {
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
  jefeInfo: {
    flex: 1,
  },
  jefeNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  jefeEmail: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
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

export default JefesScreen;
