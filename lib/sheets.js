// lib/sheets.js
// Google Sheets API v4 client — usa Service Account
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let _auth = null;
let _sheets = null;

function getAuth() {
  if (_auth) return _auth;
  const credentials = {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
  _auth = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    SCOPES
  );
  return _auth;
}

export function getSheetsClient() {
  if (_sheets) return _sheets;
  _sheets = google.sheets({ version: 'v4', auth: getAuth() });
  return _sheets;
}

export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

// ─── Nombres de las hojas ────────────────────────────────────────────────────
export const SHEETS = {
  MOVIMIENTOS: 'MOVIMIENTOS',
  INVENTARIO:  'INVENTARIO',
  USUARIOS:    'USUARIOS',
  MATERIAS:    'MATERIAS',
  PROFESORES:  'PROFESORES',
};

// ─── Helpers genéricos ───────────────────────────────────────────────────────

// ─── Inicialización de Base de Datos ───────────────────────────────────────────
const HEADERS = {
  MOVIMIENTOS: ['ID', 'ID_PLANILLA', 'FECHA', 'HORA_EGRESO', 'ALUMNO_RESPONSABLE', 'DNI_ALUMNO', 'CURSO', 'MATERIA', 'PROFESOR', 'ITEMS_EGRESADOS', 'ESTADO', 'PAÑOLERO', 'ITEMS_INGRESADOS', 'HORA_INGRESO', 'DIFERENCIA', 'OBSERVACIONES', 'MODIFICADO_POR'],
  INVENTARIO:  ['ID', 'NOMBRE', 'CATEGORIA', 'STOCK_TOTAL', 'STOCK_DISPONIBLE', 'STOCK_MINIMO', 'ACTIVO', 'MODIFICADO_POR'],
  USUARIOS:    ['ID', 'NOMBRE', 'APELLIDO', 'EMAIL', 'ROL', 'ACTIVO', 'FECHA_CREACION', 'ULTIMO_ACCESO', 'MODIFICADO_POR'],
  MATERIAS:    ['ID', 'NOMBRE', 'CURSO', 'ACTIVO', 'MODIFICADO_POR'],
  PROFESORES:  ['ID', 'NOMBRE', 'APELLIDO', 'MATERIA_ID', 'ACTIVO', 'MODIFICADO_POR'],
};

export async function checkAndInitDb() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingSheets = res.data.sheets.map(s => s.properties.title);

  const missingSheets = Object.values(SHEETS).filter(s => !existingSheets.includes(s));
  
  if (missingSheets.length > 0) {
    const requests = missingSheets.map(title => ({ addSheet: { properties: { title } } }));
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, requestBody: { requests } });
  }

  // Verificar headers
  for (const sheetName of Object.values(SHEETS)) {
    const rows = await getSheetValues(sheetName, 'A1:Z1');
    if (!rows || rows.length === 0 || rows[0].length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [HEADERS[sheetName]] },
      });
    }
  }
}

/** Lee TODOS los valores de un rango (incluye header en fila 0) */
export async function getSheetValues(sheetName, range = '') {
  const sheets = getSheetsClient();
  const fullRange = range ? `${sheetName}!${range}` : sheetName;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: fullRange,
  });
  return res.data.values || [];
}

/** Convierte rows (array of arrays) a array of objects usando el header (fila 0) */
export function rowsToObjects(rows) {
  if (!rows || rows.length < 1) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? '';
    });
    return obj;
  });
}

/** Agrega una fila al final de la hoja */
export async function appendRow(sheetName, values) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

/** Actualiza una fila concreta (por número de fila 1-indexed, sin header) */
export async function updateRow(sheetName, rowIndex, values) {
  const sheets = getSheetsClient();
  // rowIndex es 0-indexed desde la primer fila de datos (sin header)
  // en Sheets la header está en fila 1, datos desde fila 2
  const sheetRow = rowIndex + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${sheetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

/** Devuelve la zona horaria Argentina */
export function nowAR() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })
  );
}

export function formatDate(d) {
  return d.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function formatTime(d) {
  return d.toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

/** Genera un ID único */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
