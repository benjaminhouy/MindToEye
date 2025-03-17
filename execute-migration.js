// Script to run migration SQL on local PostgreSQL
import fs from 'fs';
import { spawn } from 'child_process';

function runMigration() {
  console.log('Running migration on local PostgreSQL database...');
  
  const sqlFilePath = './supabase_setup.sql';
  
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`SQL file not found: ${sqlFilePath}`);
    process.exit(1);
  }
  
  // Get SQL content
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
  // Run psql command
  const psql = spawn('psql', [
    process.env.DATABASE_URL || '',
    '-f', sqlFilePath
  ]);
  
  psql.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });
  
  psql.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });
  
  psql.on('close', (code) => {
    if (code === 0) {
      console.log('Migration completed successfully!');
    } else {
      console.error(`Migration failed with code ${code}`);
    }
  });
}

// Run the migration
runMigration();