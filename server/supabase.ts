import { createClient } from '@supabase/supabase-js';
import type { IStorage } from './storage';
import { User, InsertUser, Project, InsertProject, BrandConcept, InsertBrandConcept } from '@shared/schema';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Ensure environment variables are set
if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase URL or key is missing. In-memory storage will be used instead.");
}

// Create Supabase client only if both URL and key are provided
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

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
      const { data, error } = await supabase
        .from('projects')
        .select()
        .eq('userId', userId)
        .order('createdAt', { ascending: false });
      
      if (error) throw error;
      return data as Project[];
    } catch (error) {
      console.error('Error getting projects:', error);
      return [];
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
      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...project,
          createdAt: new Date().toISOString()
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
      const { data, error } = await supabase
        .from('projects')
        .update(project)
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
        .eq('projectId', id);
      
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
      const { data, error } = await supabase
        .from('brand_concepts')
        .select()
        .eq('projectId', projectId)
        .order('createdAt', { ascending: false });
      
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
      const { data, error } = await supabase
        .from('brand_concepts')
        .insert({
          ...concept,
          createdAt: new Date().toISOString()
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
      const { data, error } = await supabase
        .from('brand_concepts')
        .update(concept)
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
        .update({ isActive: false })
        .eq('projectId', projectId);
      
      if (updateError) throw updateError;
      
      // Then set the specific concept to isActive = true
      const { error } = await supabase
        .from('brand_concepts')
        .update({ isActive: true })
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