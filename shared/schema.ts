import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  authId: text("auth_id").unique(),  // Add authId field to store Supabase Auth UUID
  isDemo: boolean("is_demo").default(false),  // Flag to identify demo users
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  authId: true,
  isDemo: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Extend the User type with email for API responses
export interface UserWithEmail extends User {
  email: string;
}

// Projects schema
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  clientName: text("client_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  clientName: true,
  userId: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Brand Concepts schema
export const brandConcepts = pgTable("brand_concepts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  brandInputs: json("brand_inputs").notNull(),
  brandOutput: json("brand_output").notNull(),
  isActive: boolean("is_active").default(false),
});

export const insertBrandConceptSchema = createInsertSchema(brandConcepts).pick({
  projectId: true,
  name: true,
  brandInputs: true,
  brandOutput: true,
  isActive: true,
});

export type InsertBrandConcept = z.infer<typeof insertBrandConceptSchema>;
export type BrandConcept = typeof brandConcepts.$inferSelect;

// Brand Input Schema for validation
export const brandInputSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  industry: z.string().default(""),
  description: z.string().default(""),
  values: z.array(z.object({
    id: z.string(),
    value: z.string()
  })),
  designStyle: z.enum(["modern", "classic", "minimalist", "bold"]),
  colorPreferences: z.array(z.string()).optional(),
  // Optional IDs for storage organization in hierarchical path structure
  projectId: z.union([z.number(), z.string()]).optional(),
  conceptId: z.union([z.number(), z.string()]).optional(),
});

export type BrandInput = z.infer<typeof brandInputSchema>;

// Brand Output Schema
export const brandOutputSchema = z.object({
  logo: z.object({
    primary: z.string(),
    monochrome: z.string(),
    reverse: z.string(),
  }),
  colors: z.array(z.object({
    name: z.string(),
    hex: z.string(),
    type: z.enum(["primary", "secondary", "accent", "base"]),
  })),
  typography: z.object({
    headings: z.string(),
    body: z.string(),
  }),
  mockups: z.array(z.object({
    type: z.string(),
    imageUrl: z.string(),
  })),
});

export type BrandOutput = z.infer<typeof brandOutputSchema>;
