const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Cloud Function para listar fotos en una carpeta de Firebase Storage
exports.listphotosinfolder = functions.https.onRequest(async (req, res) => {
  try {
    const { folder } = req.body;
    if (!folder) return res.status(400).json({ error: 'Falta folder' });

    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ prefix: folder + '/' });
    const photos = await Promise.all(files.map(async file => {
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2100'
      });
      return {
        fileName: file.name.split('/').pop(),
        url,
        uploadedAt: file.metadata.timeCreated
      };
    }));

    res.json({ photos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});