// Script to test connectivity to PostgreSQL database via pooled connection
import pg from 'pg';
import dotenv from 'dotenv';
import https from 'https';

const { Pool } = pg;

// Load environment variables
dotenv.config();

// Set NODE_TLS_REJECT_UNAUTHORIZED=0 to bypass SSL verification
// This is ONLY for testing purposes, not recommended for production
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log('🔍 Testing PostgreSQL connection');

async function testConnection() {
  // Check if DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('✓ DATABASE_URL is defined');
  console.log('🔌 Attempting to connect to PostgreSQL via pooled connection...');
  
  // Use the pooled connection string
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      require: true,
      rejectUnauthorized: false // Allow self-signed certificates
    }
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Successfully connected to the PostgreSQL database');
    
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
    console.error('❌ Error connecting to database:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\nTroubleshooting tips:');
      console.log('1. Ensure the DATABASE_URL contains the correct username and password');
      console.log('2. Check if your IP address is allowed in database network configuration');
    }
  } finally {
    await pool.end();
    console.log('\nDatabase connection pool closed');
  }
}

testConnection();