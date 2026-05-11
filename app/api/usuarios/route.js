// app/api/usuarios/route.js
import { NextResponse } from 'next/server';
import { getSheetValues, rowsToObjects, appendRow, SHEETS, generateId, nowAR, formatDate } from '@/lib/sheets';
import { requireAdmin, hashPassword } from '@/lib/auth';

export async function GET(request) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const rows = await getSheetValues(SHEETS.USUARIOS);
  const usuarios = rowsToObjects(rows).map(({ PASSWORD_HASH, ...u }) => u); // nunca exponer hash
  return NextResponse.json({ usuarios });
}

export async function POST(request) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { nombre, apellido, email, password, rol } = await request.json();

  if (!nombre || !apellido || !email || !password || !rol) {
    return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
  }
  if (!['ADMIN', 'PAÑOLERO'].includes(rol)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  }

  const rows = await getSheetValues(SHEETS.USUARIOS);
  const usuarios = rowsToObjects(rows);
  if (usuarios.some((u) => u.EMAIL?.toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ error: 'El email ya está en uso' }, { status: 409 });
  }

  const hash = await hashPassword(password);
  const now = nowAR();
  await appendRow(SHEETS.USUARIOS, [
    generateId(), nombre, apellido, email, hash, rol, 'TRUE', formatDate(now), '',
  ]);

  return NextResponse.json({ success: true }, { status: 201 });
}
