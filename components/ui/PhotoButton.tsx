import React, { useState } from 'react';
import { Button, FlatList, Image, Modal, Text, View } from 'react-native';

interface PhotoButtonProps {
  photos: { id: string; fileName: string; url: string }[];
}

const PhotoButton: React.FC<PhotoButtonProps> = ({ photos }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleViewPhotos = () => {
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Button title="Ver Fotos" onPress={handleViewPhotos} />
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: '#fff', padding: 20 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Fotos locales</Text>
          <FlatList
            data={photos}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={{ marginBottom: 16 }}>
                <Text>{item.fileName}</Text>
                <Image source={{ uri: item.url }} style={{ width: 200, height: 200, borderRadius: 8 }} />
              </View>
            )}
          />
          <Button title="Cerrar" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
    </View>
  );
};

const styles = {
  container: {
    // ...existing styles...
  },
};

export default PhotoButton;