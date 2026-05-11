// app/api/inventario/route.js
import { NextResponse } from 'next/server';
import { getSheetValues, rowsToObjects, appendRow, SHEETS, generateId } from '@/lib/sheets';
import { requireAuth, requireAdmin } from '@/lib/auth';

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const rows = await getSheetValues(SHEETS.INVENTARIO);
  const inventario = rowsToObjects(rows);

  const { searchParams } = new URL(request.url);
  const categoria = searchParams.get('categoria');
  const activo = searchParams.get('activo');
  const q = searchParams.get('q');
  const solo_activos = searchParams.get('solo_activos');

  let result = inventario;
  if (solo_activos === 'true') result = result.filter((i) => i.ACTIVO === 'TRUE');
  if (categoria) result = result.filter((i) => i.CATEGORIA === categoria);
  if (activo !== null && activo !== undefined && activo !== '') {
    result = result.filter((i) => i.ACTIVO === (activo === 'true' ? 'TRUE' : 'FALSE'));
  }
  if (q) {
    const lq = q.toLowerCase();
    result = result.filter(
      (i) => i.NOMBRE?.toLowerCase().includes(lq) || i.CATEGORIA?.toLowerCase().includes(lq)
    );
  }

  return NextResponse.json({ inventario: result });
}

export async function POST(request) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { nombre, categoria, stock_total, unidad_medida, descripcion, stock_minimo } = body;

  if (!nombre || !categoria || stock_total === undefined) {
    return NextResponse.json({ error: 'Nombre, categoría y stock son obligatorios' }, { status: 400 });
  }

  const rows = await getSheetValues(SHEETS.INVENTARIO);
  const existing = rowsToObjects(rows).find(
    (i) => i.NOMBRE?.toLowerCase() === nombre.toLowerCase()
  );
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un ítem con ese nombre' }, { status: 409 });
  }

  const id = generateId();
  const total = parseInt(stock_total, 10);
  const row = [
    id, nombre, categoria, total, total, 0,
    unidad_medida || 'unidad', descripcion || '', parseInt(stock_minimo, 10) || 1, 'TRUE', payload.email
  ];
  await appendRow(SHEETS.INVENTARIO, row);

  return NextResponse.json({ success: true, id }, { status: 201 });
}
