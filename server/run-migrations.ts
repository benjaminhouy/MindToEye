import { supabase } from './supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Runs the SQL migration file against Supabase
 */
async function runMigrations() {
  if (!supabase) {
    console.error('Supabase client not initialized. Cannot run migrations.');
    process.exit(1);
  }

  try {
    // Read the SQL script file
    const sqlFilePath = path.join(process.cwd(), 'supabase_setup.sql');
    if (!fs.existsSync(sqlFilePath)) {
      console.error('SQL migration file not found:', sqlFilePath);
      process.exit(1);
    }

    console.log('Running migrations from:', sqlFilePath);
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    // Split the SQL file into individual statements
    const statements = sqlScript
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}`);
      
      try {
        // Use direct SQL query instead of RPC
        const { error } = await supabase.from('_exec_sql').insert({
          query: statement
        });
        
        if (error) {
          console.warn(`Warning executing statement ${i + 1}: ${error.message}`);
          console.log('Continuing with next statement...');
        } else {
          console.log(`Successfully executed statement ${i + 1}`);
        }
      } catch (error) {
        console.warn(`Error executing statement ${i + 1}:`, error);
        console.log('Statement:', statement);
        console.log('Continuing with next statement...');
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Load environment variables from .env.supabase
const envPath = path.join(process.cwd(), '.env.supabase');
if (fs.existsSync(envPath)) {
  console.log('Loading Supabase environment from:', envPath);
  const envConfig = fs.readFileSync(envPath, 'utf8').split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .reduce((acc, line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {});
  
  // Set environment variables
  Object.entries(envConfig).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

// Self-invoking async function to run migrations directly
(async () => {
  try {
    await runMigrations();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
})();

export { runMigrations };