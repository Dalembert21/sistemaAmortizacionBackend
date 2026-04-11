const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

const supabase = createClient(url, key);

async function testConnection() {
  console.log("Probando conexión a:", url);
  
  // Test if table 'organizations' exists by selecting from it
  const { data, error } = await supabase.from('organizations').select('*').limit(1);
  
  if (error) {
    console.error("❌ Error conectando a las tablas:", error.message);
    if (error.code === '42P01') {
      console.log("-> ⚠️ ALERTA: La tabla 'organizations' no existe. Significa que aún no corriste el código en el SQL Editor de Supabase.");
    }
  } else {
    console.log("✅ Conexión perfecta! Supabase está enlazado correctamente y las tablas existen.");
    console.log("-> Datos recibidos:", data);
  }
}

testConnection();
