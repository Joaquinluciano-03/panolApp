// app/api/materias/route.js
import { NextResponse } from 'next/server';
import { getSheetValues, rowsToObjects, appendRow, SHEETS, generateId } from '@/lib/sheets';
import { requireAuth, requireAdmin } from '@/lib/auth';

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const rows = await getSheetValues(SHEETS.MATERIAS);
  const materias = rowsToObjects(rows).filter((m) => m.ACTIVO === 'TRUE');
  return NextResponse.json({ materias });
}

export async function POST(request) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { nombre } = await request.json();
  if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  await appendRow(SHEETS.MATERIAS, [generateId(), nombre, '', 'TRUE', payload.email]);
  return NextResponse.json({ success: true }, { status: 201 });
}
