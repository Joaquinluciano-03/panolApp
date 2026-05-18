import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function fixHeader() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;
  key = key.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  if (!key.includes('\n')) {
    const beginStr = '-----BEGIN PRIVATE KEY-----';
    const endStr = '-----END PRIVATE KEY-----';
    if (key.includes(beginStr) && key.includes(endStr)) {
      const body = key.replace(beginStr, '').replace(endStr, '').replace(/\s+/g, '');
      const chunks = body.match(/.{1,64}/g);
      key = `${beginStr}\n${chunks.join('\n')}\n${endStr}\n`;
    }
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: SCOPES,
  });

  const sheets = google.sheets({ version: 'v4', auth });
  
  const HEADERS = ['ID', 'NOMBRE', 'CATEGORIA', 'STOCK_TOTAL', 'STOCK_EN_USO', 'UNIDAD_MEDIDA', 'DESCRIPCION', 'STOCK_MINIMO', 'ACTIVO', 'MODIFICADO_POR'];

  console.log("Updating headers...");
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    range: `INVENTARIO!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [HEADERS] },
  });
  console.log("Headers updated successfully!");
}

fixHeader().catch(console.error);
