import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// ES Modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Runs the SQL migration file against Supabase
 */
async function runMigration() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    process.exit(1);
  }

  if (!databaseUrl) {
    console.error('Missing DATABASE_URL environment variable.');
    process.exit(1);
  }

  console.log('Running migration using DATABASE_URL...');
  
  try {
    // Use drizzle-kit to run the migration
    const migrationClient = postgres(databaseUrl, { max: 1 });
    
    // For direct SQL execution:
    const sqlPath = path.join(__dirname, 'create-tables.sql');
    console.log(`Reading SQL file from: ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const stmt of statements) {
      console.log(`Executing: ${stmt.substring(0, 50)}...`);
      await migrationClient.unsafe(stmt);
    }
    
    console.log('Migration completed successfully');
    await migrationClient.end();
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

runMigration();