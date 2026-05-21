import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { generateId, mapToUpper } from '@/lib/utils';

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  // Seleccionar solo columnas necesarias, ordenar en BD
  let query = supabase.from('materias')
    .select('id, nombre, curso, activo, modificado_por')
    .eq('activo', 'TRUE')
    .order('nombre', { ascending: true });

  // Búsqueda en BD
  if (q) query = query.or(`nombre.ilike.%${q}%,curso.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ materias: mapToUpper(data) });
}

export async function POST(request) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { nombre, curso } = await request.json();
  if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

  const { error } = await supabase.from('materias').insert({
    id: generateId(),
    nombre,
    curso: curso || '',
    activo: 'TRUE',
    modificado_por: payload.email
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
