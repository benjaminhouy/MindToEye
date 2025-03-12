import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Replicate from "replicate";
import { 
  brandInputSchema, 
  insertBrandConceptSchema,
  insertProjectSchema
} from "@shared/schema";
import { generateBrandConcept, generateLogo } from "./openai";
import { log } from "./vite";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // API health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // Project routes
  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      // For demo purposes, always use user ID 1
      const userId = 1;
      const projects = await storage.getProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      // For demo purposes, always use user ID 1
      const userId = 1;
      
      const projectData = {
        ...req.body,
        userId
      };
      
      const validatedData = insertProjectSchema.parse(projectData);
      const project = await storage.createProject(validatedData);
      
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid project data", details: error.errors });
      }
      
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.delete("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const success = await storage.deleteProject(projectId);
      if (success) {
        res.status(204).send();
      } else {
        res.status(500).json({ error: "Failed to delete project" });
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Brand concept routes
  app.get("/api/projects/:projectId/concepts", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const concepts = await storage.getBrandConcepts(projectId);
      res.json(concepts);
    } catch (error) {
      console.error("Error fetching brand concepts:", error);
      res.status(500).json({ error: "Failed to fetch brand concepts" });
    }
  });

  app.get("/api/concepts/:id", async (req: Request, res: Response) => {
    try {
      const conceptId = parseInt(req.params.id);
      if (isNaN(conceptId)) {
        return res.status(400).json({ error: "Invalid concept ID" });
      }

      const concept = await storage.getBrandConcept(conceptId);
      if (!concept) {
        return res.status(404).json({ error: "Brand concept not found" });
      }

      res.json(concept);
    } catch (error) {
      console.error("Error fetching brand concept:", error);
      res.status(500).json({ error: "Failed to fetch brand concept" });
    }
  });

  app.post("/api/generate-concept", async (req: Request, res: Response) => {
    try {
      const brandInput = brandInputSchema.parse(req.body);
      
      // Call the AI service to generate a brand concept
      const brandOutput = await generateBrandConcept(brandInput);
      
      res.json({ 
        success: true,
        brandOutput
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid brand input data", details: error.errors });
      }
      
      console.error("Error generating brand concept:", error);
      res.status(500).json({ error: "Failed to generate brand concept" });
    }
  });
  
  // Test route for Replicate API
  app.get("/api/test-replicate", async (req: Request, res: Response) => {
    try {
      log("Testing Replicate API with FLUX model...");
      // Initialize a new Replicate client just for this test
      const testReplicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
      });
      
      // Simple test prompt that should work for FLUX model
      const testPrompt = "Create a minimalist logo for a coffee shop called 'Sunrise Brew' with orange and brown colors";
      
      log("Sending request to Replicate with test prompt...");
      const output = await testReplicate.run(
        "black-forest-labs/flux:1",
        {
          input: {
            prompt: testPrompt,
            width: 1024,
            height: 1024,
            negative_prompt: "low quality, distorted",
            prompt_strength: 7.5,
            num_outputs: 1,
            num_inference_steps: 25
          }
        }
      );
      
      log("Replicate test response: " + JSON.stringify(output));
      
      res.json({
        success: true,
        message: "Replicate API test successful",
        output: output
      });
    } catch (error: any) {
      console.error("Replicate API test error:", error);
      const errorMessage = error?.message || "Unknown error";
      res.status(500).json({ error: "Replicate API test failed", details: errorMessage });
    }
  });

  // Logo generation route
  app.post("/api/generate-logo", async (req: Request, res: Response) => {
    try {
      const { brandName, industry, description, values, style, colors } = req.body;
      
      if (!brandName || !industry) {
        return res.status(400).json({ error: "Brand name and industry are required" });
      }
      
      // Call the AI service to generate a logo
      const logo = await generateLogo({
        brandName,
        industry,
        description,
        values,
        style,
        colors
      });
      
      res.json({ 
        success: true,
        logo
      });
    } catch (error) {
      console.error("Error generating logo:", error);
      res.status(500).json({ error: "Failed to generate logo" });
    }
  });

  app.post("/api/projects/:projectId/concepts", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Generate a more descriptive name for the concept
      let conceptName = req.body.name || "";
      
      // If the name is missing or just the standard format, create a more unique name
      if (!conceptName || conceptName.match(/^(Modern|Classic|Minimalist|Bold) .+$/)) {
        const style = req.body.output?.logoDescription 
          ? req.body.output.logoDescription.split(' ').slice(0, 2).join(' ') 
          : req.body.designStyle || "";
        
        const adjectives = [
          "Vibrant", "Bold", "Elegant", "Fresh", "Dynamic", 
          "Sleek", "Refined", "Innovative", "Premium", "Creative"
        ];
        
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        conceptName = `${randomAdj} ${style} Concept (${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })})`;
      }
      
      const conceptData = {
        ...req.body,
        name: conceptName,
        projectId
      };
      
      const validatedData = insertBrandConceptSchema.parse(conceptData);
      const concept = await storage.createBrandConcept(validatedData);
      
      res.status(201).json(concept);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid concept data", details: error.errors });
      }
      
      console.error("Error creating brand concept:", error);
      res.status(500).json({ error: "Failed to create brand concept" });
    }
  });

  app.patch("/api/concepts/:id/set-active", async (req: Request, res: Response) => {
    try {
      const conceptId = parseInt(req.params.id);
      if (isNaN(conceptId)) {
        return res.status(400).json({ error: "Invalid concept ID" });
      }

      const concept = await storage.getBrandConcept(conceptId);
      if (!concept) {
        return res.status(404).json({ error: "Brand concept not found" });
      }

      const success = await storage.setActiveBrandConcept(conceptId, concept.projectId);
      if (success) {
        const updatedConcept = await storage.getBrandConcept(conceptId);
        res.json(updatedConcept);
      } else {
        res.status(500).json({ error: "Failed to set active brand concept" });
      }
    } catch (error) {
      console.error("Error setting active brand concept:", error);
      res.status(500).json({ error: "Failed to set active brand concept" });
    }
  });

  app.delete("/api/concepts/:id", async (req: Request, res: Response) => {
    try {
      const conceptId = parseInt(req.params.id);
      if (isNaN(conceptId)) {
        return res.status(400).json({ error: "Invalid concept ID" });
      }

      const concept = await storage.getBrandConcept(conceptId);
      if (!concept) {
        return res.status(404).json({ error: "Brand concept not found" });
      }

      const success = await storage.deleteBrandConcept(conceptId);
      if (success) {
        res.status(204).send();
      } else {
        res.status(500).json({ error: "Failed to delete brand concept" });
      }
    } catch (error) {
      console.error("Error deleting brand concept:", error);
      res.status(500).json({ error: "Failed to delete brand concept" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
