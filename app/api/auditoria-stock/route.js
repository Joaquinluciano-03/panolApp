import { NextResponse } from 'next/server';
import { getSheetValues, rowsToObjects, SHEETS } from '@/lib/sheets';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const rows = await getSheetValues(SHEETS.AUDITORIA_STOCK);
    const auditoria = rowsToObjects(rows);
    return NextResponse.json({ auditoria: auditoria.reverse() });
  } catch (err) {
    console.error('Error obteniendo auditoría de stock:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
