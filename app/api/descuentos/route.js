// app/api/descuentos/route.js
import { NextResponse } from 'next/server';
import { getSheetValues, rowsToObjects, SHEETS } from '@/lib/sheets';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const rows = await getSheetValues(SHEETS.DESCUENTOS);
    const descuentos = rowsToObjects(rows);

    return NextResponse.json({ descuentos: descuentos.reverse() });
  } catch (err) {
    console.error('Error fetching descuentos:', err);
    return NextResponse.json({ error: 'Error al cargar descuentos' }, { status: 500 });
  }
}
