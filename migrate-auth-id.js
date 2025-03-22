// Migration script to add auth_id column to users table
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Initialize environment variables
dotenv.config();

const { Pool } = pg;

// Make sure DATABASE_URL is set
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function runMigration() {
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connected to database...');
    console.log('Adding auth_id column to users table...');

    const client = await pool.connect();

    try {
      // Start a transaction
      await client.query('BEGIN');

      // Check if column already exists
      const checkResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'auth_id'
      `);

      if (checkResult.rows.length === 0) {
        // Add the auth_id column if it doesn't exist
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN auth_id TEXT UNIQUE
        `);
        console.log('✅ Column auth_id added successfully to users table');
      } else {
        console.log('Column auth_id already exists, skipping...');
      }

      // Commit the transaction
      await client.query('COMMIT');
      console.log('Migration completed successfully');
    } catch (err) {
      // Rollback the transaction on error
      await client.query('ROLLBACK');
      console.error('Migration failed:', err);
      throw err;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    // End the pool
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error);