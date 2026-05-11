// app/api/auth/me/route.js
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return NextResponse.json({ user: payload });
}
