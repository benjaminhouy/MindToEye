import { 
  users, type User, type InsertUser,
  projects, type Project, type InsertProject,
  brandConcepts, type BrandConcept, type InsertBrandConcept,
  type BrandInput, type BrandOutput
} from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private brandConcepts: Map<number, BrandConcept>;
  private userIdCounter: number;
  private projectIdCounter: number;
  private conceptIdCounter: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.brandConcepts = new Map();
    this.userIdCounter = 1;
    this.projectIdCounter = 1;
    this.conceptIdCounter = 1;
    
    // Initialize with a demo user
    this.createUser({
      username: 'demo',
      password: 'demo123'
    });
    
    // Add a sample project for testing
    this.createProject({
      name: 'Solystra',
      clientName: 'Sample Client',
      userId: 1
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Project operations
  async getProjects(userId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (project) => project.userId === userId
    );
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.projectIdCounter++;
    const now = new Date();
    const project: Project = { 
      ...insertProject, 
      id, 
      createdAt: now,
      // Ensure clientName is not undefined
      clientName: insertProject.clientName ?? null
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: number, partialProject: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const updatedProject = { ...project, ...partialProject };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    // Also delete all brand concepts associated with this project
    const conceptsToDelete = Array.from(this.brandConcepts.values())
      .filter(concept => concept.projectId === id)
      .map(concept => concept.id);
    
    conceptsToDelete.forEach(conceptId => {
      this.brandConcepts.delete(conceptId);
    });
    
    return this.projects.delete(id);
  }

  // Brand concept operations
  async getBrandConcepts(projectId: number): Promise<BrandConcept[]> {
    return Array.from(this.brandConcepts.values()).filter(
      (concept) => concept.projectId === projectId
    );
  }

  async getBrandConcept(id: number): Promise<BrandConcept | undefined> {
    return this.brandConcepts.get(id);
  }

  async createBrandConcept(insertConcept: InsertBrandConcept): Promise<BrandConcept> {
    const id = this.conceptIdCounter++;
    const now = new Date();
    const concept: BrandConcept = { 
      ...insertConcept, 
      id, 
      createdAt: now,
      // Ensure isActive is not undefined
      isActive: insertConcept.isActive ?? false
    };
    this.brandConcepts.set(id, concept);
    
    // If this concept is set as active, deactivate all other concepts for this project
    if (concept.isActive) {
      this.setActiveBrandConcept(id, concept.projectId);
    }
    
    return concept;
  }

  async updateBrandConcept(id: number, partialConcept: Partial<BrandConcept>): Promise<BrandConcept | undefined> {
    const concept = this.brandConcepts.get(id);
    if (!concept) return undefined;

    const updatedConcept = { ...concept, ...partialConcept };
    this.brandConcepts.set(id, updatedConcept);
    
    // If this concept is being set as active, deactivate all other concepts for this project
    if (partialConcept.isActive && updatedConcept.isActive) {
      this.setActiveBrandConcept(id, concept.projectId);
    }
    
    return updatedConcept;
  }

  async deleteBrandConcept(id: number): Promise<boolean> {
    return this.brandConcepts.delete(id);
  }

  async setActiveBrandConcept(id: number, projectId: number): Promise<boolean> {
    try {
      // Deactivate all concepts for this project
      Array.from(this.brandConcepts.values())
        .filter(concept => concept.projectId === projectId && concept.id !== id)
        .forEach(concept => {
          concept.isActive = false;
          this.brandConcepts.set(concept.id, concept);
        });
      
      // Activate the specified concept
      const concept = this.brandConcepts.get(id);
      if (concept) {
        concept.isActive = true;
        this.brandConcepts.set(id, concept);
      }
      
      return true;
    } catch (error) {
      console.error("Error setting active brand concept:", error);
      return false;
    }
  }
}

export const storage = new MemStorage();
