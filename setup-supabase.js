/**
 * This script manually creates tables in Supabase using the REST API
 * Run it with: node setup-supabase.js
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  try {
    console.log('Creating tables in Supabase...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'server', 'supabase-tables.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('ERROR: SQL file not found:', sqlFilePath);
      process.exit(1);
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute SQL to create tables
    // Note: This requires the 'pg_dump' extension to be enabled in your Supabase project
    console.log('Executing SQL to create tables...');
    
    // If your Supabase project has the SQL API RPC function set up:
    const { error } = await supabase.rpc('execute_sql', {
      sql: sqlContent
    });
    
    if (error) {
      console.error('ERROR executing SQL:', error.message);
      console.log('\nManual Instructions:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of server/supabase-tables.sql');
      console.log('4. Run the SQL script manually');
      
      // Also print out the SQL content for easier copying
      console.log('\nSQL Content to copy:');
      console.log('===================');
      console.log(sqlContent);
      console.log('===================');
    } else {
      console.log('Tables created successfully!');
    }
  } catch (error) {
    console.error('ERROR:', error);
  }
}

// Run the function
createTables();