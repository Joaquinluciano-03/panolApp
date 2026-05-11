// app/api/materias/[id]/route.js
import { NextResponse } from 'next/server';
import { getSheetValues, rowsToObjects, updateRow, SHEETS } from '@/lib/sheets';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const rows = await getSheetValues(SHEETS.MATERIAS);
  const materias = rowsToObjects(rows);
  const idx = materias.findIndex((m) => m.ID === id);
  if (idx === -1) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  const materia = materias[idx];
  const headers = rows[0];
  const updatedRow = headers.map((h) => {
    if (h === 'MODIFICADO_POR') return payload.email;
    if (h === 'NOMBRE_MATERIA' && body.nombre !== undefined) return body.nombre;
    if (h === 'ACTIVO' && body.activo !== undefined) return body.activo ? 'TRUE' : 'FALSE';
    return materia[h] ?? '';
  });

  await updateRow(SHEETS.MATERIAS, idx, updatedRow);
  return NextResponse.json({ success: true });
}
