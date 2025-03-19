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
    
    // Add sample projects for testing
    const project1 = {
      id: 1,
      name: 'Solystra',
      clientName: 'Sample Client',
      userId: 1,
      createdAt: new Date()
    };
    this.projects.set(project1.id, project1);
    
    const project2 = {
      id: 2,
      name: 'NexGen Fintech',
      clientName: 'Financial Innovations Inc.',
      userId: 1,
      createdAt: new Date()
    };
    this.projects.set(project2.id, project2);
    this.projectIdCounter = 3;

    // Add sample brand concepts for testing
    this.createBrandConcept({
      projectId: project1.id,
      name: 'Initial Concept',
      isActive: true,
      brandInputs: {
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
      brandOutput: {
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
    });
    
    // Add a concept for the second project
    this.createBrandConcept({
      projectId: project2.id,
      name: 'Financial Tech Concept',
      isActive: true,
      brandInputs: {
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
      brandOutput: {
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

// Import storage implementations
import { postgresStorage } from './db';
import { supabaseStorage, supabase } from './supabase';

// Determine which storage implementation to use
// Set up the storage implementation with fallback logic
let storageImplementation: IStorage;

// First, try to use the local PostgreSQL database
if (process.env.DATABASE_URL) {
  console.log('Using PostgreSQL database backend');
  storageImplementation = postgresStorage;
} 
// If local database not available, check if Supabase is properly initialized
else if (supabase) {
  console.log('Using Supabase client storage backend');
  storageImplementation = supabaseStorage;
  
  // We'll do an async check for tables and create them if needed
  (async () => {
    try {
      const { data, error } = await supabase.from('users').select('id').limit(1);
      
      if (error && error.message.includes('relation "public.users" does not exist')) {
        console.warn('Supabase tables do not exist yet. Please create them manually using SQL Editor.');
        console.warn('Some Supabase tables are missing. Using in-memory storage as fallback.');
        console.warn('Run `node -r tsx/register server/init-supabase-db.ts` to create Supabase tables.');
        storageImplementation = new MemStorage();
      } else if (error) {
        console.warn('Warning: Supabase connection error:', error.message);
        console.warn('Application will continue using Supabase but operations may fail');
      } else {
        console.log('Successfully connected to Supabase database');
      }
    } catch (err: unknown) {
      console.warn('Warning: Error connecting to Supabase:', err);
      console.warn('Application will continue using Supabase but operations may fail');
    }
  })();
} else {
  console.log('Using in-memory storage backend - No database connection available');
  storageImplementation = new MemStorage();
}

export const storage = storageImplementation;
