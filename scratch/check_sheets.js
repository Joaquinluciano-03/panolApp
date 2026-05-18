import { getSheetsClient, SPREADSHEET_ID } from '../lib/sheets.js';

async function run() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const titles = res.data.sheets.map(s => s.properties.title);
  console.log("SHEETS EXISTENTES:", titles);
}
run();
