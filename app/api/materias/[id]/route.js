import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const updates = { modificado_por: payload.email };
  if (body.nombre !== undefined) updates.nombre = body.nombre;
  if (body.curso !== undefined) updates.curso = body.curso;
  if (body.activo !== undefined) updates.activo = body.activo ? 'TRUE' : 'FALSE';

  const { error } = await supabase.from('materias').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const { error } = await supabase.from('materias').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
