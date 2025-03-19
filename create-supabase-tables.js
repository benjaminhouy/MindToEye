// Script to create tables in Supabase database
import dotenv from 'dotenv';
import fs from 'fs';
import pg from 'pg';

dotenv.config({ path: '.env.supabase' });
const { Client } = pg;

async function createTables() {
  // Use the SUPABASE_DB_URL environment variable
  const dbUrl = process.env.SUPABASE_DB_URL;
  
  if (!dbUrl) {
    console.error('Error: SUPABASE_DB_URL environment variable is not set');
    process.exit(1);
  }
  
  console.log('Connecting to Supabase PostgreSQL database...');
  
  const client = new Client({
    connectionString: dbUrl,
  });
  
  try {
    await client.connect();
    console.log('Successfully connected to the database');
    
    // Read the SQL file
    const sqlFile = fs.readFileSync('./supabase_tables.sql', 'utf8');
    console.log('SQL file read successfully');
    
    // Execute the SQL statements
    console.log('Executing SQL statements...');
    await client.query(sqlFile);
    
    console.log('Tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

createTables();