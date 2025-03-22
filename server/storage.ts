import type { 
  User, InsertUser, Project, InsertProject,
  BrandConcept, InsertBrandConcept,
  BrandInput, BrandOutput
} from "@shared/schema";

import {
  users, projects, brandConcepts
} from "@shared/schema";

import { postgresStorage, db } from './db';
import { eq, desc } from "drizzle-orm";

// Using direct Supabase PostgreSQL connection via pooled connection string

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Project operations
  getProjects(userId: number): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Brand concept operations
  getBrandConcepts(projectId: number): Promise<BrandConcept[]>;
  getBrandConcept(id: number): Promise<BrandConcept | undefined>;
  createBrandConcept(concept: InsertBrandConcept): Promise<BrandConcept>;
  updateBrandConcept(id: number, concept: Partial<BrandConcept>): Promise<BrandConcept | undefined>;
  deleteBrandConcept(id: number): Promise<boolean>;
  setActiveBrandConcept(id: number, projectId: number): Promise<boolean>;
}export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    if (!db) {
      console.warn('Database not initialized. Cannot get user.');
      return undefined;
    }
    
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) {
      console.warn('Database not initialized. Cannot get user by username.');
      return undefined;
    }
    
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!db) {
      console.warn('Database not initialized. Cannot create user.');
      throw new Error('Database not initialized');
    }
    
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Project operations
  async getProjects(userId: number): Promise<Project[]> {
    if (!db) {
      console.warn('Database not initialized. Cannot get projects.');
      return [];
    }
    
    const projectsTable = projects;
    const projectsData = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.userId, userId))
      .orderBy(desc(projectsTable.createdAt));
    return projectsData;
  }
  
  async getProject(id: number): Promise<Project | undefined> {
    if (!db) {
      console.warn('Database not initialized. Cannot get project.');
      return undefined;
    }
    
    const projectsTable = projects;
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, id));
    return project || undefined;
  }
  
  async createProject(project: InsertProject): Promise<Project> {
    if (!db) {
      console.warn('Database not initialized. Cannot create project.');
      throw new Error('Database not initialized');
    }
    
    const projectsTable = projects;
    const [newProject] = await db
      .insert(projectsTable)
      .values(project)
      .returning();
    return newProject;
  }
  
  async updateProject(id: number, project: Partial<Project>): Promise<Project | undefined> {
    if (!db) {
      console.warn('Database not initialized. Cannot update project.');
      return undefined;
    }
    
    // Exclude id from update
    const { id: _, ...updateValues } = project;
    
    if (Object.keys(updateValues).length === 0) {
      return this.getProject(id);
    }
    
    const projectsTable = projects;
    const [updatedProject] = await db
      .update(projectsTable)
      .set(updateValues)
      .where(eq(projectsTable.id, id))
      .returning();
    return updatedProject || undefined;
  }
  
  async deleteProject(id: number): Promise<boolean> {
    if (!db) {
      console.warn('Database not initialized. Cannot delete project.');
      return false;
    }
    
    const projectsTable = projects;
    const result = await db
      .delete(projectsTable)
      .where(eq(projectsTable.id, id))
      .returning();
    return result.length > 0;
  }
  
  // Brand concept operations
  async getBrandConcepts(projectId: number): Promise<BrandConcept[]> {
    if (!db) {
      console.warn('Database not initialized. Cannot get brand concepts.');
      return [];
    }
    
    const conceptsTable = brandConcepts;
    const concepts = await db
      .select()
      .from(conceptsTable)
      .where(eq(conceptsTable.projectId, projectId))
      .orderBy(desc(conceptsTable.createdAt));
    return concepts;
  }
  
  async getBrandConcept(id: number): Promise<BrandConcept | undefined> {
    if (!db) {
      console.warn('Database not initialized. Cannot get brand concept.');
      return undefined;
    }
    
    const conceptsTable = brandConcepts;
    const [concept] = await db
      .select()
      .from(conceptsTable)
      .where(eq(conceptsTable.id, id));
    return concept || undefined;
  }
  
  async createBrandConcept(concept: InsertBrandConcept): Promise<BrandConcept> {
    if (!db) {
      console.warn('Database not initialized. Cannot create brand concept.');
      throw new Error('Database not initialized');
    }
    
    const conceptsTable = brandConcepts;
    const [newConcept] = await db
      .insert(conceptsTable)
      .values(concept)
      .returning();
    
    // If this concept is active, deactivate others for this project
    if (concept.isActive) {
      await this.setActiveBrandConcept(newConcept.id, concept.projectId);
    }
    
    return newConcept;
  }
  
  async updateBrandConcept(id: number, concept: Partial<BrandConcept>): Promise<BrandConcept | undefined> {
    if (!db) {
      console.warn('Database not initialized. Cannot update brand concept.');
      return undefined;
    }
    
    // Store if isActive is true so we can update other concepts if needed
    const isBeingSetActive = concept.isActive === true;
    const projectId = concept.projectId;
    
    // Exclude id from update
    const { id: _, ...updateValues } = concept;
    
    if (Object.keys(updateValues).length === 0) {
      return this.getBrandConcept(id);
    }
    
    const conceptsTable = brandConcepts;
    const [updatedConcept] = await db
      .update(conceptsTable)
      .set(updateValues)
      .where(eq(conceptsTable.id, id))
      .returning();
    
    // If this concept is being set as active, deactivate others
    if (isBeingSetActive && projectId) {
      await this.setActiveBrandConcept(id, projectId);
    }
    
    return updatedConcept || undefined;
  }
  
  async deleteBrandConcept(id: number): Promise<boolean> {
    if (!db) {
      console.warn('Database not initialized. Cannot delete brand concept.');
      return false;
    }
    
    const conceptsTable = brandConcepts;
    const result = await db
      .delete(conceptsTable)
      .where(eq(conceptsTable.id, id))
      .returning();
    return result.length > 0;
  }
  
  async setActiveBrandConcept(id: number, projectId: number): Promise<boolean> {
    if (!db) {
      console.warn('Database not initialized. Cannot set active brand concept.');
      return false;
    }
    
    try {
      const conceptsTable = brandConcepts;
      // First, deactivate all concepts for this project
      await db
        .update(conceptsTable)
        .set({ isActive: false })
        .where(eq(conceptsTable.projectId, projectId));
      
      // Then, activate the specified concept
      const result = await db
        .update(conceptsTable)
        .set({ isActive: true })
        .where(eq(conceptsTable.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error: any) {
      console.error('Error setting active brand concept:', error);
      return false;
    }
  }
}

// Use Supabase PostgreSQL connection via their pooled connection string
// Connection to Supabase database directly (bypassing the REST API)
// SUPABASE_DB_URL is already a pooled connection managed by Supabase
console.log('Using Supabase PostgreSQL via pooled connection string');

// Export PostgreSQL storage implementation
export const storage = postgresStorage;
