import postgres from 'postgres';
import type { RowList, Row } from 'postgres';
import { User, InsertUser, Project, InsertProject, BrandConcept, InsertBrandConcept } from '@shared/schema';
import type { IStorage } from './storage';

// Initialize PostgreSQL client
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('DATABASE_URL environment variable is not set. Using in-memory storage instead.');
}

// Create PostgreSQL client only if DATABASE_URL is provided
const sql = databaseUrl ? postgres(databaseUrl) : null;

/**
 * PostgreSQL storage implementation for the application
 * This class implements the IStorage interface to provide
 * persistent storage using PostgreSQL directly (not Supabase JS client)
 */
export class PostgresStorage implements IStorage {
  /**
   * User Operations
   */
  async getUser(id: number): Promise<User | undefined> {
    if (!sql) {
      console.warn('PostgreSQL client not initialized. Cannot get user.');
      return undefined;
    }
    
    try {
      const users = await sql`
        SELECT * FROM users WHERE id = ${id}
      `;
      
      if (users.length === 0) return undefined;
      
      // Convert snake_case to camelCase if needed
      return users[0] as User;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!sql) {
      console.warn('PostgreSQL client not initialized. Cannot get user by username.');
      return undefined;
    }
    
    try {
      const users = await sql`
        SELECT * FROM users WHERE username = ${username}
      `;
      
      if (users.length === 0) return undefined;
      
      return users[0] as User;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    if (!sql) {
      console.warn('PostgreSQL client not initialized. Cannot create user.');
      throw new Error('PostgreSQL client not initialized');
    }
    
    try {
      const result = await sql`
        INSERT INTO users (username, password)
        VALUES (${user.username}, ${user.password})
        RETURNING *
      `;
      
      return result[0] as User;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  /**
   * Project Operations
   */
  async getProjects(userId: number): Promise<Project[]> {
    if (!sql) {
      console.warn('PostgreSQL client not initialized. Cannot get projects.');
      return [];
    }
    
    try {
      const projects = await sql`
        SELECT id, name, client_name as "clientName", created_at as "createdAt", user_id as "userId" 
        FROM projects 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
      
      return projects as unknown as Project[];
    } catch (error) {
      console.error('Error getting projects:', error);
      return [];
    }
  }

  async getProject(id: number): Promise<Project | undefined> {
    if (!sql) {
      console.warn('PostgreSQL client not initialized. Cannot get project.');
      return undefined;
    }
    
    try {
      const projects = await sql`
        SELECT id, name, client_name as "clientName", created_at as "createdAt", user_id as "userId" 
        FROM projects 
        WHERE id = ${id}
      `;
      
      if (projects.length === 0) return undefined;
      
      return projects[0] as Project;
    } catch (error) {
      console.error('Error getting project:', error);
      return undefined;
    }
  }

  async createProject(project: InsertProject): Promise<Project> {
    if (!sql) {
      console.warn('PostgreSQL client not initialized. Cannot create project.');
      throw new Error('PostgreSQL client not initialized');
    }
    
    try {
      const result = await sql`
        INSERT INTO projects (name, client_name, user_id, created_at)
        VALUES (
          ${project.name}, 
          ${project.clientName}, 
          ${project.userId}, 
          ${project.createdAt || new Date().toISOString()}
        )
        RETURNING id, name, client_name as "clientName", created_at as "createdAt", user_id as "userId"
      `;
      
      return result[0] as Project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project | undefined> {
    if (!sql) {
      console.warn('PostgreSQL client not initialized. Cannot update project.');
      return undefined;
    }
    
    try {
      // Build the SET clause dynamically based on what fields are provided
      const updates: any[] = [];
      const values: any[] = [];
      
      if (project.name !== undefined) {
        updates.push('name = $1');
        values.push(project.name);
      }
      
      if (project.clientName !== undefined) {
        updates.push('client_name = $' + (values.length + 1));
        values.push(project.clientName);
      }
      
      if (project.userId !== undefined) {
        updates.push('user_id = $' + (values.length + 1));
        values.push(project.userId);
      }
      
      if (updates.length === 0) {
        return await this.getProject(id);
      }

      // Add the id as the last parameter
      values.push(id);
      
      const updateQuery = `
        UPDATE projects 
        SET ${updates.join(', ')} 
        WHERE id = $${values.length}
        RETURNING id, name, client_name as "clientName", created_at as "createdAt", user_id as "userId"
      `;
      
      const result = await sql.unsafe(updateQuery, ...values);
      
      if (result.length === 0) return undefined;
      
      return result[0] as Project;
    } catch (error) {
      console.error('Error updating project:', error);
      return undefined;
    }
  }

  async deleteProject(id: number): Promise<boolean> {
    if (!sql) {
      console.warn('PostgreSQL client not initialized. Cannot delete project.');
      return false;
    }
    
    try {
      // Delete related brand concepts first (should happen automatically due to CASCADE)
      await sql`
        DELETE FROM brand_concepts WHERE project_id = ${id}
      `;
      
      // Then delete the project
      const result = await sql`
        DELETE FROM projects WHERE id = ${id}
      `;
      
      return result.count > 0;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }
  
  /**
   * Brand Concept Operations
   */
  async getBrandConcepts(projectId: number): Promise<BrandConcept[]> {
    if (!sql) {
      console.warn('PostgreSQL client not initialized. Cannot get brand concepts.');
      return [];
    }
    
    try {
      const concepts = await sql`
        SELECT 
          id, 
          project_id as "projectId", 
          name, 
          created_at as "createdAt", 
          brand_inputs as "brandInputs", 
          brand_output as "brandOutput", 
          is_active as "isActive"
        FROM brand_concepts 
        WHERE project_id = ${projectId}
        ORDER BY created_at DESC
      `;
      
      return concepts as BrandConcept[];
    } catch (error) {
      console.error('Error getting brand concepts:', error);
      return [];
    }
  }

  async getBrandConcept(id: number): Promise<BrandConcept | undefined> {
    if (!sql) {
      console.warn('PostgreSQL client not initialized. Cannot get brand concept.');
      return undefined;
    }
    
    try {
      const concepts = await sql`
        SELECT 
          id, 
          project_id as "projectId", 
          name, 
          created_at as "createdAt", 
          brand_inputs as "brandInputs", 
          brand_output as "brandOutput", 
          is_active as "isActive"
        FROM brand_concepts 
        WHERE id = ${id}
      `;
      
      if (concepts.length === 0) return undefined;
      
      return concepts[0] as BrandConcept;
    } catch (error) {
      console.error('Error getting brand concept:', error);
      return undefined;
    }
  }

  async createBrandConcept(concept: InsertBrandConcept): Promise<BrandConcept> {
    if (!sql) {
      console.warn('PostgreSQL client not initialized. Cannot create brand concept.');
      throw new Error('PostgreSQL client not initialized');
    }
    
    try {
      const result = await sql`
        INSERT INTO brand_concepts (
          project_id, 
          name, 
          brand_inputs, 
          brand_output, 
          is_active,
          created_at
        )
        VALUES (
          ${concept.projectId}, 
          ${concept.name}, 
          ${concept.brandInputs}, 
          ${concept.brandOutput}, 
          ${concept.isActive || false},
          ${concept.createdAt || new Date().toISOString()}
        )
        RETURNING 
          id, 
          project_id as "projectId", 
          name, 
          created_at as "createdAt", 
          brand_inputs as "brandInputs", 
          brand_output as "brandOutput", 
          is_active as "isActive"
      `;
      
      return result[0] as BrandConcept;
    } catch (error) {
      console.error('Error creating brand concept:', error);
      throw error;
    }
  }

  async updateBrandConcept(id: number, concept: Partial<BrandConcept>): Promise<BrandConcept | undefined> {
    if (!sql) {
      console.warn('PostgreSQL client not initialized. Cannot update brand concept.');
      return undefined;
    }
    
    try {
      // Build the SET clause dynamically based on what fields are provided
      const updates: any[] = [];
      const values: any[] = [];
      
      if (concept.name !== undefined) {
        updates.push('name = $1');
        values.push(concept.name);
      }
      
      if (concept.projectId !== undefined) {
        updates.push('project_id = $' + (values.length + 1));
        values.push(concept.projectId);
      }
      
      if (concept.brandInputs !== undefined) {
        updates.push('brand_inputs = $' + (values.length + 1));
        values.push(concept.brandInputs);
      }
      
      if (concept.brandOutput !== undefined) {
        updates.push('brand_output = $' + (values.length + 1));
        values.push(concept.brandOutput);
      }
      
      if (concept.isActive !== undefined) {
        updates.push('is_active = $' + (values.length + 1));
        values.push(concept.isActive);
      }
      
      if (updates.length === 0) {
        return await this.getBrandConcept(id);
      }

      // Add the id as the last parameter
      values.push(id);
      
      const updateQuery = `
        UPDATE brand_concepts 
        SET ${updates.join(', ')} 
        WHERE id = $${values.length}
        RETURNING 
          id, 
          project_id as "projectId", 
          name, 
          created_at as "createdAt", 
          brand_inputs as "brandInputs", 
          brand_output as "brandOutput", 
          is_active as "isActive"
      `;
      
      const result = await sql.unsafe(updateQuery, ...values);
      
      if (result.length === 0) return undefined;
      
      return result[0] as BrandConcept;
    } catch (error) {
      console.error('Error updating brand concept:', error);
      return undefined;
    }
  }

  async deleteBrandConcept(id: number): Promise<boolean> {
    if (!sql) {
      console.warn('PostgreSQL client not initialized. Cannot delete brand concept.');
      return false;
    }
    
    try {
      const result = await sql`
        DELETE FROM brand_concepts WHERE id = ${id}
      `;
      
      return result.count > 0;
    } catch (error) {
      console.error('Error deleting brand concept:', error);
      return false;
    }
  }

  async setActiveBrandConcept(id: number, projectId: number): Promise<boolean> {
    if (!sql) {
      console.warn('PostgreSQL client not initialized. Cannot set active brand concept.');
      return false;
    }
    
    try {
      // First, set all concepts in the project to isActive = false
      await sql`
        UPDATE brand_concepts
        SET is_active = false
        WHERE project_id = ${projectId}
      `;
      
      // Then set the specific concept to isActive = true
      const result = await sql`
        UPDATE brand_concepts
        SET is_active = true
        WHERE id = ${id}
      `;
      
      return result.count > 0;
    } catch (error) {
      console.error('Error setting active brand concept:', error);
      return false;
    }
  }
}

// Export an instance for easy use
export const postgresStorage = new PostgresStorage();