// Script to run migrations against Supabase
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
function loadEnvVars() {
  const envPath = path.join(process.cwd(), '.env.supabase');
  if (fs.existsSync(envPath)) {
    console.log('Loading environment variables from:', envPath);
    const envFile = fs.readFileSync(envPath, 'utf8');
    const envVars = envFile
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .reduce((acc, line) => {
        const [key, value] = line.split('=');
        if (key && value) {
          acc[key.trim()] = value.trim();
          process.env[key.trim()] = value.trim();
        }
        return acc;
      }, {});
    
    console.log('Loaded environment variables:', Object.keys(envVars).join(', '));
  } else {
    console.error('No .env.supabase file found');
  }
}

// Main function to run migrations
async function runMigration() {
  loadEnvVars();
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.supabase');
    process.exit(1);
  }
  
  console.log('Connecting to Supabase at:', supabaseUrl);
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  // SQL script file path
  const sqlFilePath = path.join(process.cwd(), 'supabase_setup.sql');
  
  if (!fs.existsSync(sqlFilePath)) {
    console.error('Migration file not found:', sqlFilePath);
    process.exit(1);
  }
  
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
  // Split SQL content by semicolons, but keep "DO" blocks intact
  const statements = [];
  let currentStatement = '';
  let inDoBlock = false;
  
  sqlContent.split(';').forEach(statement => {
    let trimmed = statement.trim();
    
    if (!trimmed) return;
    
    // Check if we're starting a DO block
    if (trimmed.toUpperCase().startsWith('DO')) {
      inDoBlock = true;
      currentStatement = trimmed + ';';
    } 
    // If we're in a DO block, continue building the statement
    else if (inDoBlock) {
      currentStatement += trimmed + ';';
      
      // Check if the DO block is complete
      if (trimmed.includes('END') && trimmed.includes('$$')) {
        statements.push(currentStatement);
        currentStatement = '';
        inDoBlock = false;
      }
    } 
    // Otherwise, treat as a regular statement
    else {
      statements.push(trimmed + ';');
    }
  });
  
  console.log(`Found ${statements.length} SQL statements to execute`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    
    try {
      // Execute each statement
      const { error } = await supabase.rpc('exec_sql', { query: statement });
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error);
        errorCount++;
      } else {
        console.log(`Successfully executed statement ${i + 1}`);
        successCount++;
      }
    } catch (err) {
      console.error(`Exception executing statement ${i + 1}:`, err);
      errorCount++;
    }
  }
  
  console.log('\nMigration Summary:');
  console.log(`- Total statements: ${statements.length}`);
  console.log(`- Successfully executed: ${successCount}`);
  console.log(`- Failed: ${errorCount}`);
  
  if (errorCount > 0) {
    console.log('\nAlternative method: Please run the SQL manually in the Supabase SQL Editor');
    console.log('SQL Script:');
    console.log(sqlContent);
  }
}

// Run the migration
runMigration().catch(err => {
  console.error('Unexpected error during migration:', err);
  process.exit(1);
});