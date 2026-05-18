import { getSheetsClient, SPREADSHEET_ID } from '../lib/sheets.js';

async function run() {
  const sheets = getSheetsClient();
  const headersRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'INVENTARIO!A1:Z1'
  });
  console.log("HEADERS ACTUALES EN SHEETS:");
  console.log(headersRes.data.values[0]);
}
run();
