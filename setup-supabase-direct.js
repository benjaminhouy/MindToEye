// Direct script to set up Supabase database through PostgreSQL connection
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

// Get database connection from environment variables
const dbUrl = process.env.DATABASE_URL;

async function setupDatabase() {
  if (!dbUrl) {
    console.error('Error: No database URL provided');
    return;
  }

  console.log('Connecting to database...');
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false // Required for connecting to Supabase
    }
  });

  try {
    // Create users table
    console.log('Creating users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `);
    console.log('Users table created successfully.');

    // Create projects table
    console.log('Creating projects table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        client_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('Projects table created successfully.');

    // Create brand_concepts table
    console.log('Creating brand_concepts table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS brand_concepts (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        brand_inputs JSONB NOT NULL,
        brand_output JSONB NOT NULL,
        is_active BOOLEAN DEFAULT FALSE
      );
    `);
    console.log('Brand concepts table created successfully.');

    // Insert demo user if it doesn't exist
    console.log('Creating demo user...');
    await pool.query(`
      INSERT INTO users (username, password)
      VALUES ('demo', 'password123')
      ON CONFLICT (username) DO NOTHING;
    `);
    console.log('Demo user created or already exists.');

    // Create sample project for demo user
    console.log('Creating sample project...');
    await pool.query(`
      WITH demo_user AS (
        SELECT id FROM users WHERE username = 'demo' LIMIT 1
      )
      INSERT INTO projects (name, client_name, user_id)
      SELECT 'Sample Brand', 'Sample Client', id FROM demo_user
      WHERE NOT EXISTS (
        SELECT 1 FROM projects 
        WHERE name = 'Sample Brand' AND user_id = (SELECT id FROM demo_user)
      );
    `);
    console.log('Sample project created or already exists.');

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase();