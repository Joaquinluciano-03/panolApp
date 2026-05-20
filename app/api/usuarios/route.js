// app/api/usuarios/route.js
import { NextResponse } from 'next/server';
import { getSheetValues, rowsToObjects, deleteRow, SHEETS } from '@/lib/sheets';
import { requireAdmin } from '@/lib/auth';

const PROTECTED_EMAIL = 'panol@donorionevictoria.com.ar';

export async function GET(request) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const rows = await getSheetValues(SHEETS.USUARIOS);
  const usuarios = rowsToObjects(rows).map(({ PASSWORD_HASH, ...u }) => u);
  return NextResponse.json({ usuarios });
}

export async function POST(request) {
  return NextResponse.json({ error: 'La creación manual de usuarios está deshabilitada. Los usuarios deben ingresar con su cuenta de Google @donorionevictoria.com.ar para registrarse automáticamente.' }, { status: 405 });
}

export async function DELETE(request) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const rows = await getSheetValues(SHEETS.USUARIOS);
  const usuarios = rowsToObjects(rows);

  // Filtrar los que se pueden eliminar: no ADMIN y no el usuario protegido del sistema
  const toDelete = usuarios
    .map((u, idx) => ({ ...u, _idx: idx }))
    .filter((u) => u.ROL !== 'ADMIN' && u.EMAIL !== PROTECTED_EMAIL);

  // Eliminar en orden INVERSO para que los índices no se desplacen
  for (const u of toDelete.slice().reverse()) {
    await deleteRow(SHEETS.USUARIOS, u._idx);
  }

  return NextResponse.json({ success: true, eliminados: toDelete.length });
}
