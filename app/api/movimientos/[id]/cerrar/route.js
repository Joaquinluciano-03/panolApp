// app/api/movimientos/[id]/cerrar/route.js
// POST /api/movimientos/[id]/cerrar
// Cierra un pendiente/incompleto con ítems no devueltos.
// Body: { faltantes: [{nombre, cantidad}], observaciones }
// Reduce STOCK_TOTAL y STOCK_DISPONIBLE (el ítem desaparece del stock)
// Genera un registro en la tabla DESCUENTOS
import { NextResponse } from 'next/server';
import {
  getSheetValues, rowsToObjects, updateRow, appendRow, SHEETS,
  nowAR, formatDate, formatTime, generateId,
} from '@/lib/sheets';
import { requireAdmin } from '@/lib/auth';

export async function POST(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'Solo administradores pueden cerrar pendientes' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();
    const { faltantes = [], observaciones = '' } = body;
    // faltantes: [{ nombre, cantidad }]

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

    // ── 3. Procesar cada ítem faltante (SIEMPRE ELIMINAR) ─────────────────────
    for (const faltante of faltantes) {
      const { nombre, cantidad } = faltante;
      const invIdx = inventario.findIndex((i) => i.NOMBRE === nombre);
      if (invIdx === -1) continue;

      const invItem = inventario[invIdx];
      const headers = invRows[0];

      const stockTotal     = parseInt(invItem.STOCK_TOTAL, 10)     || 0;
      const stockDisp      = parseInt(invItem.STOCK_DISPONIBLE, 10) || 0;
      const stockEnUso     = parseInt(invItem.STOCK_EN_USO, 10)     || 0;
      const cantFaltante   = parseInt(cantidad, 10)                 || 0;

      // Reduce físicamente el stock total y en uso (ya que no se devuelve al disponible)
      const newTotal  = Math.max(0, stockTotal - cantFaltante);
      const newDisp   = stockDisp; // ya no estaba disponible (estaba en uso), solo reduce total
      const newEnUso  = Math.max(0, stockEnUso - cantFaltante); // liberar el en-uso del faltante
      let newActivo   = invItem.ACTIVO;

      // Si el total llega a 0, el item ya no tiene unidades
      if (newTotal === 0) newActivo = 'FALSE';

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

    // ── 4. Construir string de faltantes ──────────────────────────────────────
    const faltantesStr = faltantes
      .map((f) => `${f.nombre}:${f.cantidad}`)
      .join(',');

    // ── 5. Actualizar movimiento → CERRADO_CON_FALTANTES ────────────────────
    const now = nowAR();
    const movHeaders = movRows[0];
    const obsActualizada = [
      mov.OBSERVACIONES,
      observaciones,
      faltantes.length > 0 ? `FALTANTES (ELIMINADOS): ${faltantesStr}` : '',
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

    // ── 6. Generar registro en la tabla DESCUENTOS ────────────────────────────
    if (faltantes.length > 0) {
      const descuentoId = generateId();
      const descuentoRow = [
        descuentoId,                             // ID
        mov.ID_PLANILLA,                         // ID_PLANILLA
        formatDate(now),                         // FECHA_CIERRE
        formatTime(now),                         // HORA_CIERRE
        mov.ALUMNO_RESPONSABLE,                  // ALUMNO
        mov.CURSO,                               // CURSO
        mov.MATERIA,                             // MATERIA
        mov.PROFESOR,                            // PROFESOR
        mov.PAÑOLERO,                            // PAÑOLERO (original)
        faltantesStr,                            // ITEMS_FALTANTES
        observaciones || 'Cierre de faltantes',  // OBSERVACIONES
        payload.email,                           // CERRADO_POR (Admin actual)
      ];
      await appendRow(SHEETS.DESCUENTOS, descuentoRow);
    }

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

