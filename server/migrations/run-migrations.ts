import { supabase } from '../supabase';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Runs the SQL migration file against Supabase
 */
async function runMigration() {
  if (!supabase) {
    console.error('Supabase client not initialized. Cannot run migrations.');
    console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    process.exit(1);
  }

  try {
    const migrationFilePath = path.join(__dirname, 'init.sql');
    const migrationSQL = readFileSync(migrationFilePath, 'utf8');
    
    console.log('Running database migrations...');
    
    // Create users table
    console.log('Creating users table...');
    const { error: usersError } = await supabase.schema.createTable('users', {
      id: 'serial primary key',
      username: 'text not null unique',
      password: 'text not null',
      created_at: 'timestamp with time zone default now()'
    });
    
    if (usersError) {
      console.error('Error creating users table:', usersError);
      process.exit(1);
    }

    // Create projects table
    console.log('Creating projects table...');
    const { error: projectsError } = await supabase.schema.createTable('projects', {
      id: 'serial primary key',
      name: 'text not null',
      client_name: 'text',
      user_id: 'integer references users(id) on delete cascade',
      created_at: 'timestamp with time zone default now()'
    });
    
    if (projectsError) {
      console.error('Error creating projects table:', projectsError);
      process.exit(1);
    }

    // Create brand_concepts table
    console.log('Creating brand_concepts table...');
    const { error: conceptsError } = await supabase.schema.createTable('brand_concepts', {
      id: 'serial primary key',
      project_id: 'integer references projects(id) on delete cascade',
      name: 'text not null',
      is_active: 'boolean default false',
      brand_inputs: 'jsonb not null',
      brand_output: 'jsonb',
      created_at: 'timestamp with time zone default now()'
    });
    
    if (conceptsError) {
      console.error('Error creating brand_concepts table:', conceptsError);
      process.exit(1);
    }

    // Create indexes
    console.log('Creating indexes...');
    const createIndex = async (tableName: string, columnName: string) => {
      const { error } = await supabase.schema.raw(`
        CREATE INDEX IF NOT EXISTS idx_${tableName}_${columnName}
        ON ${tableName}(${columnName})
      `);
      if (error) {
        console.error(`Error creating index on ${tableName}.${columnName}:`, error);
        process.exit(1);
      }
    };

    await createIndex('projects', 'user_id');
    await createIndex('brand_concepts', 'project_id');
    await createIndex('brand_concepts', 'is_active');

    // Insert demo data
    console.log('Inserting demo data...');
    
    // Create demo user
    const { data: demoUser, error: demoUserError } = await supabase
      .from('users')
      .upsert({ username: 'demo', password: 'demo123' })
      .select()
      .single();

    if (demoUserError) {
      console.error('Error creating demo user:', demoUserError);
      process.exit(1);
    }

    // Create demo projects
    const projects = [
      {
        name: 'Solystra',
        client_name: 'Sample Client',
        user_id: demoUser.id
      },
      {
        name: 'NexGen Fintech',
        client_name: 'Financial Innovations Inc.',
        user_id: demoUser.id
      }
    ];

    const { data: createdProjects, error: projectsInsertError } = await supabase
      .from('projects')
      .upsert(projects)
      .select();

    if (projectsInsertError) {
      console.error('Error creating demo projects:', projectsInsertError);
      process.exit(1);
    }

    // Create demo brand concepts
    const solystraConcept = {
      project_id: createdProjects[0].id,
      name: 'Initial Concept',
      is_active: true,
      brand_inputs: {
        brandName: 'Solystra',
        industry: 'Renewable Energy',
        description: 'A cutting-edge renewable energy company focused on solar solutions',
        values: [
          { id: '1', value: 'Sustainability' },
          { id: '2', value: 'Innovation' },
          { id: '3', value: 'Reliability' }
        ],
        designStyle: 'modern',
        colorPreferences: ['blue', 'orange', 'white']
      },
      brand_output: {
        logo: {
          primary: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="80" fill="#1E40AF"/><path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z" fill="#F97316"/><circle cx="100" cy="100" r="30" fill="#FFFFFF"/></svg>',
          monochrome: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="80" fill="#333333"/><path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z" fill="#666666"/><circle cx="100" cy="100" r="30" fill="#FFFFFF"/></svg>',
          reverse: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="80" fill="#FFFFFF"/><path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z" fill="#FFFFFF"/><circle cx="100" cy="100" r="30" fill="#1E40AF"/></svg>'
        },
        colors: [
          { name: 'Primary Blue', hex: '#1E40AF', type: 'primary' },
          { name: 'Energy Orange', hex: '#F97316', type: 'secondary' },
          { name: 'Pure White', hex: '#FFFFFF', type: 'accent' },
          { name: 'Deep Navy', hex: '#0F172A', type: 'base' }
        ],
        typography: {
          headings: 'Montserrat',
          body: 'Open Sans'
        },
        logoDescription: 'A modern and bold logo representing solar energy and innovation',
        tagline: 'Powering Tomorrow\'s World',
        contactName: 'Alex Rivera',
        contactTitle: 'Chief Innovation Officer',
        contactPhone: '+1 (415) 555-8729',
        address: '123 Solar Way, San Francisco, CA 94110',
        mockups: []
      }
    };

    const nexgenConcept = {
      project_id: createdProjects[1].id,
      name: 'Financial Tech Concept',
      is_active: true,
      brand_inputs: {
        brandName: 'NexGen Fintech',
        industry: 'Financial Technology',
        description: 'A revolutionary fintech platform that simplifies banking and investments',
        values: [
          { id: '1', value: 'Security' },
          { id: '2', value: 'Innovation' },
          { id: '3', value: 'Accessibility' },
          { id: '4', value: 'Transparency' }
        ],
        designStyle: 'minimalist',
        colorPreferences: ['navy', 'gold', 'teal']
      },
      brand_output: {
        logo: {
          primary: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect x="40" y="40" width="120" height="120" fill="#0A2342" rx="10" ry="10"/><path d="M75 80L100 60L125 80L125 120L75 120L75 80Z" fill="#E8C547"/><path d="M85 100L115 100" stroke="#20A39E" stroke-width="6" stroke-linecap="round"/><path d="M85 110L105 110" stroke="#20A39E" stroke-width="6" stroke-linecap="round"/></svg>',
          monochrome: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><filter id="grayscale"><feColorMatrix type="matrix" values="0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0"/></filter><rect x="40" y="40" width="120" height="120" fill="#333333" rx="10" ry="10"/><path d="M75 80L100 60L125 80L125 120L75 120L75 80Z" fill="#666666"/><path d="M85 100L115 100" stroke="#999999" stroke-width="6" stroke-linecap="round"/><path d="M85 110L105 110" stroke="#999999" stroke-width="6" stroke-linecap="round"/></svg>',
          reverse: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="#111111"/><rect x="40" y="40" width="120" height="120" fill="#FFFFFF" rx="10" ry="10"/><path d="M75 80L100 60L125 80L125 120L75 120L75 80Z" fill="#111111"/><path d="M85 100L115 100" stroke="#444444" stroke-width="6" stroke-linecap="round"/><path d="M85 110L105 110" stroke="#444444" stroke-width="6" stroke-linecap="round"/></svg>'
        },
        colors: [
          { name: 'Navy Blue', hex: '#0A2342', type: 'primary' },
          { name: 'Gold', hex: '#E8C547', type: 'secondary' },
          { name: 'Teal', hex: '#20A39E', type: 'accent' },
          { name: 'Charcoal', hex: '#222222', type: 'base' }
        ],
        typography: {
          headings: 'Poppins',
          body: 'Roboto'
        },
        logoDescription: 'A minimalist logo representing security and financial growth',
        tagline: 'Banking for the Digital Age',
        contactName: 'Jordan Chen',
        contactTitle: 'Director of Client Relations',
        contactPhone: '+1 (415) 555-2390',
        address: '485 Financial District Ave, San Francisco, CA 94104',
        mockups: []
      }
    };

    const { error: conceptsInsertError } = await supabase
      .from('brand_concepts')
      .upsert([solystraConcept, nexgenConcept]);

    if (conceptsInsertError) {
      console.error('Error creating demo brand concepts:', conceptsInsertError);
      process.exit(1);
    }
    
    console.log('✅ Database migrations completed successfully');
    
  } catch (err) {
    console.error('Failed to run migrations:', err);
    process.exit(1);
  }
}

// Run the migration
runMigration();