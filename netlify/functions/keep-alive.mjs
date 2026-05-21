import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function(request, context) {
  console.log("⏰ Ejecutando keep-alive para mantener Supabase despierto...");
  
  try {
    const { error } = await supabase.from('inventario').select('id').limit(1);
    
    if (error) {
      console.error("❌ Error al despertar la base:", error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    
    console.log("✅ Supabase fue despertado exitosamente.");
    return new Response(JSON.stringify({ message: "Ping exitoso", timestamp: new Date().toISOString() }), { status: 200 });
  } catch (err) {
    console.error("❌ Excepción:", err);
    return new Response(JSON.stringify({ error: "Error de ejecución" }), { status: 500 });
  }
}

// La schedule se define acá en el config estático (API moderna de Netlify)
// "0 0 */6 * *" = cada 6 días a medianoche
export const config = {
  schedule: "0 0 */6 * *",
};
