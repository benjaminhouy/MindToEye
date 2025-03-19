import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { IStorage } from './storage';
import { User, InsertUser, Project, InsertProject, BrandConcept, InsertBrandConcept } from '@shared/schema';
import * as dotenv from 'dotenv';

// Define Supabase database schema
type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: InsertUser;
      };
      projects: {
        Row: Project;
        Insert: {
          name: string;
          client_name: string | null;
          user_id: number;
          created_at: string;
        };
      };
      brand_concepts: {
        Row: BrandConcept;
        Insert: {
          project_id: number;
          name: string;
          brand_inputs: any;
          brand_output: any;
          is_active: boolean;
          created_at: string;
        };
      };
    };
  };
};

// No longer loading Supabase environment variables
// Using local PostgreSQL database instead

// Helper function for debugging Supabase errors
function logSupabaseError(operation: string, error: any) {
  console.error(`Supabase error during ${operation}:`, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  });
  return error;
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Ensure environment variables are set
if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase URL or key is missing. In-memory storage will be used instead.");
} else {
  console.log("Supabase environment variables loaded successfully");
}

// Create Supabase client with typed database schema
export const supabase: SupabaseClient<Database> | null = supabaseUrl && supabaseKey
  ? createClient<Database>(supabaseUrl, supabaseKey, {
      db: {
        schema: 'public',
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true 
      },
      global: {
        headers: {
          'x-application-name': 'MindToEye'
        },
      },
    })
  : null;

// The database initialization has been moved to init-db.ts

/**
 * Supabase storage implementation for the application
 * This class implements the IStorage interface to provide
 * persistent storage using Supabase
 */
export class SupabaseStorage implements IStorage {
  /**
   * User Operations
   */
  async getUser(id: number): Promise<User | undefined> {
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot get user.');
      return undefined;
    }
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select()
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as User;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot get user by username.');
      return undefined;
    }
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select()
        .eq('username', username)
        .single();
      
      if (error) throw error;
      return data as User;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot create user.');
      throw new Error('Supabase client not initialized');
    }
    
    try {
      const { data, error } = await supabase
        .from('users')
        .insert(user)
        .select()
        .single();
      
      if (error) throw error;
      return data as User;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Project Operations
   */
  async getProjects(userId: number): Promise<Project[]> {
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot get projects.');
      return [];
    }
    
    try {
      console.log('Attempting to get projects for user:', userId);
      // First, check if the projects table exists by getting the schema
      const { data: schemaData, error: schemaError } = await supabase
        .from('projects')
        .select('id')
        .limit(1);
      
      if (schemaError) {
        logSupabaseError('getProjects schema check', schemaError);
        // If table doesn't exist, we need to create it
        if (schemaError.code === '42P01') { // relation does not exist
          console.log('Projects table does not exist. Creating table...');
          await this.createTablesIfNotExist();
        } else {
          throw schemaError;
        }
      }
      
      // Try to get projects again after potentially creating the table
      const { data, error } = await supabase
        .from('projects')
        .select()
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        logSupabaseError('getProjects', error);
        throw error;
      }
      
      console.log('Successfully retrieved projects:', data);
      return data as Project[];
    } catch (error) {
      logSupabaseError('getProjects', error);
      return [];
    }
  }
  
  // Add a method to create tables if they don't exist
  async createTablesIfNotExist(): Promise<void> {
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot create tables.');
      return;
    }
    
    try {
      console.log('Creating tables through Supabase REST API...');
      
      // Try to create the users table using the Supabase REST API
      console.log('Creating users table...');
      const { error: createUsersError } = await supabase
        .from('users')
        .insert({ id: 1, username: 'demo', password: 'demo123' })
        .select()
        .single();
      
      if (createUsersError && createUsersError.code !== '23505') { // Ignore duplicate key error
        if (createUsersError.code === '42P01') { // Table doesn't exist
          console.error('Cannot create users table through API. Tables must be created in Supabase dashboard.');
          console.log('\nPlease create the following tables in Supabase SQL Editor:');
          console.log(`
-- Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- Create Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  client_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  user_id INTEGER NOT NULL,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create Brand Concepts Table
CREATE TABLE IF NOT EXISTS public.brand_concepts (
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
        } else {
          console.error('Error creating users table:', createUsersError);
        }
      } else {
        console.log('Users table exists or was created successfully');
        
        // Try to create some sample projects
        console.log('Creating sample projects...');
        
        // Get demo user id
        const { data: demoUser, error: demoUserError } = await supabase
          .from('users')
          .select('id')
          .eq('username', 'demo')
          .single();
        
        if (!demoUserError && demoUser) {
          // Try to create projects table with sample data
          const sampleProjects = [
            {
              name: 'Eco Threads Rebrand',
              client_name: 'Sustainable Fashion Co.',
              user_id: demoUser.id,
              created_at: new Date().toISOString()
            },
            {
              name: 'TechVision App Launch',
              client_name: 'TechVision Inc.',
              user_id: demoUser.id,
              created_at: new Date().toISOString()
            },
            {
              name: 'Fresh Bites Cafe',
              client_name: 'Healthy Foods LLC',
              user_id: demoUser.id,
              created_at: new Date().toISOString()
            }
          ];
          
          for (const project of sampleProjects) {
            const { error: projectError } = await supabase
              .from('projects')
              .insert(project);
            
            if (projectError && projectError.code === '42P01') {
              console.log('Projects table does not exist. Please create it in Supabase dashboard.');
              break;
            }
          }
        }
      }
      
      // Try to create a sample brand concept to ensure the table exists
      console.log('Checking brand concepts table...');
      const { error: conceptsError } = await supabase
        .from('brand_concepts')
        .select('id')
        .limit(1);
      
      if (conceptsError && conceptsError.code === '42P01') {
        console.log('Brand concepts table does not exist. Please create it in Supabase dashboard.');
      } else {
        console.log('Brand concepts table exists');
      }
      
      console.log('Tables check completed!');
    } catch (error) {
      logSupabaseError('createTablesIfNotExist', error);
      console.error('Failed to check/create tables. Trying individual inserts...');
      await this.insertSampleData();
    }
  }
  
  // If we can't create tables, at least return some sample data
  async insertSampleData(): Promise<void> {
    console.log('Inserting sample data for demonstration...');
    
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot insert sample data.');
      return;
    }
    
    try {
      // Try to insert a demo user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({ id: 1, username: 'demo', password: 'password' })
        .select()
        .single();
      
      if (userError) {
        logSupabaseError('insertSampleData-users', userError);
        console.error('Error inserting demo user.');
        return;
      }
      
      // Try to insert a sample project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .upsert({ 
          id: 1, 
          name: 'Solystra', 
          client_name: 'Sample Client', 
          user_id: 1,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (projectError) {
        logSupabaseError('insertSampleData-projects', projectError);
        console.error('Error inserting sample project.');
        return;
      }
      
      // Try to insert a sample brand concept
      const sampleBrandConcept = {
        id: 1,
        project_id: 1,
        name: 'Initial Concept',
        is_active: true,
        created_at: new Date().toISOString(),
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
      
      const { error: conceptError } = await supabase
        .from('brand_concepts')
        .upsert(sampleBrandConcept)
        .select()
        .single();
      
      if (conceptError) {
        logSupabaseError('insertSampleData-concepts', conceptError);
        console.error('Error inserting sample brand concept.');
        return;
      }
      
      console.log('Sample data inserted successfully!');
    } catch (error) {
      logSupabaseError('insertSampleData', error);
      console.error('Failed to insert sample data.');
    }
  }

  async getProject(id: number): Promise<Project | undefined> {
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot get project.');
      return undefined;
    }
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select()
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Project;
    } catch (error) {
      console.error('Error getting project:', error);
      return undefined;
    }
  }

  async createProject(project: InsertProject): Promise<Project> {
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot create project.');
      throw new Error('Supabase client not initialized');
    }
    
    try {
      // Convert camelCase to snake_case for Supabase
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: project.name,
          client_name: project.clientName,
          user_id: project.userId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project | undefined> {
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot update project.');
      return undefined;
    }
    
    try {
      // Convert camelCase to snake_case for Supabase
      const updateData: any = {};
      
      if (project.name !== undefined) updateData.name = project.name;
      if (project.clientName !== undefined) updateData.client_name = project.clientName;
      if (project.userId !== undefined) updateData.user_id = project.userId;
      if (project.createdAt !== undefined) updateData.created_at = project.createdAt;
      
      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Project;
    } catch (error) {
      console.error('Error updating project:', error);
      return undefined;
    }
  }

  async deleteProject(id: number): Promise<boolean> {
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot delete project.');
      return false;
    }
    
    try {
      // First delete all associated brand concepts
      await supabase
        .from('brand_concepts')
        .delete()
        .eq('project_id', id);
      
      // Then delete the project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  /**
   * Brand Concept Operations
   */
  async getBrandConcepts(projectId: number): Promise<BrandConcept[]> {
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot get brand concepts.');
      return [];
    }
    
    try {
      // Convert camelCase to snake_case for Supabase
      const { data, error } = await supabase
        .from('brand_concepts')
        .select()
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BrandConcept[];
    } catch (error) {
      console.error('Error getting brand concepts:', error);
      return [];
    }
  }

  async getBrandConcept(id: number): Promise<BrandConcept | undefined> {
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot get brand concept.');
      return undefined;
    }
    
    try {
      const { data, error } = await supabase
        .from('brand_concepts')
        .select()
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as BrandConcept;
    } catch (error) {
      console.error('Error getting brand concept:', error);
      return undefined;
    }
  }

  async createBrandConcept(concept: InsertBrandConcept): Promise<BrandConcept> {
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot create brand concept.');
      throw new Error('Supabase client not initialized');
    }
    
    try {
      // Convert camelCase to snake_case for Supabase
      const { data, error } = await supabase
        .from('brand_concepts')
        .insert({
          project_id: concept.projectId,
          name: concept.name,
          brand_inputs: concept.brandInputs,
          brand_output: concept.brandOutput,
          is_active: concept.isActive,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as BrandConcept;
    } catch (error) {
      console.error('Error creating brand concept:', error);
      throw error;
    }
  }

  async updateBrandConcept(id: number, concept: Partial<BrandConcept>): Promise<BrandConcept | undefined> {
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot update brand concept.');
      return undefined;
    }
    
    try {
      // Convert camelCase to snake_case for Supabase
      const updateData: any = {};
      
      if (concept.name !== undefined) updateData.name = concept.name;
      if (concept.projectId !== undefined) updateData.project_id = concept.projectId;
      if (concept.brandInputs !== undefined) updateData.brand_inputs = concept.brandInputs;
      if (concept.brandOutput !== undefined) updateData.brand_output = concept.brandOutput;
      if (concept.isActive !== undefined) updateData.is_active = concept.isActive;
      if (concept.createdAt !== undefined) updateData.created_at = concept.createdAt;
      
      const { data, error } = await supabase
        .from('brand_concepts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as BrandConcept;
    } catch (error) {
      console.error('Error updating brand concept:', error);
      return undefined;
    }
  }

  async deleteBrandConcept(id: number): Promise<boolean> {
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot delete brand concept.');
      return false;
    }
    
    try {
      const { error } = await supabase
        .from('brand_concepts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting brand concept:', error);
      return false;
    }
  }

  async setActiveBrandConcept(id: number, projectId: number): Promise<boolean> {
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot set active brand concept.');
      return false;
    }
    
    try {
      // Start a transaction
      // First, set all concepts in the project to isActive = false
      const { error: updateError } = await supabase
        .from('brand_concepts')
        .update({ is_active: false })
        .eq('project_id', projectId);
      
      if (updateError) throw updateError;
      
      // Then set the specific concept to isActive = true
      const { error } = await supabase
        .from('brand_concepts')
        .update({ is_active: true })
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error setting active brand concept:', error);
      return false;
    }
  }
}

// Export an instance for easy use
export const supabaseStorage = new SupabaseStorage();