import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { mapToUpper } from '@/lib/utils';

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const item_nombre = searchParams.get('item');
  const usuario = searchParams.get('usuario');
  const accion = searchParams.get('accion');
  const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);

  let query = supabase.from('auditoria_stock').select(
    'id, fecha, hora, item_id, item_nombre, accion, stock_anterior, stock_nuevo, diferencia, usuario'
  ).order('id', { ascending: false }).limit(limit);

  if (item_nombre) query = query.ilike('item_nombre', `%${item_nombre}%`);
  if (usuario) query = query.ilike('usuario', `%${usuario}%`);
  if (accion) query = query.eq('accion', accion);

  try {
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ auditoria: mapToUpper(data) });
  } catch (err) {
    console.error('Error obteniendo auditoría de stock:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
