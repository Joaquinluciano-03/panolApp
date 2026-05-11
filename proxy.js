// proxy.js — protege rutas del dashboard (Next.js 16 file convention)
import { NextResponse } from 'next/server';

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Solo proteger rutas /dashboard y sub-rutas
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('panol_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
