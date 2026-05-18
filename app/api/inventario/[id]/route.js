// app/api/inventario/[id]/route.js
import { NextResponse } from 'next/server';
import { getSheetValues, rowsToObjects, updateRow, SHEETS } from '@/lib/sheets';
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
  return NextResponse.json({ success: true });
}
