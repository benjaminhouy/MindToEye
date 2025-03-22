// Script to test connectivity to Supabase PostgreSQL database
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function testConnection() {
  // Check if SUPABASE_DB_URL is available
  if (!process.env.SUPABASE_DB_URL) {
    console.error('Error: SUPABASE_DB_URL environment variable is not set');
    process.exit(1);
  }

  console.log('SUPABASE_DB_URL is defined. Attempting to connect to Supabase PostgreSQL...');
  
  // Create a connection pool to Supabase
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: {
      require: true,
    }
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Successfully connected to the Supabase PostgreSQL database');
    
    // Check for the existence of tables
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    `;
    
    const result = await client.query(tableQuery);
    console.log('\nTables in the database:');
    
    if (result.rows.length === 0) {
      console.log('No tables found. Database appears to be empty.');
    } else {
      result.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }
    
    // Check for specific tables
    const requiredTables = ['users', 'projects', 'brand_concepts'];
    const missingTables = requiredTables.filter(
      table => !result.rows.some(row => row.table_name === table)
    );
    
    if (missingTables.length > 0) {
      console.log('\n⚠️ Missing required tables:');
      missingTables.forEach(table => {
        console.log(`- ${table}`);
      });
      console.log('\nYou may need to run the database setup script to create these tables.');
    } else {
      console.log('\n✅ All required tables are present in the database.');
    }
    
    // Sample query to check structure of users table
    try {
      const sampleUser = await client.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'users\'');
      console.log('\nStructure of users table:');
      sampleUser.rows.forEach(column => {
        console.log(`- ${column.column_name}: ${column.data_type}`);
      });
    } catch (error) {
      console.error('Could not query users table structure:', error.message);
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Error connecting to Supabase database:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\nTroubleshooting tips:');
      console.log('1. Ensure the SUPABASE_DB_URL contains the correct username and password');
      console.log('2. Check if your IP address is allowed in Supabase network configuration');
    }
  } finally {
    await pool.end();
    console.log('\nDatabase connection pool closed');
  }
}

testConnection();