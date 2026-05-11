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
  return NextResponse.json({ error: 'La creación manual de usuarios está deshabilitada. Los usuarios deben ingresar con su cuenta de Google @donorionevictoria.com.ar para registrarse automáticamente.' }, { status: 405 });
}
