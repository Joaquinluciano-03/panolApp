// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import {
  getSheetValues, rowsToObjects, appendRow, nowAR, formatDate, formatTime,
  generateId, SHEETS,
} from '@/lib/sheets';
import { comparePassword, hashPassword, signToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
    }

    const rows = await getSheetValues(SHEETS.USUARIOS);
    let usuarios = rowsToObjects(rows);

    // Si no hay usuarios, crear admin por defecto
    if (usuarios.length === 0) {
      const hash = await hashPassword('Admin1234');
      const now = nowAR();
      const defaultAdmin = [
        generateId(), 'Admin', 'Sistema', 'admin@panol.com',
        hash, 'ADMIN', 'TRUE', formatDate(now), '',
      ];
      await appendRow(SHEETS.USUARIOS, defaultAdmin);
      // Recargamos
      const rows2 = await getSheetValues(SHEETS.USUARIOS);
      usuarios = rowsToObjects(rows2);
    }

    const usuario = usuarios.find(
      (u) => u.EMAIL?.toLowerCase() === email.toLowerCase() && u.ACTIVO === 'TRUE'
    );

    if (!usuario) {
      return NextResponse.json({ error: 'Credenciales inválidas o usuario inactivo' }, { status: 401 });
    }

    const valid = await comparePassword(password, usuario.PASSWORD_HASH);
    if (!valid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Actualizar ULTIMO_ACCESO
    const dataIndex = usuarios.findIndex((u) => u.ID === usuario.ID);
    const now = nowAR();
    const allCols = rows[0]; // headers
    const updatedRow = allCols.map((col) => {
      if (col === 'ULTIMO_ACCESO') return `${formatDate(now)} ${formatTime(now)}`;
      return usuario[col] ?? '';
    });
    await import('@/lib/sheets').then(async (m) => {
      await m.updateRow(SHEETS.USUARIOS, dataIndex, updatedRow);
    });

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
      defaultAdmin: usuarios.length === 1 && email === 'admin@panol.com',
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
