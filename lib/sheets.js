// lib/sheets.js
// Google Sheets API v4 client — usa Service Account
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let _auth = null;
let _sheets = null;

function getAuth() {
  if (_auth) return _auth;
  
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;
  
  if (!email || !key) {
    throw new Error('Variables de entorno de Google Cloud (Email o Key) están vacías');
  }
  
  // Limpiar comillas si Netlify las agregó por error, y arreglar saltos de línea (literal \n)
  key = key.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

  // Reconstrucción "a prueba de balas": si Netlify aplastó la clave en 1 sola línea sin saltos
  if (!key.includes('\n')) {
    const beginStr = '-----BEGIN PRIVATE KEY-----';
    const endStr = '-----END PRIVATE KEY-----';
    if (key.includes(beginStr) && key.includes(endStr)) {
      const body = key.replace(beginStr, '').replace(endStr, '').replace(/\s+/g, '');
      const chunks = body.match(/.{1,64}/g);
      key = `${beginStr}\n${chunks.join('\n')}\n${endStr}\n`;
    }
  }

  _auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key,
    },
    scopes: SCOPES,
  });
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

// ─── Definición de columnas (para auto-init) ─────────────────────────────────
const HEADERS = {
  MOVIMIENTOS: ['ID', 'ID_PLANILLA', 'FECHA', 'HORA_EGRESO', 'ALUMNO_RESPONSABLE', 'DNI_ALUMNO', 'CURSO', 'MATERIA', 'PROFESOR', 'ITEMS_EGRESADOS', 'ESTADO', 'PAÑOLERO', 'ITEMS_INGRESADOS', 'HORA_INGRESO', 'DIFERENCIA', 'OBSERVACIONES', 'MODIFICADO_POR'],
  INVENTARIO:  ['ID', 'NOMBRE', 'CATEGORIA', 'STOCK_TOTAL', 'STOCK_DISPONIBLE', 'STOCK_EN_USO', 'UNIDAD_MEDIDA', 'DESCRIPCION', 'STOCK_MINIMO', 'ACTIVO', 'MODIFICADO_POR'],
  USUARIOS:    ['ID', 'NOMBRE', 'APELLIDO', 'EMAIL', 'ROL', 'ACTIVO', 'FECHA_CREACION', 'ULTIMO_ACCESO', 'MODIFICADO_POR'],
  MATERIAS:    ['ID', 'NOMBRE', 'CURSO', 'ACTIVO', 'MODIFICADO_POR'],
  PROFESORES:  ['ID', 'NOMBRE', 'APELLIDO', 'MATERIA_ID', 'ACTIVO', 'MODIFICADO_POR'],
};

// ─── Inicialización automática de la base de datos ───────────────────────────

export async function checkAndInitDb() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingSheets = res.data.sheets.map(s => s.properties.title);

  // Crear hojas faltantes
  const missingSheets = Object.values(SHEETS).filter(s => !existingSheets.includes(s));
  if (missingSheets.length > 0) {
    const requests = missingSheets.map(title => ({ addSheet: { properties: { title } } }));
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, requestBody: { requests } });
  }

  // Escribir/Actualizar headers
  for (const sheetName of Object.values(SHEETS)) {
    const rows = await getSheetValues(sheetName);
    const expectedHeaders = HEADERS[sheetName];
    
    // Si la hoja está vacía o el número de columnas del header es menor al esperado
    if (!rows || rows.length === 0 || !rows[0] || rows[0].length < expectedHeaders.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [expectedHeaders] },
      });
      console.log(`Cabeceras actualizadas para la hoja ${sheetName}`);
    }
  }
}

/** Limpia movimientos más antiguos de 60 días */
export async function cleanOldMovimientos() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = res.data.sheets.find((s) => s.properties.title === SHEETS.MOVIMIENTOS);
  if (!sheet) return;

  const rows = await getSheetValues(SHEETS.MOVIMIENTOS);
  if (rows.length <= 1) return;

  const now = nowAR();
  const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

  let rowsToDeleteCount = 0;
  for (let i = 1; i < rows.length; i++) {
    const fechaStr = rows[i][2]; // FECHA está en la columna C (índice 2)
    if (!fechaStr) continue;
    
    const parts = fechaStr.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      
      if (date < sixtyDaysAgo) {
        rowsToDeleteCount++;
      } else {
        break; // Al estar en orden cronológico, paramos en el primero que sea reciente
      }
    }
  }

  if (rowsToDeleteCount > 0) {
    const requests = [{
      deleteDimension: {
        range: {
          sheetId: sheet.properties.sheetId,
          dimension: 'ROWS',
          startIndex: 1, // Empezar a borrar desde la fila 2 (índice 1) para saltar el header
          endIndex: 1 + rowsToDeleteCount
        }
      }
    }];
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests }
    });
    console.log(`Limpia automática: Se eliminaron ${rowsToDeleteCount} filas antiguas.`);
  }
}

// ─── Helpers de datos ─────────────────────────────────────────────────────────

/** Lee TODOS los valores de una hoja (incluye header en fila 0) */
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
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });
}

/** Agrega una fila al final de la hoja */
export async function appendRow(sheetName, values) {
  const sheets = getSheetsClient();
  const sanitizedValues = values.map(v => sanitize(v));
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [sanitizedValues] },
  });
}

/** Actualiza una fila concreta (rowIndex 0-based desde primer fila de datos, sin header) */
export async function updateRow(sheetName, rowIndex, values) {
  const sheets = getSheetsClient();
  const sheetRow = rowIndex + 2; // +1 header, +1 porque Sheets es 1-indexed
  const sanitizedValues = values.map(v => sanitize(v));
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${sheetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [sanitizedValues] },
  });
}

// ─── Helpers de fecha/hora ────────────────────────────────────────────────────

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

/** 
 * Previene inyección de fórmulas (CSV Injection) en Google Sheets y sanitiza texto.
 * Si empieza con =, +, -, o @, se le añade un apóstrofe (') al inicio.
 */
export function sanitize(value) {
  if (typeof value !== 'string') return value;
  let str = value.trim();
  // Prevenir inyección de fórmulas de Sheets
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }
  // Escapar caracteres problemáticos básicos (opcional, React ya protege XSS, pero evita problemas en la db)
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
