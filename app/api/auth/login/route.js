import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { supabase } from '@/lib/supabase';
import { signToken } from '@/lib/auth';
import { nowAR, formatDate, formatTime, generateId } from '@/lib/utils';

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(request) {
  try {
    const { credential } = await request.json();
    if (!credential) {
      return NextResponse.json({ error: 'Credencial de Google requerida' }, { status: 400 });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, given_name, family_name } = payload;

    if (!email.endsWith('@donorionevictoria.com.ar')) {
      return NextResponse.json({ error: 'Solo se permiten correos @donorionevictoria.com.ar' }, { status: 403 });
    }

    const { data: usuario, error: fetchErr } = await supabase.from('usuarios').select('*').ilike('email', email).maybeSingle();
    if (fetchErr) throw fetchErr;

    const isPanolAdmin = email.toLowerCase() === 'panol@donorionevictoria.com.ar';
    const assignedRole = isPanolAdmin ? 'ADMIN' : (usuario ? usuario.rol : 'ESTUDIANTE');
    const now = nowAR();
    const ultimo_acceso = `${formatDate(now)} ${formatTime(now)}`;

    let finalUser = usuario;

    if (!usuario) {
      finalUser = {
        id: generateId(),
        nombre: given_name || '',
        apellido: family_name || '',
        email,
        rol: assignedRole,
        activo: 'TRUE',
        fecha_creacion: formatDate(now),
        ultimo_acceso,
        modificado_por: email,
      };
      const { error: insertErr } = await supabase.from('usuarios').insert(finalUser);
      if (insertErr) throw insertErr;
    } else {
      if (usuario.activo !== 'TRUE') {
        return NextResponse.json({ error: 'Usuario inactivo' }, { status: 403 });
      }
      
      finalUser.rol = assignedRole;
      finalUser.ultimo_acceso = ultimo_acceso;
      
      const { error: updateErr } = await supabase.from('usuarios').update({
        rol: assignedRole,
        ultimo_acceso,
        modificado_por: email
      }).eq('id', usuario.id);
      if (updateErr) throw updateErr;
    }

    const token = signToken({
      id: finalUser.id,
      nombre: finalUser.nombre,
      apellido: finalUser.apellido,
      email: finalUser.email,
      rol: finalUser.rol,
    });

    return NextResponse.json({
      token,
      user: {
        id: finalUser.id,
        nombre: finalUser.nombre,
        apellido: finalUser.apellido,
        email: finalUser.email,
        rol: finalUser.rol,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Error del servidor: ' + (err.message || 'Desconocido') }, { status: 500 });
  }
}
