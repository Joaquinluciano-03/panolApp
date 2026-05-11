// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import {
  getSheetValues, rowsToObjects, appendRow, updateRow, nowAR, formatDate, formatTime,
  generateId, SHEETS,
} from '@/lib/sheets';
import { signToken } from '@/lib/auth';

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

    const rows = await getSheetValues(SHEETS.USUARIOS);
    const usuarios = rowsToObjects(rows);
    let usuario = usuarios.find((u) => u.EMAIL?.toLowerCase() === email.toLowerCase());

    const isPanolAdmin = email.toLowerCase() === 'panol@donorionevictoria.com.ar';
    const assignedRole = isPanolAdmin ? 'ADMIN' : 'PAÑOLERO';
    const now = nowAR();

    if (!usuario) {
      // Create new user
      usuario = {
        ID: generateId(),
        NOMBRE: given_name || '',
        APELLIDO: family_name || '',
        EMAIL: email,
        ROL: assignedRole,
        ACTIVO: 'TRUE',
        FECHA_CREACION: formatDate(now),
        ULTIMO_ACCESO: `${formatDate(now)} ${formatTime(now)}`,
        MODIFICADO_POR: email,
      };
      const newRow = [
        usuario.ID, usuario.NOMBRE, usuario.APELLIDO, usuario.EMAIL,
        usuario.ROL, usuario.ACTIVO, usuario.FECHA_CREACION, usuario.ULTIMO_ACCESO, usuario.MODIFICADO_POR
      ];
      await appendRow(SHEETS.USUARIOS, newRow);
    } else {
      if (usuario.ACTIVO !== 'TRUE') {
        return NextResponse.json({ error: 'Usuario inactivo' }, { status: 403 });
      }
      
      // Update ULTIMO_ACCESO and enforce role
      usuario.ROL = assignedRole;
      usuario.ULTIMO_ACCESO = `${formatDate(now)} ${formatTime(now)}`;
      usuario.MODIFICADO_POR = email;
      
      const dataIndex = usuarios.findIndex((u) => u.ID === usuario.ID);
      const allCols = rows[0]; // headers
      const updatedRow = allCols.map((col) => {
        if (col === 'ROL') return assignedRole;
        if (col === 'ULTIMO_ACCESO') return usuario.ULTIMO_ACCESO;
        if (col === 'MODIFICADO_POR') return email;
        return usuario[col] ?? '';
      });
      await updateRow(SHEETS.USUARIOS, dataIndex, updatedRow);
    }

    const token = signToken({
      id: usuario.ID,
      nombre: usuario.NOMBRE,
      apellido: usuario.APELLIDO,
      email: usuario.EMAIL,
      rol: usuario.ROL,
    });

    return NextResponse.json({
      token,
      user: {
        id: usuario.ID,
        nombre: usuario.NOMBRE,
        apellido: usuario.APELLIDO,
        email: usuario.EMAIL,
        rol: usuario.ROL,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Error interno del servidor o token inválido' }, { status: 500 });
  }
}
