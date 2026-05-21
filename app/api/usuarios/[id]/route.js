import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';

const PROTECTED_EMAIL = 'panol@donorionevictoria.com.ar';

export async function PUT(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const { data: usuario, error: fetchErr } = await supabase.from('usuarios').select('email').eq('id', id).single();
  if (fetchErr || !usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  if (usuario.email === PROTECTED_EMAIL) {
    return NextResponse.json({ error: 'Este usuario del sistema no puede ser modificado' }, { status: 403 });
  }

  const updates = { modificado_por: payload.email };
  if (body.rol !== undefined) updates.rol = body.rol;

  const { error } = await supabase.from('usuarios').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  if (payload.id === id) {
    return NextResponse.json({ error: 'No podés eliminarte a vos mismo' }, { status: 400 });
  }

  const { data: usuario, error: fetchErr } = await supabase.from('usuarios').select('email').eq('id', id).single();
  if (fetchErr || !usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  if (usuario.email === PROTECTED_EMAIL) {
    return NextResponse.json({ error: 'Este usuario del sistema no puede ser eliminado' }, { status: 403 });
  }

  const { error } = await supabase.from('usuarios').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
