// app/api/usuarios/[id]/route.js
import { NextResponse } from 'next/server';
import { getSheetValues, rowsToObjects, updateRow, deleteRow, SHEETS } from '@/lib/sheets';
import { requireAdmin } from '@/lib/auth';

const PROTECTED_EMAIL = 'panol@donorionevictoria.com.ar';

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

  // Bloquear modificación del usuario protegido del sistema
  if (usuario.EMAIL === PROTECTED_EMAIL) {
    return NextResponse.json({ error: 'Este usuario del sistema no puede ser modificado' }, { status: 403 });
  }

  const updatedRow = headers.map((h) => {
    if (h === 'MODIFICADO_POR') return payload.email;
    if (h === 'ROL' && body.rol !== undefined) return body.rol;
    return usuario[h] ?? '';
  });

  await updateRow(SHEETS.USUARIOS, idx, updatedRow);
  return NextResponse.json({ success: true });
}

export async function DELETE(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  // Evitar que el admin se auto-elimine
  if (payload.id === id) {
    return NextResponse.json({ error: 'No podés eliminarte a vos mismo' }, { status: 400 });
  }

  const rows = await getSheetValues(SHEETS.USUARIOS);
  const usuarios = rowsToObjects(rows);
  const idx = usuarios.findIndex((u) => u.ID === id);
  if (idx === -1) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  // Bloquear eliminación del usuario protegido del sistema
  if (usuarios[idx].EMAIL === PROTECTED_EMAIL) {
    return NextResponse.json({ error: 'Este usuario del sistema no puede ser eliminado' }, { status: 403 });
  }

  await deleteRow(SHEETS.USUARIOS, idx);
  return NextResponse.json({ success: true });
}
