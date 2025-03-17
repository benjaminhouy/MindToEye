import { supabase } from '../supabase';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Runs the SQL migration file against Supabase
 */
async function runMigration() {
  if (!supabase) {
    console.error('Supabase client not initialized. Cannot run migrations.');
    console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    process.exit(1);
  }

  try {
    const migrationFilePath = path.join(__dirname, 'init.sql');
    const migrationSQL = readFileSync(migrationFilePath, 'utf8');
    
    console.log('Running database migrations...');
    
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    // Execute each statement
    for (const statement of statements) {
      const { error } = await supabase
        .from('_migrations')
        .select('*')
        .limit(1)
        .then(() => supabase.rpc('exec_sql', { sql: statement }))
        .catch(() => supabase.rpc('exec_sql', { sql: statement }));

      if (error) {
        console.error('Error running migration statement:', error);
        console.error('Failed statement:', statement);
        process.exit(1);
      }
    }
    
    console.log('✅ Database migrations completed successfully');
    
  } catch (err) {
    console.error('Failed to run migrations:', err);
    process.exit(1);
  }
}

// Run the migration
runMigration();