// app/api/profesores/route.js
import { NextResponse } from 'next/server';
import { getSheetValues, rowsToObjects, appendRow, SHEETS, generateId } from '@/lib/sheets';
import { requireAuth, requireAdmin } from '@/lib/auth';

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const rows = await getSheetValues(SHEETS.PROFESORES);
  let profesores = rowsToObjects(rows).filter((p) => p.ACTIVO === 'TRUE');

  const { searchParams } = new URL(request.url);
  const materia = searchParams.get('materia');
  if (materia) profesores = profesores.filter((p) => p.MATERIA_ASOCIADA === materia);

  return NextResponse.json({ profesores });
}

export async function POST(request) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { nombre, apellido, materia_asociada } = await request.json();
  if (!nombre || !apellido) {
    return NextResponse.json({ error: 'Nombre y apellido requeridos' }, { status: 400 });
  }
  await appendRow(SHEETS.PROFESORES, [generateId(), nombre, apellido, materia_asociada || '', 'TRUE', payload.email]);
  return NextResponse.json({ success: true }, { status: 201 });
}
