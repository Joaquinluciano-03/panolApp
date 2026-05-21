import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Ruta pública para evitar que Supabase se pause por inactividad
// Se puede llamar usando un servicio como cron-job.org
export async function GET() {
  try {
    // Hacemos una consulta súper liviana para despertar a la base de datos
    const { error } = await supabase.from('inventario').select('id').limit(1);
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Ping exitoso. La base de datos está despierta.',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Error de servidor' }, { status: 500 });
  }
}
