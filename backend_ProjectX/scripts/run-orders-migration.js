/**
 * Runs the orders table migration via Supabase REST.
 * Usage: node scripts/run-orders-migration.js
 */
const { supabase } = require('../config/supabase');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../migrations/orders_table.sql'),
    'utf8'
  );

  console.log('Running orders table migration…');
  const { error } = await supabase.rpc('exec_sql', { sql }).single().catch(() => ({}));

  // Supabase doesn't expose raw SQL via REST by default.
  // Instead, use the Supabase client to create the table directly.
  try {
    // Check if table exists already
    const { data, error: checkErr } = await supabase
      .from('orders')
      .select('id')
      .limit(1);

    if (!checkErr) {
      console.log('✅ Orders table already exists and is accessible!');
      return;
    }

    console.log('Table does not exist yet. Please run the SQL from migrations/orders_table.sql in your Supabase dashboard.');
    console.log('\nPath: backend_ProjectX/migrations/orders_table.sql');
    console.log('\nGo to: https://supabase.com/dashboard → SQL Editor → Paste and run the file.');
  } catch (err) {
    console.error('Migration check error:', err.message);
  }
}

runMigration();
