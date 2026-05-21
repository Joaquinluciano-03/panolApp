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

  let query = supabase.from('descuentos').select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  // Filtros en SQL
  if (alumno) query = query.ilike('alumno', `%${alumno}%`);
  if (curso) query = query.eq('curso', curso);
  if (fecha_desde) query = query.gte('timestamp', new Date(fecha_desde + 'T00:00:00').toISOString());
  if (fecha_hasta) query = query.lte('timestamp', new Date(fecha_hasta + 'T23:59:59').toISOString());

  try {
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ descuentos: mapToUpper(data) });
  } catch (err) {
    console.error('Error fetching descuentos:', err);
    return NextResponse.json({ error: 'Error al cargar descuentos' }, { status: 500 });
  }
}
