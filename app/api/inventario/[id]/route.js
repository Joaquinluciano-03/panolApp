// app/api/inventario/[id]/route.js
import { NextResponse } from 'next/server';
import { getSheetValues, rowsToObjects, updateRow, appendRow, SHEETS, nowAR, formatDate, formatTime, generateId } from '@/lib/sheets';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const rows = await getSheetValues(SHEETS.INVENTARIO);
  const inventario = rowsToObjects(rows);
  const idx = inventario.findIndex((i) => i.ID === id);
  if (idx === -1) return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 });

  const item = inventario[idx];
  const headers = rows[0];

  // Campos editables
  const updatable = [
    'NOMBRE', 'CATEGORIA', 'STOCK_TOTAL',
    'UNIDAD_MEDIDA', 'DESCRIPCION', 'STOCK_MINIMO', 'ACTIVO',
  ];
  const updatedRow = headers.map((h) => {
    if (h === 'MODIFICADO_POR') return payload.email;
    if (updatable.includes(h) && body[h.toLowerCase()] !== undefined) {
      return String(body[h.toLowerCase()]);
    }
    return item[h] ?? '';
  });

  await updateRow(SHEETS.INVENTARIO, idx, updatedRow);

  // Registro en auditoría si cambió el stock o si se desactivó/activó
  const oldStock = parseInt(item.STOCK_TOTAL, 10) || 0;
  const newStock = parseInt(body.stock_total ?? oldStock, 10);
  const oldActivo = item.ACTIVO;
  const newActivo = body.activo ?? oldActivo;

  if (oldStock !== newStock || oldActivo !== newActivo) {
    const now = nowAR();
    let accion = 'MODIFICACION_STOCK';
    let obs = 'Modificación manual de stock';
    
    if (oldActivo === 'TRUE' && newActivo === 'FALSE') {
      accion = 'BAJA_ITEM';
      obs = 'Ítem desactivado/dado de baja';
    } else if (oldActivo === 'FALSE' && newActivo === 'TRUE') {
      accion = 'ALTA_ITEM';
      obs = 'Ítem reactivado';
    } else if (newStock > oldStock) {
      accion = 'AUMENTO_STOCK';
    } else if (newStock < oldStock) {
      accion = 'REDUCCION_STOCK';
    }

    const auditoriaRow = [
      generateId(),
      formatDate(now),
      formatTime(now),
      id,
      item.NOMBRE,
      accion,
      String(oldStock),
      String(newStock),
      payload.email,
      obs
    ];
    await appendRow(SHEETS.AUDITORIA_STOCK, auditoriaRow);
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const rows = await getSheetValues(SHEETS.INVENTARIO);
  const inventario = rowsToObjects(rows);
  const idx = inventario.findIndex((i) => i.ID === id);
  if (idx === -1) return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 });

  const item = inventario[idx];
  const headers = rows[0];

  const updatedRow = headers.map((h) => {
    if (h === 'MODIFICADO_POR') return payload.email;
    const key = h.toLowerCase();
    if (body[key] !== undefined) return String(body[key]);
    return item[h] ?? '';
  });

  await updateRow(SHEETS.INVENTARIO, idx, updatedRow);

  // Registro en auditoría si cambió el stock o activo
  const oldStock = parseInt(item.STOCK_TOTAL, 10) || 0;
  const newStock = parseInt(body.stock_total ?? oldStock, 10);
  const oldActivo = item.ACTIVO;
  const newActivo = body.activo ?? oldActivo;

  if (oldStock !== newStock || oldActivo !== newActivo) {
    const now = nowAR();
    let accion = 'MODIFICACION_STOCK';
    let obs = 'Modificación manual de stock';
    
    if (oldActivo === 'TRUE' && String(newActivo) === 'FALSE') {
      accion = 'BAJA_ITEM';
      obs = 'Ítem desactivado/dado de baja';
    } else if (oldActivo === 'FALSE' && String(newActivo) === 'TRUE') {
      accion = 'ALTA_ITEM';
      obs = 'Ítem reactivado';
    } else if (newStock > oldStock) {
      accion = 'AUMENTO_STOCK';
    } else if (newStock < oldStock) {
      accion = 'REDUCCION_STOCK';
    }

    const auditoriaRow = [
      generateId(),
      formatDate(now),
      formatTime(now),
      id,
      item.NOMBRE,
      accion,
      String(oldStock),
      String(newStock),
      payload.email,
      obs
    ];
    await appendRow(SHEETS.AUDITORIA_STOCK, auditoriaRow);
  }

  return NextResponse.json({ success: true });
}
