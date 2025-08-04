// Script de prueba para leer Google Sheets con la cuenta de servicio
const { google } = require('googleapis');
const path = require('path');

// Ruta al archivo de clave JSON de la cuenta de servicio
const KEY_FILE_PATH = path.join(__dirname, '../_secrets/service-account.json'); // Ajusta el nombre si es necesario

// ID de la hoja de Google Sheets a consultar
const SPREADSHEET_ID = '1UUU7rq-mjx4GxoE_tR7F8tGSyue0EyC0WimZ70UfitQ'; // ID real proporcionado

async function main() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: KEY_FILE_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A1:Z10', // Ajusta el rango si lo necesitas
    });
    console.log('Datos recibidos:', res.data.values);
  } catch (error) {
    console.error('Error accediendo a Google Sheets:', error);
  }
}

main();
