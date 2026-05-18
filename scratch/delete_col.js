import { getSheetsClient, SPREADSHEET_ID, SHEETS } from '../lib/sheets.js';

async function run() {
  try {
    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheet = res.data.sheets.find((s) => s.properties.title === SHEETS.INVENTARIO);
    if (!sheet) return;

    const headersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'INVENTARIO!A1:Z1'
    });
    const headers = headersRes.data.values[0];
    const colIndex = headers.indexOf('STOCK_DISPONIBLE');
    if (colIndex === -1) {
      console.log('La columna STOCK_DISPONIBLE ya no existe.');
      return;
    }

    const sheetId = sheet.properties.sheetId;

    const requests = [{
      deleteDimension: {
        range: {
          sheetId: sheetId,
          dimension: 'COLUMNS',
          startIndex: colIndex,
          endIndex: colIndex + 1
        }
      }
    }];

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests }
    });
    console.log(`Columna STOCK_DISPONIBLE eliminada en el indice ${colIndex}.`);
  } catch (err) {
    console.error(err);
  }
}

run();
