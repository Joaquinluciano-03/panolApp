// app/api/usuarios/[id]/route.js
import { NextResponse } from 'next/server';
import { getSheetValues, rowsToObjects, updateRow, SHEETS } from '@/lib/sheets';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const rows = await getSheetValues(SHEETS.USUARIOS);
  const usuarios = rowsToObjects(rows);
  const idx = usuarios.findIndex((u) => u.ID === id);
  if (idx === -1) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const usuario = usuarios[idx];
  const headers = rows[0];

  const updatedRow = headers.map((h) => {
    if (h === 'MODIFICADO_POR') return payload.email;
    if (h === 'NOMBRE' && body.nombre !== undefined) return body.nombre;
    if (h === 'APELLIDO' && body.apellido !== undefined) return body.apellido;
    if (h === 'EMAIL' && body.email !== undefined) return body.email;
    if (h === 'ROL' && body.rol !== undefined) return body.rol;
    if (h === 'ACTIVO' && body.activo !== undefined) return body.activo ? 'TRUE' : 'FALSE';
    return usuario[h] ?? '';
  });

  await updateRow(SHEETS.USUARIOS, idx, updatedRow);
  return NextResponse.json({ success: true });
}
