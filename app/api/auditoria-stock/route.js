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
  const fecha_desde = searchParams.get('fecha_desde');
  const fecha_hasta = searchParams.get('fecha_hasta');
  const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);

  let query = supabase.from('auditoria_stock').select(
    'id, fecha, hora, item_id, item_nombre, accion, stock_anterior, stock_nuevo, diferencia, usuario, created_at'
  ).order('created_at', { ascending: false }).limit(limit);

  if (item_nombre) query = query.ilike('item_nombre', `%${item_nombre}%`);
  if (usuario) query = query.ilike('usuario', `%${usuario}%`);
  if (accion) query = query.eq('accion', accion);
  if (fecha_desde) query = query.gte('created_at', new Date(fecha_desde + 'T00:00:00').toISOString());
  if (fecha_hasta) query = query.lte('created_at', new Date(fecha_hasta + 'T23:59:59').toISOString());

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ auditoria: mapToUpper(data) });
}
