import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

// Initialize PostgreSQL client for migrations
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set. Cannot run migrations.');
  process.exit(1);
}

// For migrations - disable prepared statements
const migrationClient = postgres(databaseUrl, { 
  ssl: 'require',
  max: 1,
  debug: true
});

async function runMigrations() {
  if (!migrationClient) {
    console.error('Failed to initialize PostgreSQL client. Cannot run migrations.');
    process.exit(1);
  }
  
  try {
    console.log('Running migrations...');
    
    // Get all SQL files from the migrations directory
    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order
    
    console.log(`Found ${files.length} migration files.`);
    
    for (const file of files) {
      console.log(`Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Execute the SQL file
      await migrationClient.unsafe(sql);
      
      console.log(`Migration ${file} completed successfully.`);
    }
    
    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

// Run the migrations
runMigrations();