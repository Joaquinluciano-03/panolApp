// app/api/movimientos/[id]/route.js
import { NextResponse } from 'next/server';
import {
  getSheetValues, rowsToObjects, updateRow, SHEETS,
  nowAR, formatDate, formatTime,
} from '@/lib/sheets';
import { requireAuth } from '@/lib/auth';
import { parseItems, calcDiferencia } from '@/lib/utils';

/** GET /api/movimientos/[id] — obtener un movimiento por ID */
export async function GET(request, { params }) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const rows = await getSheetValues(SHEETS.MOVIMIENTOS);
  const movimientos = rowsToObjects(rows);
  const mov = movimientos.find((m) => m.ID === id || m.ID_PLANILLA === id);
  if (!mov) return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });

  return NextResponse.json({ movimiento: mov });
}

/** PUT /api/movimientos/[id] — registrar retorno */
export async function PUT(request, { params }) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();
    const { itemsIngresados, observaciones } = body;
    // itemsIngresados: [{nombre, cantidad}]

    const rows = await getSheetValues(SHEETS.MOVIMIENTOS);
    const movimientos = rowsToObjects(rows);
    const idx = movimientos.findIndex((m) => m.ID === id || m.ID_PLANILLA === id);

    if (idx === -1) return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });

    const mov = movimientos[idx];
    if (mov.ESTADO !== 'PENDIENTE') {
      return NextResponse.json({ error: 'Este movimiento ya fue completado' }, { status: 400 });
    }

    // Validar que no se devuelva más de lo que salió
    const egresados = parseItems(mov.ITEMS_EGRESADOS);
    for (const item of itemsIngresados) {
      const eg = egresados.find((e) => e.nombre === item.nombre);
      if (!eg) continue;
      if (item.cantidad > eg.cantidad) {
        return NextResponse.json({
          error: `No se puede retornar más unidades de las egresadas para ${item.nombre}`,
        }, { status: 400 });
      }
    }

    const now = nowAR();
    const itemsIngStr = itemsIngresados.map((i) => `${i.nombre}:${i.cantidad}`).join(',');
    const diferencia = calcDiferencia(mov.ITEMS_EGRESADOS, itemsIngStr);

    // Determinar estado
    const tieneDiff = diferencia.length > 0;
    const estado = tieneDiff ? 'INCOMPLETO' : 'COMPLETADO';

    // Actualizar inventario — devolver stock
    const invRows = await getSheetValues(SHEETS.INVENTARIO);
    const inventario = rowsToObjects(invRows);

    for (const item of itemsIngresados) {
      const invIdx = inventario.findIndex((i) => i.NOMBRE === item.nombre);
      if (invIdx === -1) continue;
      const invItem = inventario[invIdx];
      const newDisponible = parseInt(invItem.STOCK_DISPONIBLE, 10) + item.cantidad;
      const newEnUso = Math.max(0, parseInt(invItem.STOCK_EN_USO, 10) - item.cantidad);
      const headers = invRows[0];
      const updatedRow = headers.map((h) => {
        if (h === 'MODIFICADO_POR') return payload.email;
        if (h === 'STOCK_DISPONIBLE') return String(newDisponible);
        if (h === 'STOCK_EN_USO') return String(newEnUso);
        return invItem[h] ?? '';
      });
      await updateRow(SHEETS.INVENTARIO, invIdx, updatedRow);
    }

    // Actualizar movimiento
    const headers = rows[0];
    const updatedMov = headers.map((h) => {
      if (h === 'MODIFICADO_POR') return payload.email;
      if (h === 'HORA_INGRESO') return formatTime(now);
      if (h === 'ITEMS_INGRESADOS') return itemsIngStr;
      if (h === 'DIFERENCIA') return diferencia;
      if (h === 'ESTADO') return estado;
      if (h === 'OBSERVACIONES') return observaciones || mov.OBSERVACIONES || '';
      return mov[h] ?? '';
    });
    await updateRow(SHEETS.MOVIMIENTOS, idx, updatedMov);

    return NextResponse.json({ success: true, estado, diferencia });
  } catch (err) {
    console.error('Error registrando retorno:', err);
    return NextResponse.json({ error: 'Error interno al registrar retorno' }, { status: 500 });
  }
}

/** PATCH /api/movimientos/[id] — agregar observaciones */
export async function PATCH(request, { params }) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const { observaciones } = await request.json();

  const rows = await getSheetValues(SHEETS.MOVIMIENTOS);
  const movimientos = rowsToObjects(rows);
  const idx = movimientos.findIndex((m) => m.ID === id);
  if (idx === -1) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const mov = movimientos[idx];
  const headers = rows[0];
  const updatedMov = headers.map((h) => {
    if (h === 'MODIFICADO_POR') return payload.email;
    if (h === 'OBSERVACIONES') return observaciones || '';
    return mov[h] ?? '';
  });
  await updateRow(SHEETS.MOVIMIENTOS, idx, updatedMov);

  return NextResponse.json({ success: true });
}
