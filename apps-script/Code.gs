// ============================================================
// SISTEMA DE PAÑOL — Google Apps Script Web App
// Pegar este código en:
//   Extensiones → Apps Script → reemplazar todo → Guardar → Implementar
// ============================================================

// ⚠️ IMPORTANTE: cambiá este valor por una clave secreta larga.
// La misma clave debe ir en la variable APPS_SCRIPT_SECRET de Vercel/Netlify.
const SECRET = 'CAMBIAR_POR_UNA_CLAVE_SECRETA_LARGA';

// ID de la planilla (lo obtenés de la URL: .../spreadsheets/d/ESTE_ID/edit)
const SPREADSHEET_ID = '1vWI4YNOerTUeGYjtTAuRkX6vwHBzki7A1xi7oYUT4U0';

// ─── Utilidades ───────────────────────────────────────────────────────────────

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// ─── GET — Lectura de datos ───────────────────────────────────────────────────

function doGet(e) {
  try {
    if (e.parameter.secret !== SECRET) {
      return jsonResponse({ error: 'Unauthorized' });
    }

    const action = e.parameter.action;
    const ss = getSpreadsheet();

    if (action === 'getValues') {
      const sheetName = e.parameter.sheet;
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return jsonResponse({ values: [] });
      const values = sheet.getDataRange().getValues();
      return jsonResponse({ values });
    }

    if (action === 'getSheetNames') {
      const names = ss.getSheets().map(s => s.getName());
      return jsonResponse({ names });
    }

    return jsonResponse({ error: 'Acción desconocida: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ─── POST — Escritura de datos ────────────────────────────────────────────────

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.secret !== SECRET) {
      return jsonResponse({ error: 'Unauthorized' });
    }

    const action = body.action;
    const ss = getSpreadsheet();

    // ── init: crear hojas faltantes y escribir headers ──
    if (action === 'init') {
      const sheetNames = body.sheets; // array de nombres
      const headersMap = body.headers; // { NOMBRE: [col1, col2, ...] }

      const existingNames = ss.getSheets().map(s => s.getName());

      for (const name of sheetNames) {
        let sheet = ss.getSheetByName(name);

        // Crear hoja si no existe
        if (!sheet) {
          sheet = ss.insertSheet(name);
        }

        // Escribir header si la fila 1 está vacía
        const firstCell = sheet.getRange(1, 1).getValue();
        if (!firstCell || firstCell === '') {
          const headers = headersMap[name];
          if (headers && headers.length > 0) {
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
          }
        }
      }
      return jsonResponse({ success: true });
    }

    // ── appendRow: agregar fila al final ──
    if (action === 'appendRow') {
      const sheet = ss.getSheetByName(body.sheet);
      if (!sheet) return jsonResponse({ error: 'Hoja no encontrada: ' + body.sheet });
      sheet.appendRow(body.values);
      return jsonResponse({ success: true });
    }

    // ── updateRow: actualizar fila por índice (0-based, sin contar header) ──
    if (action === 'updateRow') {
      const sheet = ss.getSheetByName(body.sheet);
      if (!sheet) return jsonResponse({ error: 'Hoja no encontrada: ' + body.sheet });
      const sheetRow = body.rowIndex + 2; // +1 por header, +1 porque Sheets es 1-indexed
      const values = body.values;
      sheet.getRange(sheetRow, 1, 1, values.length).setValues([values]);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Acción desconocida: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}
