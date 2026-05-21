import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { generateId, mapToUpper } from '@/lib/utils';

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { data, error } = await supabase.from('materias').select('*').eq('activo', 'TRUE');
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
