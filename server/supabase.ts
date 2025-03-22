import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, InsertUser, Project, InsertProject, BrandConcept, InsertBrandConcept } from '../shared/schema';
import { IStorage } from './storage';
import dotenv from 'dotenv';

dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Database type definition for Supabase
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

/**
 * Helper function to log Supabase errors
 */
function logSupabaseError(operation: string, error: any) {
  console.error(`Supabase error during ${operation}:`, {
    message: error.message,
    code: error.code,
    details: error.details
  });
}

// Initialize Supabase client
export const supabase: SupabaseClient<Database> | null = supabaseUrl && supabaseKey
  ? createClient<Database>(supabaseUrl, supabaseKey)
  : null;

/**
 * Supabase implementation of the storage interface
 */
export class SupabaseStorage implements IStorage {
  /**
   * User Operations
   */
  async getUser(id: number): Promise<User | undefined> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        logSupabaseError('getUser', error);
        return undefined;
      }
      
      return data;
    } catch (error: any) {
      logSupabaseError('getUser', error);
      return undefined;
    }
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') { // Not found is not an error we need to log
          logSupabaseError('getUserByUsername', error);
        }
        return undefined;
      }
      
      return data;
    } catch (error: any) {
      logSupabaseError('getUserByUsername', error);
      return undefined;
    }
  }
  
  async createUser(user: InsertUser): Promise<User> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    try {
      const { data, error } = await supabase
        .from('users')
        .insert(user)
        .select()
        .single();
      
      if (error) {
        logSupabaseError('createUser', error);
        throw new Error(`Failed to create user: ${error.message}`);
      }
      
      return data;
    } catch (error: any) {
      logSupabaseError('createUser', error);
      throw new Error(`Failed to create user: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Project Operations
   */
  async getProjects(userId: number): Promise<Project[]> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        logSupabaseError('getProjects', error);
        return [];
      }
      
      return data || [];
    } catch (error: any) {
      logSupabaseError('getProjects', error);
      return [];
    }
  }
  
  /**
   * Helper method to create tables if they don't exist
   * Used during initialization
   */
  async createTablesIfNotExist(): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    // The tables are created in the Supabase dashboard or through SQL scripts
    // This method checks if the tables exist and logs appropriate messages
    const { data, error } = await supabase.rpc('check_tables_exist');
    
    if (error) {
      console.error('Error checking if tables exist:', error);
      console.log('You may need to create the tables manually in the Supabase dashboard.');
    } else {
      console.log('Table existence check result:', data);
    }
  }
  
  /**
   * Helper method to insert sample data for testing
   */
  async insertSampleData(): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    try {
      // Check if demo user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('username', 'demo')
        .single();
      
      // Create demo user if it doesn't exist
      if (!existingUser) {
        const { error: userError } = await supabase
          .from('users')
          .insert({ username: 'demo', email: 'demo@example.com' });
        
        if (userError) {
          console.error('Error creating demo user:', userError);
          return;
        }
        
        console.log('Demo user created successfully.');
      } else {
        console.log('Demo user already exists.');
      }
    } catch (error: any) {
      console.error('Error inserting sample data:', error);
    }
  }
  
  async getProject(id: number): Promise<Project | undefined> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        logSupabaseError('getProject', error);
        return undefined;
      }
      
      return data;
    } catch (error: any) {
      logSupabaseError('getProject', error);
      return undefined;
    }
  }
  
  async createProject(project: InsertProject): Promise<Project> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single();
      
      if (error) {
        logSupabaseError('createProject', error);
        throw new Error(`Failed to create project: ${error.message}`);
      }
      
      return data;
    } catch (error: any) {
      logSupabaseError('createProject', error);
      throw new Error(`Failed to create project: ${error.message || 'Unknown error'}`);
    }
  }
  
  async updateProject(id: number, project: Partial<Project>): Promise<Project | undefined> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(project)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        logSupabaseError('updateProject', error);
        return undefined;
      }
      
      return data;
    } catch (error: any) {
      logSupabaseError('updateProject', error);
      return undefined;
    }
  }
  
  async deleteProject(id: number): Promise<boolean> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) {
        logSupabaseError('deleteProject', error);
        return false;
      }
      
      return true;
    } catch (error: any) {
      logSupabaseError('deleteProject', error);
      return false;
    }
  }
  
  /**
   * Brand Concept Operations
   */
  async getBrandConcepts(projectId: number): Promise<BrandConcept[]> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    try {
      const { data, error } = await supabase
        .from('brand_concepts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) {
        logSupabaseError('getBrandConcepts', error);
        return [];
      }
      
      return data || [];
    } catch (error: any) {
      logSupabaseError('getBrandConcepts', error);
      return [];
    }
  }
  
  async getBrandConcept(id: number): Promise<BrandConcept | undefined> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    try {
      const { data, error } = await supabase
        .from('brand_concepts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        logSupabaseError('getBrandConcept', error);
        return undefined;
      }
      
      return data;
    } catch (error: any) {
      logSupabaseError('getBrandConcept', error);
      return undefined;
    }
  }
  
  async createBrandConcept(concept: InsertBrandConcept): Promise<BrandConcept> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    try {
      const { data, error } = await supabase
        .from('brand_concepts')
        .insert(concept)
        .select()
        .single();
      
      if (error) {
        logSupabaseError('createBrandConcept', error);
        throw new Error(`Failed to create brand concept: ${error.message}`);
      }
      
      return data;
    } catch (error: any) {
      logSupabaseError('createBrandConcept', error);
      throw new Error(`Failed to create brand concept: ${error.message || 'Unknown error'}`);
    }
  }
  
  async updateBrandConcept(id: number, concept: Partial<BrandConcept>): Promise<BrandConcept | undefined> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    try {
      const { data, error } = await supabase
        .from('brand_concepts')
        .update(concept)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        logSupabaseError('updateBrandConcept', error);
        return undefined;
      }
      
      return data;
    } catch (error) {
      logSupabaseError('updateBrandConcept', error);
      return undefined;
    }
  }
  
  async deleteBrandConcept(id: number): Promise<boolean> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    try {
      const { error } = await supabase
        .from('brand_concepts')
        .delete()
        .eq('id', id);
      
      if (error) {
        logSupabaseError('deleteBrandConcept', error);
        return false;
      }
      
      return true;
    } catch (error) {
      logSupabaseError('deleteBrandConcept', error);
      return false;
    }
  }
  
  async setActiveBrandConcept(id: number, projectId: number): Promise<boolean> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    try {
      // First, deactivate all concepts for this project
      const { error: updateError } = await supabase
        .from('brand_concepts')
        .update({ is_active: false })
        .eq('project_id', projectId);
      
      if (updateError) {
        logSupabaseError('setActiveBrandConcept - deactivate', updateError);
        return false;
      }
      
      // Then, activate the selected concept
      const { error: activateError } = await supabase
        .from('brand_concepts')
        .update({ is_active: true })
        .eq('id', id);
      
      if (activateError) {
        logSupabaseError('setActiveBrandConcept - activate', activateError);
        return false;
      }
      
      return true;
    } catch (error) {
      logSupabaseError('setActiveBrandConcept', error);
      return false;
    }
  }
}

// Create an instance of the Supabase storage class
export const supabaseStorage = new SupabaseStorage();