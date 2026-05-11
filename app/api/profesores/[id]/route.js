// app/api/profesores/[id]/route.js
import { NextResponse } from 'next/server';
import { getSheetValues, rowsToObjects, updateRow, SHEETS } from '@/lib/sheets';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const rows = await getSheetValues(SHEETS.PROFESORES);
  const profesores = rowsToObjects(rows);
  const idx = profesores.findIndex((p) => p.ID === id);
  if (idx === -1) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const prof = profesores[idx];
  const headers = rows[0];
  const updatedRow = headers.map((h) => {
    if (h === 'NOMBRE' && body.nombre !== undefined) return body.nombre;
    if (h === 'APELLIDO' && body.apellido !== undefined) return body.apellido;
    if (h === 'MATERIA_ASOCIADA' && body.materia_asociada !== undefined) return body.materia_asociada;
    if (h === 'ACTIVO' && body.activo !== undefined) return body.activo ? 'TRUE' : 'FALSE';
    return prof[h] ?? '';
  });

  await updateRow(SHEETS.PROFESORES, idx, updatedRow);
  return NextResponse.json({ success: true });
}
