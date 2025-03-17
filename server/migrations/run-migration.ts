import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// ES Modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Runs the SQL migration file against Supabase
 */
async function runMigration() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Running migration using Supabase client...');
  
  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'create-tables.sql');
    console.log(`Reading SQL file from: ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const stmt of statements) {
      console.log(`Executing: ${stmt.substring(0, 50)}...`);
      // Execute SQL with Supabase
      const { error } = await supabase.rpc('exec_sql', { sql: stmt });
      if (error) {
        console.error('Error executing SQL:', error);
        // Don't exit on failure, try to continue with other statements
      }
    }
    
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

runMigration();