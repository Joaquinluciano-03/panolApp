import { NextResponse } from 'next/server';
import { checkAndInitDb } from '@/lib/sheets';

export async function GET() {
  try {
    await checkAndInitDb();
    return NextResponse.json({ success: true, message: 'Base de datos inicializada correctamente.' });
  } catch (error) {
    console.error('Error init db:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
