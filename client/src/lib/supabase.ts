import { createClient } from '@supabase/supabase-js';
import { User, InsertUser, Project, InsertProject, BrandConcept, InsertBrandConcept } from '../../../shared/schema';

// Database type definition for Supabase
type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: InsertUser;
        Update: Partial<InsertUser>;
      };
      projects: {
        Row: Project;
        Insert: InsertProject;
        Update: Partial<InsertProject>;
      };
      brand_concepts: {
        Row: BrandConcept;
        Insert: InsertBrandConcept;
        Update: Partial<InsertBrandConcept>;
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, unknown>;
      };
    };
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      [key: string]: string[];
    };
  };
};

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or anon key is missing. Authentication and database features will not work.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Make Supabase instance available globally for API auth
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}

// Authentication helper functions
export const auth = {
  /**
   * Sign up a new user with email and password
   */
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  /**
   * Sign in a user with email and password
   */
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  /**
   * Sign out the current user
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Get the current user session
   */
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  },

  /**
   * Get the current user
   */
  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    return { data, error };
  },
};

// Database helper functions
export const db = {
  /**
   * Get all projects for the current user
   */
  getProjects: async (userId: number) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  },

  /**
   * Get a single project by ID
   */
  getProject: async (id: number) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    return { data, error };
  },

  /**
   * Create a new project
   */
  createProject: async (project: { name: string; client_name?: string; user_id: number }) => {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();
    
    return { data, error };
  },

  /**
   * Update a project
   */
  updateProject: async (id: number, project: Partial<{ name: string; client_name?: string }>) => {
    const { data, error } = await supabase
      .from('projects')
      .update(project)
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  },

  /**
   * Delete a project
   */
  deleteProject: async (id: number) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    
    return { error };
  },

  /**
   * Get all brand concepts for a project
   */
  getBrandConcepts: async (projectId: number) => {
    const { data, error } = await supabase
      .from('brand_concepts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  },

  /**
   * Get a single brand concept by ID
   */
  getBrandConcept: async (id: number) => {
    const { data, error } = await supabase
      .from('brand_concepts')
      .select('*')
      .eq('id', id)
      .single();
    
    return { data, error };
  },

  /**
   * Create a new brand concept
   */
  createBrandConcept: async (concept: {
    project_id: number;
    name: string;
    brand_inputs: any;
    brand_output: any;
    is_active?: boolean;
  }) => {
    const { data, error } = await supabase
      .from('brand_concepts')
      .insert(concept)
      .select()
      .single();
    
    return { data, error };
  },

  /**
   * Update a brand concept
   */
  updateBrandConcept: async (id: number, concept: Partial<{
    name: string;
    brand_inputs: any;
    brand_output: any;
    is_active: boolean;
  }>) => {
    const { data, error } = await supabase
      .from('brand_concepts')
      .update(concept)
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  },

  /**
   * Delete a brand concept
   */
  deleteBrandConcept: async (id: number) => {
    const { error } = await supabase
      .from('brand_concepts')
      .delete()
      .eq('id', id);
    
    return { error };
  },

  /**
   * Set a brand concept as active (and deactivate others)
   */
  setActiveBrandConcept: async (id: number, projectId: number) => {
    // First, deactivate all concepts for this project
    const { error: deactivateError } = await supabase
      .from('brand_concepts')
      .update({ is_active: false })
      .eq('project_id', projectId);
    
    if (deactivateError) {
      return { error: deactivateError };
    }
    
    // Then, activate the selected concept
    const { data, error } = await supabase
      .from('brand_concepts')
      .update({ is_active: true })
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  },
};