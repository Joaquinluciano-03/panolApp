import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { mapToUpper } from '@/lib/utils';

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const alumno = searchParams.get('alumno');
  const curso = searchParams.get('curso');
  const fecha_desde = searchParams.get('fecha_desde');
  const fecha_hasta = searchParams.get('fecha_hasta');
  const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);

  // created_at existe en la tabla descuentos → ordenar por él
  let query = supabase.from('descuentos').select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (alumno) query = query.ilike('alumno', `%${alumno}%`);
  if (curso) query = query.eq('curso', curso);
  if (fecha_desde) query = query.gte('created_at', new Date(fecha_desde + 'T00:00:00').toISOString());
  if (fecha_hasta) query = query.lte('created_at', new Date(fecha_hasta + 'T23:59:59').toISOString());

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ descuentos: mapToUpper(data) });
}
