// Script to create tables in Replit's PostgreSQL database using PG* environment variables
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function createTables() {
  // Check for required environment variables
  const requiredVars = ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  console.log('PostgreSQL environment variables found. Attempting to connect...');
  
  // Create a connection pool using individual environment variables
  const pool = new Pool({
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: {
      rejectUnauthorized: false // Required for some cloud database services
    }
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log('Successfully connected to the PostgreSQL database');
    
    // Create tables directly
    console.log('Creating tables...');
    
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `);
    console.log('Users table created');
    
    // Projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        client_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        user_id INTEGER NOT NULL,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);
    console.log('Projects table created');
    
    // Brand concepts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS brand_concepts (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        brand_inputs JSONB NOT NULL,
        brand_output JSONB NOT NULL,
        is_active BOOLEAN DEFAULT FALSE,
        CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      );
    `);
    console.log('Brand concepts table created');
    
    // Insert a test user
    const testUser = await client.query(`
      INSERT INTO users (username, password)
      VALUES ('testuser', 'password123')
      ON CONFLICT (username) DO NOTHING
      RETURNING id;
    `);
    
    if (testUser.rows.length > 0) {
      console.log('Test user created with ID:', testUser.rows[0].id);
      
      // Insert a sample project
      const testProject = await client.query(`
        INSERT INTO projects (name, client_name, user_id)
        VALUES ('Sample Project', 'Test Client', $1)
        RETURNING id;
      `, [testUser.rows[0].id]);
      
      console.log('Sample project created with ID:', testProject.rows[0].id);
    } else {
      console.log('Test user already exists');
    }
    
    console.log('Database setup completed successfully');
    client.release();
  } catch (error) {
    console.error('Error setting up database:', error.message);
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
}

createTables();