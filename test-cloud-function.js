// Test directo de la Cloud Function para verificar el comportamiento
const testCloudFunction = async () => {
  const testData = {
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGkXjNM', // 1x1 pixel PNG
    fileName: 'test_item123_1691943456789.jpg',
    folder: 'checklist-photos/item123'
  };

  console.log('🧪 Test: Enviando a Cloud Function');
  console.log('📁 Folder enviado:', testData.folder);
  console.log('📄 FileName enviado:', testData.fileName);

  try {
    const response = await fetch('https://us-central1-checklistedhinor.cloudfunctions.net/uploadPhotoBase64', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      console.error('❌ Error en respuesta:', response.status, await response.text());
      return;
    }

    const result = await response.json();
    console.log('✅ Respuesta de Cloud Function:');
    console.log('🔗 URL devuelta:', result.url);
    
    // Analizar la URL
    console.log('\n🔍 Análisis de la URL:');
    console.log('¿Contiene folder enviado?:', result.url.includes('checklist-photos/item123'));
    console.log('¿Contiene "usuario"?:', result.url.includes('usuario'));
    console.log('¿Contiene "admin"?:', result.url.includes('admin'));
    
    // Extraer la ruta real
    const urlParts = result.url.split('/o/')[1]?.split('?')[0];
    if (urlParts) {
      const decodedPath = decodeURIComponent(urlParts);
      console.log('📁 Ruta real en Firebase Storage:', decodedPath);
    }

  } catch (error) {
    console.error('❌ Error en test:', error);
  }
};

// Solo ejecutar en browser para evitar problemas de Node.js
if (typeof window !== 'undefined') {
  testCloudFunction();
} else {
  console.log('ℹ️ Este test debe ejecutarse en el browser/React Native, no en Node.js');
}
