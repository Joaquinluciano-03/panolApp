import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Creamos un cliente directo de Supabase usando variables de entorno que ya existen
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const handler = async function(event, context) {
  console.log("⏰ Ejecutando cron job para mantener Supabase despierto...");
  
  try {
    // Consulta mínima (un select de 1 sola fila sin devolver datos pesados)
    const { data, error } = await supabase.from('inventario').select('id').limit(1);
    
    if (error) {
      console.error("❌ Error al despertar la base:", error.message);
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
    
    console.log("✅ Supabase fue despertado exitosamente.");
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Ping exitoso" })
    };
  } catch (err) {
    console.error("❌ Excepción:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Error de ejecución" }) };
  }
};

// "0 0 */6 * *" significa: a las 00:00, cada 6 días.
export const handlerFunc = schedule("0 0 */6 * *", handler);
// Exportamos default para que Netlify lo agarre correctamente.
export default handlerFunc;
