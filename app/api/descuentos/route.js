import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { mapToUpper } from '@/lib/utils';

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { data, error } = await supabase.from('descuentos').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ descuentos: mapToUpper(data) });
  } catch (err) {
    console.error('Error fetching descuentos:', err);
    return NextResponse.json({ error: 'Error al cargar descuentos' }, { status: 500 });
  }
}
