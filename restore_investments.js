const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
  const orgId = '11111111-1111-1111-1111-111111111111';
  
  const { data, error } = await supabase.from('investments').select('*').eq('org_id', orgId);
  console.log('Error:', error);
  console.log('Data:', data);
  if (!data || data.length === 0) {
    console.log('Restoring investments...');
    const res = await supabase.from('investments').insert([
      { org_id: orgId, name: 'Corto Plazo', rate: 5.5, min_amount: 500, max_amount: 10000, min_period: 1, max_period: 11 },
      { org_id: orgId, name: 'Largo Plazo', rate: 8.2, min_amount: 10000, max_amount: 1000000, min_period: 12, max_period: 120 },
      { org_id: orgId, name: 'Ahora Flex', rate: 4.0, min_amount: 100, max_amount: 50000, min_period: 1, max_period: 36 }
    ]);
    console.log('Insert Result:', res);
  }
}

run();
