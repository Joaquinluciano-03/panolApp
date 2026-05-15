// app/api/movimientos/[id]/cerrar/route.js
// POST /api/movimientos/[id]/cerrar
// Cierra un pendiente/incompleto con ítems no devueltos.
// Body: { faltantes: [{nombre, cantidad, accion: 'ELIMINAR'|'DESACTIVAR'}], observaciones }
//   ELIMINAR  → reduce STOCK_TOTAL y STOCK_DISPONIBLE (el ítem desaparece del stock)
//   DESACTIVAR → ACTIVO=FALSE, devuelve stock_en_uso pero NO suma al disponible (ítem marcado perdido)
import { NextResponse } from 'next/server';
import {
  getSheetValues, rowsToObjects, updateRow, SHEETS,
  nowAR, formatTime,
} from '@/lib/sheets';
import { requireAdmin } from '@/lib/auth';

export async function POST(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'Solo administradores pueden cerrar pendientes' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();
    const { faltantes = [], observaciones = '' } = body;
    // faltantes: [{ nombre, cantidad, accion }]

    // ── 1. Cargar movimiento ──────────────────────────────────────────────────
    const movRows = await getSheetValues(SHEETS.MOVIMIENTOS);
    const movimientos = rowsToObjects(movRows);
    const movIdx = movimientos.findIndex((m) => m.ID === id || m.ID_PLANILLA === id);
    if (movIdx === -1) return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });

    const mov = movimientos[movIdx];
    if (!['PENDIENTE', 'INCOMPLETO'].includes(mov.ESTADO)) {
      return NextResponse.json({ error: 'Este movimiento ya está cerrado' }, { status: 400 });
    }

    // ── 2. Cargar inventario ──────────────────────────────────────────────────
    const invRows = await getSheetValues(SHEETS.INVENTARIO);
    const inventario = rowsToObjects(invRows);

    // ── 3. Procesar cada ítem faltante ────────────────────────────────────────
    for (const faltante of faltantes) {
      const { nombre, cantidad, accion } = faltante;
      const invIdx = inventario.findIndex((i) => i.NOMBRE === nombre);
      if (invIdx === -1) continue;

      const invItem = inventario[invIdx];
      const headers = invRows[0];

      const stockTotal     = parseInt(invItem.STOCK_TOTAL, 10)     || 0;
      const stockDisp      = parseInt(invItem.STOCK_DISPONIBLE, 10) || 0;
      const stockEnUso     = parseInt(invItem.STOCK_EN_USO, 10)     || 0;
      const cantFaltante   = parseInt(cantidad, 10)                 || 0;

      let newTotal    = stockTotal;
      let newDisp     = stockDisp;
      let newEnUso    = Math.max(0, stockEnUso - cantFaltante); // liberar el en-uso del faltante
      let newActivo   = invItem.ACTIVO;

      if (accion === 'ELIMINAR') {
        // Reduce físicamente el stock total y disponible
        newTotal  = Math.max(0, stockTotal - cantFaltante);
        newDisp   = stockDisp; // ya no estaba disponible (estaba en uso), solo reduce total
        // Si el total llega a 0, el item ya no tiene unidades
        if (newTotal === 0) newActivo = 'FALSE';
      } else if (accion === 'DESACTIVAR') {
        // El ítem queda "perdido" — inactivo, no se puede pedir
        // No suma al disponible, solo limpia el en-uso
        newActivo = 'FALSE';
        // newDisp no cambia (no volvió)
      }

      const updatedRow = headers.map((h) => {
        if (h === 'MODIFICADO_POR')   return payload.email;
        if (h === 'STOCK_TOTAL')      return String(newTotal);
        if (h === 'STOCK_DISPONIBLE') return String(newDisp);
        if (h === 'STOCK_EN_USO')     return String(newEnUso);
        if (h === 'ACTIVO')           return newActivo;
        return invItem[h] ?? '';
      });

      await updateRow(SHEETS.INVENTARIO, invIdx, updatedRow);

      // Actualizar objeto local para evitar re-lectura
      inventario[invIdx] = {
        ...invItem,
        STOCK_TOTAL: String(newTotal),
        STOCK_DISPONIBLE: String(newDisp),
        STOCK_EN_USO: String(newEnUso),
        ACTIVO: newActivo,
      };
    }

    // ── 4. Construir string de faltantes para registro ────────────────────────
    const faltantesStr = faltantes
      .map((f) => `${f.nombre}:${f.cantidad}(${f.accion})`)
      .join(',');

    // ── 5. Actualizar movimiento → CERRADO_CON_FALTANTES ────────────────────
    const now = nowAR();
    const movHeaders = movRows[0];
    const obsActualizada = [
      mov.OBSERVACIONES,
      observaciones,
      faltantes.length > 0 ? `FALTANTES: ${faltantesStr}` : '',
    ].filter(Boolean).join(' | ');

    const updatedMov = movHeaders.map((h) => {
      if (h === 'MODIFICADO_POR') return payload.email;
      if (h === 'ESTADO')         return 'CERRADO_CON_FALTANTES';
      if (h === 'HORA_INGRESO')   return mov.HORA_INGRESO || formatTime(now);
      if (h === 'DIFERENCIA')     return faltantesStr || mov.DIFERENCIA || '';
      if (h === 'OBSERVACIONES')  return obsActualizada;
      return mov[h] ?? '';
    });

    await updateRow(SHEETS.MOVIMIENTOS, movIdx, updatedMov);

    return NextResponse.json({
      success: true,
      estado: 'CERRADO_CON_FALTANTES',
      faltantes: faltantesStr,
    });
  } catch (err) {
    console.error('Error cerrando pendiente con faltantes:', err);
    return NextResponse.json({ error: 'Error interno al cerrar pendiente' }, { status: 500 });
  }
}
