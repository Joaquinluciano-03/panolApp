import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { mapToUpper } from '@/lib/utils';

const PROTECTED_EMAIL = 'panol@donorionevictoria.com.ar';

export async function GET(request) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const rol = searchParams.get('rol');

  // Excluir password_hash desde la consulta (nunca viaja por la red)
  let query = supabase.from('usuarios')
    .select('id, nombre, apellido, email, rol, activo, fecha_creacion, ultimo_acceso, modificado_por')
    .order('apellido', { ascending: true });

  if (rol) query = query.eq('rol', rol);
  if (q) query = query.or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%,email.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ usuarios: mapToUpper(data) });
}

export async function POST(request) {
  return NextResponse.json({ error: 'La creación manual de usuarios está deshabilitada. Los usuarios deben ingresar con su cuenta de Google @donorionevictoria.com.ar para registrarse automáticamente.' }, { status: 405 });
}

export async function DELETE(request) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Una sola consulta con COUNT para confirmar antes de borrar
  const { data: toDelete, error: selectErr } = await supabase
    .from('usuarios')
    .select('id')
    .neq('rol', 'ADMIN')
    .neq('email', PROTECTED_EMAIL);

  if (selectErr) return NextResponse.json({ error: selectErr.message }, { status: 500 });

  if (toDelete.length > 0) {
    const ids = toDelete.map(u => u.id);
    const { error: deleteErr } = await supabase.from('usuarios').delete().in('id', ids);
    if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, eliminados: toDelete.length });
}
