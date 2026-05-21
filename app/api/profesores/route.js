import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { generateId, mapToUpper } from '@/lib/utils';

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { data, error } = await supabase.from('profesores').select('*').eq('activo', 'TRUE');
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
