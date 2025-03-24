// Execute the isDemo field migration
import { spawnSync } from 'child_process';

// Run the migration script using tsx
const result = spawnSync('node_modules/.bin/tsx', ['server/db-migrate-isDemo.ts'], { 
  stdio: 'inherit',
  shell: true
});

if (result.error) {
  console.error('Error executing migration script:', result.error);
  process.exit(1);
}

if (result.status !== 0) {
  console.error('Migration script exited with code:', result.status);
  process.exit(result.status);
}

console.log('Migration completed successfully!');