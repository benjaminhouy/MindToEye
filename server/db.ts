import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql as sqlQuery } from 'drizzle-orm';
import { eq, and, desc } from 'drizzle-orm';
import { 
  users, projects, brandConcepts,
  User, InsertUser, Project, InsertProject, BrandConcept, InsertBrandConcept 
} from '@shared/schema';
import type { IStorage } from './storage';

// Initialize PostgreSQL client for Drizzle ORM
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('DATABASE_URL environment variable is not set. Using in-memory storage instead.');
}

// Create PostgreSQL client with Drizzle ORM only if DATABASE_URL is provided
// For querying - use prepared statements by default
const queryClient = databaseUrl ? postgres(databaseUrl, { 
  ssl: 'require',
  prepare: true,
  debug: true,
  max: 10
}) : null;

// For migrations - disable prepared statements
const migrationClient = databaseUrl ? postgres(databaseUrl, { 
  ssl: 'require',
  max: 1
}) : null;

// Initialize Drizzle ORM
const db = queryClient ? drizzle(queryClient) : null;

// Create schema tables if they don't exist
async function createTablesIfNotExist() {
  if (!migrationClient) return;
  
  try {
    console.log('Creating database schema if it doesn\'t exist...');
    
    // Create users table
    await migrationClient`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL
      )
    `;
    
    // Create projects table
    await migrationClient`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "client_name" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "user_id" INTEGER NOT NULL,
        CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `;
    
    // Create brand_concepts table
    await migrationClient`
      CREATE TABLE IF NOT EXISTS "brand_concepts" (
        "id" SERIAL PRIMARY KEY,
        "project_id" INTEGER NOT NULL,
        "name" TEXT NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "brand_inputs" JSONB NOT NULL,
        "brand_output" JSONB NOT NULL,
        "is_active" BOOLEAN DEFAULT FALSE,
        CONSTRAINT "fk_project" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `;
    
    console.log('Database schema created successfully.');
    
    // Create demo user
    await migrationClient`
      INSERT INTO "users" ("username", "password")
      VALUES ('demo', 'demo123')
      ON CONFLICT ("username") DO NOTHING
    `;
    
    console.log('Demo user created (or already exists).');
    
  } catch (error) {
    console.error('Error creating database schema:', error);
  }
}

// Run schema creation before exporting storage
if (migrationClient) {
  createTablesIfNotExist().catch(err => {
    console.error('Failed to create database schema:', err);
  });
}

/**
 * PostgreSQL storage implementation for the application
 * This class implements the IStorage interface to provide
 * persistent storage using Drizzle ORM with PostgreSQL
 */
export class PostgresStorage implements IStorage {
  /**
   * User Operations
   */
  async getUser(id: number): Promise<User | undefined> {
    if (!db) {
      console.warn('PostgreSQL client not initialized. Cannot get user.');
      return undefined;
    }
    
    try {
      const result = await db.select().from(users).where(eq(users.id, id));
      
      if (result.length === 0) return undefined;
      
      return result[0];
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) {
      console.warn('PostgreSQL client not initialized. Cannot get user by username.');
      return undefined;
    }
    
    try {
      const result = await db.select().from(users).where(eq(users.username, username));
      
      if (result.length === 0) return undefined;
      
      return result[0];
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    if (!db) {
      console.warn('PostgreSQL client not initialized. Cannot create user.');
      throw new Error('PostgreSQL client not initialized');
    }
    
    try {
      const result = await db.insert(users).values(user).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  /**
   * Project Operations
   */
  async getProjects(userId: number): Promise<Project[]> {
    if (!db) {
      console.warn('PostgreSQL client not initialized. Cannot get projects.');
      return [];
    }
    
    try {
      const result = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.createdAt));
      
      return result;
    } catch (error) {
      console.error('Error getting projects:', error);
      return [];
    }
  }

  async getProject(id: number): Promise<Project | undefined> {
    if (!db) {
      console.warn('PostgreSQL client not initialized. Cannot get project.');
      return undefined;
    }
    
    try {
      const result = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id));
      
      if (result.length === 0) return undefined;
      
      return result[0];
    } catch (error) {
      console.error('Error getting project:', error);
      return undefined;
    }
  }

  async createProject(project: InsertProject): Promise<Project> {
    if (!db) {
      console.warn('PostgreSQL client not initialized. Cannot create project.');
      throw new Error('PostgreSQL client not initialized');
    }
    
    try {
      // Ensure createdAt is set to now if not provided
      const values = {
        ...project,
        // Not needed since schema has defaultNow()
        // createdAt: project.createdAt || new Date()
      };
      
      const result = await db
        .insert(projects)
        .values(values)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project | undefined> {
    if (!db) {
      console.warn('PostgreSQL client not initialized. Cannot update project.');
      return undefined;
    }
    
    try {
      // Exclude id from update values
      const { id: _, ...updateValues } = project;
      
      if (Object.keys(updateValues).length === 0) {
        return await this.getProject(id);
      }
      
      const result = await db
        .update(projects)
        .set(updateValues)
        .where(eq(projects.id, id))
        .returning();
      
      if (result.length === 0) return undefined;
      
      return result[0];
    } catch (error) {
      console.error('Error updating project:', error);
      return undefined;
    }
  }

  async deleteProject(id: number): Promise<boolean> {
    if (!db) {
      console.warn('PostgreSQL client not initialized. Cannot delete project.');
      return false;
    }
    
    try {
      // Delete project (brand concepts will be automatically deleted via CASCADE)
      const result = await db
        .delete(projects)
        .where(eq(projects.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }
  
  /**
   * Brand Concept Operations
   */
  async getBrandConcepts(projectId: number): Promise<BrandConcept[]> {
    if (!db) {
      console.warn('PostgreSQL client not initialized. Cannot get brand concepts.');
      return [];
    }
    
    try {
      const result = await db
        .select()
        .from(brandConcepts)
        .where(eq(brandConcepts.projectId, projectId))
        .orderBy(desc(brandConcepts.createdAt));
      
      return result;
    } catch (error) {
      console.error('Error getting brand concepts:', error);
      return [];
    }
  }

  async getBrandConcept(id: number): Promise<BrandConcept | undefined> {
    if (!db) {
      console.warn('PostgreSQL client not initialized. Cannot get brand concept.');
      return undefined;
    }
    
    try {
      const result = await db
        .select()
        .from(brandConcepts)
        .where(eq(brandConcepts.id, id));
      
      if (result.length === 0) return undefined;
      
      return result[0];
    } catch (error) {
      console.error('Error getting brand concept:', error);
      return undefined;
    }
  }

  async createBrandConcept(concept: InsertBrandConcept): Promise<BrandConcept> {
    if (!db) {
      console.warn('PostgreSQL client not initialized. Cannot create brand concept.');
      throw new Error('PostgreSQL client not initialized');
    }
    
    try {
      // Ensure createdAt is set to now if not provided, isActive defaults to false
      const values = {
        ...concept,
        // Not needed since schema has defaultNow()
        // createdAt: concept.createdAt || new Date(),
        // isActive is set in schema default
      };
      
      const result = await db
        .insert(brandConcepts)
        .values(values)
        .returning();
      
      // If this is set as active, deactivate other concepts
      if (concept.isActive) {
        await this.setActiveBrandConcept(result[0].id, concept.projectId);
      }
      
      return result[0];
    } catch (error) {
      console.error('Error creating brand concept:', error);
      throw error;
    }
  }

  async updateBrandConcept(id: number, concept: Partial<BrandConcept>): Promise<BrandConcept | undefined> {
    if (!db) {
      console.warn('PostgreSQL client not initialized. Cannot update brand concept.');
      return undefined;
    }
    
    try {
      // Store if isActive is true so we can update other concepts if needed
      const isBeingSetActive = concept.isActive === true;
      const projectId = concept.projectId;
      
      // Exclude id from update values
      const { id: _, ...updateValues } = concept;
      
      if (Object.keys(updateValues).length === 0) {
        return await this.getBrandConcept(id);
      }
      
      const result = await db
        .update(brandConcepts)
        .set(updateValues)
        .where(eq(brandConcepts.id, id))
        .returning();
      
      if (result.length === 0) return undefined;
      
      // If this concept is being set as active, deactivate other concepts
      if (isBeingSetActive && projectId) {
        await this.setActiveBrandConcept(id, projectId);
      }
      
      return result[0];
    } catch (error) {
      console.error('Error updating brand concept:', error);
      return undefined;
    }
  }

  async deleteBrandConcept(id: number): Promise<boolean> {
    if (!db) {
      console.warn('PostgreSQL client not initialized. Cannot delete brand concept.');
      return false;
    }
    
    try {
      const result = await db
        .delete(brandConcepts)
        .where(eq(brandConcepts.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting brand concept:', error);
      return false;
    }
  }

  async setActiveBrandConcept(id: number, projectId: number): Promise<boolean> {
    if (!db) {
      console.warn('PostgreSQL client not initialized. Cannot set active brand concept.');
      return false;
    }
    
    try {
      // First, set all concepts in the project to isActive = false
      await db
        .update(brandConcepts)
        .set({ isActive: false })
        .where(eq(brandConcepts.projectId, projectId));
      
      // Then set the specific concept to isActive = true
      const result = await db
        .update(brandConcepts)
        .set({ isActive: true })
        .where(eq(brandConcepts.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('Error setting active brand concept:', error);
      return false;
    }
  }
}

// Export an instance for easy use
export const postgresStorage = new PostgresStorage();