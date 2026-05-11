// lib/auth.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const SECRET = process.env.JWT_SECRET || 'changeme_in_env';

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '8h' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/** Extrae el token del header Authorization: Bearer <token> */
export function extractToken(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  return null;
}

/** Middleware helper — devuelve null si no autenticado o el payload */
export function requireAuth(request) {
  const token = extractToken(request);
  if (!token) return null;
  return verifyToken(token);
}

/** Middleware helper — requiere rol ADMIN */
export function requireAdmin(request) {
  const payload = requireAuth(request);
  if (!payload) return null;
  if (payload.rol !== 'ADMIN') return null;
  return payload;
}
