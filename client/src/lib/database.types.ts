// Types for the Supabase database
import { 
  User,
  InsertUser, 
  Project, 
  InsertProject, 
  BrandConcept, 
  InsertBrandConcept 
} from '../../../shared/schema';

export type Database = {
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