import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { mapToUpper } from '@/lib/utils';

const PROTECTED_EMAIL = 'panol@donorionevictoria.com.ar';

export async function GET(request) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabase.from('usuarios').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  // Remove password hashes and uppercase keys
  const usuarios = mapToUpper(data).map(({ PASSWORD_HASH, ...u }) => u);
  return NextResponse.json({ usuarios });
}

export async function POST(request) {
  return NextResponse.json({ error: 'La creación manual de usuarios está deshabilitada. Los usuarios deben ingresar con su cuenta de Google @donorionevictoria.com.ar para registrarse automáticamente.' }, { status: 405 });
}

export async function DELETE(request) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

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
