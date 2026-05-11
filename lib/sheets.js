// lib/sheets.js
// Usa Google Apps Script como proxy — sin Service Account ni Google Cloud.
// El Apps Script corre con los permisos del dueño de la planilla.

const SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const SCRIPT_SECRET = process.env.APPS_SCRIPT_SECRET;

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
  INVENTARIO:  ['ID', 'NOMBRE', 'CATEGORIA', 'STOCK_TOTAL', 'STOCK_DISPONIBLE', 'STOCK_MINIMO', 'ACTIVO', 'MODIFICADO_POR'],
  USUARIOS:    ['ID', 'NOMBRE', 'APELLIDO', 'EMAIL', 'ROL', 'ACTIVO', 'FECHA_CREACION', 'ULTIMO_ACCESO', 'MODIFICADO_POR'],
  MATERIAS:    ['ID', 'NOMBRE', 'CURSO', 'ACTIVO', 'MODIFICADO_POR'],
  PROFESORES:  ['ID', 'NOMBRE', 'APELLIDO', 'MATERIA_ID', 'ACTIVO', 'MODIFICADO_POR'],
};

// ─── Comunicación con el Apps Script ─────────────────────────────────────────

async function scriptGet(params) {
  const url = new URL(SCRIPT_URL);
  url.searchParams.set('secret', SCRIPT_SECRET);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Apps Script GET error: ${res.status}`);
  return res.json();
}

async function scriptPost(body) {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // Apps Script requiere text/plain para evitar preflight
    body: JSON.stringify({ secret: SCRIPT_SECRET, ...body }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Apps Script POST error: ${res.status}`);
  return res.json();
}

// ─── Inicialización de la base de datos ──────────────────────────────────────

export async function checkAndInitDb() {
  await scriptPost({ action: 'init', headers: HEADERS, sheets: Object.values(SHEETS) });
}

// ─── Helpers de datos ─────────────────────────────────────────────────────────

/** Lee TODOS los valores de una hoja (incluye header en fila 0) */
export async function getSheetValues(sheetName) {
  const data = await scriptGet({ action: 'getValues', sheet: sheetName });
  return data.values || [];
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
  await scriptPost({ action: 'appendRow', sheet: sheetName, values });
}

/** Actualiza una fila concreta (rowIndex 0-based desde primer fila de datos, sin header) */
export async function updateRow(sheetName, rowIndex, values) {
  // rowIndex 0 → fila 2 en Sheets (fila 1 = header)
  await scriptPost({ action: 'updateRow', sheet: sheetName, rowIndex, values });
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
