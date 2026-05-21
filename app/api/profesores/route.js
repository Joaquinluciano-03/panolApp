import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { generateId, mapToUpper } from '@/lib/utils';

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  // Seleccionar solo columnas necesarias, ordenar por apellido en BD
  let query = supabase.from('profesores')
    .select('id, nombre, apellido, materias, activo, modificado_por')
    .eq('activo', 'TRUE')
    .order('apellido', { ascending: true });

  // Búsqueda de texto en BD, no en JS
  if (q) query = query.or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%,materias.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profesores: mapToUpper(data) });
}

export async function POST(request) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { nombre, apellido, materias } = await request.json();
  if (!nombre || !apellido) return NextResponse.json({ error: 'Nombre y apellido requeridos' }, { status: 400 });

  const { error } = await supabase.from('profesores').insert({
    id: generateId(),
    nombre,
    apellido,
    materias: materias || '',
    activo: 'TRUE',
    modificado_por: payload.email
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
