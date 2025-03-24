/**
 * Migration script to add isDemo field to users table
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '@shared/schema';
import { boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

async function addIsDemoFieldToUsersTable() {
  console.log('Running migration: Add isDemo field to users table');
  
  // Get the database connection string from the environment variable
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  // Create a client for migration
  const migrationClient = postgres(connectionString, { max: 1 });
  
  try {
    console.log('Connected to database, checking if isDemo column exists...');
    
    // Check if the column already exists
    const checkResult = await migrationClient`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'is_demo'
    `;
    
    if (checkResult.length > 0) {
      console.log('The is_demo column already exists in the users table');
      return;
    }
    
    // Add the isDemo column to the users table
    console.log('Adding is_demo column to users table...');
    await migrationClient`
      ALTER TABLE users 
      ADD COLUMN is_demo BOOLEAN DEFAULT false
    `;
    
    console.log('Migration complete: Added isDemo field to users table');
    
    // Set existing demo users (with demo- prefix in auth_id) as demo users
    console.log('Updating existing demo users...');
    await migrationClient`
      UPDATE users 
      SET is_demo = true 
      WHERE auth_id LIKE 'demo-%'
    `;
    
    console.log('Demo users updated successfully');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
    console.log('Database connection closed');
  }
}

// Run the migration immediately when this script is imported
addIsDemoFieldToUsersTable().catch(console.error);

export { addIsDemoFieldToUsersTable };