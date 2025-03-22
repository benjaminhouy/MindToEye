import type { Express, Request as ExpressRequest, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Replicate from "replicate";
import Anthropic from "@anthropic-ai/sdk";
import { 
  brandInputSchema, 
  insertBrandConceptSchema,
  insertProjectSchema,
  User, Project, BrandConcept
} from "@shared/schema";
import { generateBrandConcept, generateLogo } from "./openai";
import { log } from "./vite";
import { ZodError } from "zod";

// Extend the Express Request type to include our custom properties
interface Request extends ExpressRequest {
  authenticatedUserId?: number;
  project?: Project;
  concept?: BrandConcept;
}

// Middleware to verify if the user owns the project
async function verifyProjectOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    // Get the project ID from the request parameters
    const projectId = parseInt(req.params.id || req.params.projectId);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }
    
    // Get the authenticated user ID from the request
    // Extract from the Authorization header (Bearer token)
    let userId: number | undefined;

    // Extract from session or the fallback to query/body
    if (req.headers.authorization) {
      // Real implementation would verify the Supabase JWT token
      // For now, we're using a simple parsing approach
      try {
        // Note: In a real app, we would verify the JWT and extract the user ID
        // This is a simplified version for demonstration
        const token = req.headers.authorization.replace('Bearer ', '');
        // In a real implementation, you would verify and decode the JWT
        userId = parseInt(req.query.userId as string || req.body.userId);
      } catch (err) {
        console.error("Error parsing authorization token:", err);
      }
    } else {
      // Fallback to query params or body for development
      userId = parseInt(req.query.userId as string || req.body.userId);
    }
    
    if (isNaN(userId as number)) {
      return res.status(401).json({ error: "Unauthorized: Valid user ID not provided" });
    }
    
    // Get the project
    const project = await storage.getProject(projectId);
    
    // If the project doesn't exist, return a 404
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Check if the user owns the project
    if (project.userId !== userId) {
      return res.status(403).json({ error: "Forbidden: You don't have access to this project" });
    }
    
    // Store project and userId in request for later use
    req.project = project;
    req.authenticatedUserId = userId;
    
    // If everything is fine, proceed to the route handler
    next();
  } catch (error) {
    console.error("Error in verifyProjectOwnership middleware:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Middleware to verify if the user owns the concept (through project ownership)
async function verifyConceptOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    // Get the concept ID from the request parameters
    const conceptId = parseInt(req.params.id);
    
    if (isNaN(conceptId)) {
      return res.status(400).json({ error: "Invalid concept ID" });
    }
    
    // Get the authenticated user ID from the request
    // Extract from the Authorization header (Bearer token)
    let userId: number | undefined;

    // Extract from session or the fallback to query/body
    if (req.headers.authorization) {
      // Real implementation would verify the Supabase JWT token
      // For now, we're using a simple parsing approach
      try {
        // Note: In a real app, we would verify the JWT and extract the user ID
        // This is a simplified version for demonstration
        const token = req.headers.authorization.replace('Bearer ', '');
        // In a real implementation, you would verify and decode the JWT
        userId = parseInt(req.query.userId as string || req.body.userId);
      } catch (err) {
        console.error("Error parsing authorization token:", err);
      }
    } else {
      // Fallback to query params or body for development
      userId = parseInt(req.query.userId as string || req.body.userId);
    }
    
    if (isNaN(userId as number)) {
      return res.status(401).json({ error: "Unauthorized: Valid user ID not provided" });
    }
    
    // Get the concept
    const concept = await storage.getBrandConcept(conceptId);
    
    // If the concept doesn't exist, return a 404
    if (!concept) {
      return res.status(404).json({ error: "Brand concept not found" });
    }
    
    // Get the project that the concept belongs to
    const project = await storage.getProject(concept.projectId);
    
    // If the project doesn't exist, return a 404
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Check if the user owns the project
    if (project.userId !== userId) {
      return res.status(403).json({ error: "Forbidden: You don't have access to this concept" });
    }
    
    // Store concept, project and userId in request for later use
    req.concept = concept;
    req.project = project;
    req.authenticatedUserId = userId;
    
    // If everything is fine, proceed to the route handler
    next();
  } catch (error) {
    console.error("Error in verifyConceptOwnership middleware:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve the landing page
  app.get("/landing", (_req: Request, res: Response) => {
    res.sendFile("landing-page.html", { root: "./client" });
  });

  // API health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // Project routes
  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      // Extract authenticated user ID using the same technique as in middleware
      let userId: number | undefined;

      // Extract from Auth header or the fallback to query/body
      if (req.headers.authorization) {
        try {
          // Note: In a real app, we would verify the JWT and extract the user ID
          // This is a simplified version for demonstration
          const token = req.headers.authorization.replace('Bearer ', '');
          // In a real implementation, you would verify and decode the JWT
          userId = parseInt(req.query.userId as string || req.body.userId);
        } catch (err) {
          console.error("Error parsing authorization token:", err);
        }
      } else {
        // Fallback to query params for development
        userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      }
      
      if (isNaN(userId as number)) {
        return res.status(401).json({ error: "Unauthorized: Valid user ID not provided" });
      }
      
      // Ensure userId is a number before passing to storage
      const projects = await storage.getProjects(userId as number);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", verifyProjectOwnership, async (req: Request, res: Response) => {
    try {
      // We already have the project from the middleware
      res.json(req.project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      // Extract authenticated user ID using the same technique as in middleware
      let userId: number | undefined;

      // Extract from Auth header or the fallback to query/body
      if (req.headers.authorization) {
        try {
          // Note: In a real app, we would verify the JWT and extract the user ID
          // This is a simplified version for demonstration
          const token = req.headers.authorization.replace('Bearer ', '');
          // In a real implementation, you would verify and decode the JWT
          userId = req.body.userId ? parseInt(req.body.userId) : undefined;
        } catch (err) {
          console.error("Error parsing authorization token:", err);
        }
      } else {
        // Fallback to request body for development
        userId = req.body.userId ? parseInt(req.body.userId) : undefined;
      }
      
      if (isNaN(userId as number)) {
        return res.status(401).json({ error: "Unauthorized: Valid user ID not provided" });
      }
      
      const projectData = {
        ...req.body,
        userId: userId as number
      };
      
      // Delete the userId from req.body to prevent duplication
      delete projectData.userId;
      
      // Add it back in the correct format
      projectData.userId = userId as number;
      
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

  app.delete("/api/projects/:id", verifyProjectOwnership, async (req: Request, res: Response) => {
    try {
      // We already have the project from the middleware and ownership is verified
      const projectId = parseInt(req.params.id);
      
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
  app.get("/api/projects/:projectId/concepts", verifyProjectOwnership, async (req: Request, res: Response) => {
    try {
      // We already have the project from the middleware and ownership is verified
      const projectId = parseInt(req.params.projectId);
      
      const concepts = await storage.getBrandConcepts(projectId);
      res.json(concepts);
    } catch (error) {
      console.error("Error fetching brand concepts:", error);
      res.status(500).json({ error: "Failed to fetch brand concepts" });
    }
  });

  app.get("/api/concepts/:id", verifyConceptOwnership, async (req: Request, res: Response) => {
    try {
      // We already have the concept from the middleware and ownership is verified
      res.json(req.concept);
    } catch (error) {
      console.error("Error fetching brand concept:", error);
      res.status(500).json({ error: "Failed to fetch brand concept" });
    }
  });

  app.post("/api/generate-concept", (req: Request, res: Response) => {
    log("Received request to generate brand concept");
    
    // Increase server timeout for this specific request
    res.setTimeout(180000); // 3 minute timeout
    
    // Helper function to safely write JSON to the response
    const safeWrite = (data: any) => {
      try {
        const jsonString = JSON.stringify(data);
        // Validate we're sending valid JSON by parsing it back
        JSON.parse(jsonString);
        res.write(jsonString);
        return true;
      } catch (err) {
        console.error("Failed to serialize response data:", err);
        return false;
      }
    };
    
    // First, validate the input data
    try {
      log("Validating brand input data");
      const brandInput = brandInputSchema.parse(req.body);
      log("Input data validated successfully");
      
      // Send immediate acknowledgment to prevent timeout
      res.writeHead(202, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked'
      });
      
      // Send initial response to keep connection alive
      safeWrite({
        status: "processing",
        progress: 10,
        message: "Brand concept generation has started. This may take up to 1-2 minutes to complete."
      });
      
      // Process the request asynchronously
      (async () => {
        try {
          // Send a progress update at 25% after 5 seconds
          setTimeout(() => {
            safeWrite({
              status: "progress",
              progress: 25,
              message: "Generating brand concept elements..."
            });
          }, 5000);
          
          // Send a progress update at 50% after 15 seconds
          setTimeout(() => {
            safeWrite({
              status: "progress",
              progress: 50,
              message: "Creating brand visual assets..."
            });
          }, 15000);
          
          log("Calling AI service to generate brand concept");
          const brandOutput = await generateBrandConcept(brandInput);
          log("AI service returned brand concept successfully");
          
          // Send a progress update at 90% before final response
          safeWrite({
            status: "progress",
            progress: 90,
            message: "Finalizing brand concept..."
          });
          
          // Wait a moment before sending final result (helps client processing)
          setTimeout(() => {
            // Send the final result
            const success = safeWrite({ 
              success: true,
              status: "complete",
              brandOutput
            });
            
            // If the write failed, try a simplified format
            if (!success) {
              console.warn("Failed to write complete brand output, sending simplified response");
              safeWrite({
                success: true,
                status: "complete",
                brandOutput: {
                  logo: brandOutput.logo,
                  colors: brandOutput.colors || [],
                  typography: brandOutput.typography || { headings: "Arial", body: "Arial" },
                  landingPageHero: brandOutput.landingPageHero || {},
                  logoDescription: brandOutput.logoDescription || "Logo"
                }
              });
            }
            
            res.end();
          }, 1000);
        } catch (error) {
          console.error("Error generating brand concept:", error);
          safeWrite({ 
            success: false, 
            status: "error",
            error: "Failed to generate brand concept",
            message: error instanceof Error ? error.message : String(error)
          });
          res.end();
        }
      })();
      
    } catch (error) {
      if (error instanceof ZodError) {
        log(`Validation error: ${JSON.stringify(error.errors)}`);
        return res.status(400).json({ error: "Invalid brand input data", details: error.errors });
      }
      
      console.error("Error in generate-concept:", error);
      res.status(500).json({ error: "Failed to process request" });
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
        "black-forest-labs/flux-pro",
        {
          input: {
            prompt: testPrompt,
            width: 1024,
            height: 1024,
            negative_prompt: "low quality, distorted",
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
  
  // Test route for Claude concept generation
  app.post("/api/test-claude", async (req: Request, res: Response) => {
    try {
      const { brandName, industry, description, values, designStyle, colorPreferences } = req.body;
      
      if (!brandName) {
        return res.status(400).json({ error: "Brand name is required" });
      }
      
      log("Testing Claude concept generation...");
      // Generate a unique timestamp seed
      const uniqueSeed = Date.now() % 1000;
      const varietyFactor = Math.floor(Math.random() * 10);
      
      const prompt = `
        Generate a fresh, original, and comprehensive brand identity for a company with the following details:
        - Brand Name: ${brandName}
        - Industry: ${industry || 'General business'}
        - Description: ${description || 'A modern business'}
        - Values: ${Array.isArray(values) ? values.join(', ') : 'Quality, Innovation'}
        - Design Style: ${designStyle || 'modern'}
        - Color Preferences: ${Array.isArray(colorPreferences) ? colorPreferences.join(', ') : 'Open to suggestions'}
        - Unique design seed: ${uniqueSeed}
        - Variety factor: ${varietyFactor}
        
        Include the following in your response:
        1. A distinctive color palette with 4-5 colors (primary, secondary, accent, and base colors)
        2. Typography recommendations (heading and body fonts) that perfectly match the brand personality
        3. A creative and memorable logo concept description
        
        Format your response as a structured JSON object with these fields (and nothing else):
        {
          "colors": [
            { "name": "Primary", "hex": "#hex", "type": "primary" },
            { "name": "Secondary", "hex": "#hex", "type": "secondary" },
            { "name": "Accent", "hex": "#hex", "type": "accent" },
            { "name": "Base", "hex": "#hex", "type": "base" }
          ],
          "typography": {
            "headings": "Font Name",
            "body": "Font Name"
          },
          "logoDescription": "Description of the logo concept"
        }
        
        Return only the JSON object with no additional text before or after.
      `;
      
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 2000,
        temperature: 0.7,
        system: "You are a skilled brand identity designer. Provide detailed brand concepts in JSON format only. Be creative and varied with your designs. Every time you're called, generate something different and unique.",
        messages: [{ role: "user", content: prompt }],
      });
      
      // Extract the design concept
      let jsonStr = '';
      if (response.content[0].type === 'text') {
        const content = response.content[0].text;
        if (!content) throw new Error("Empty response from Claude");
        
        // Extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        jsonStr = jsonMatch ? jsonMatch[0] : content;
      } else {
        throw new Error("Unexpected response format from Claude");
      }
      
      const parsedOutput = JSON.parse(jsonStr);
      
      res.json({
        success: true,
        message: "Claude concept generation successful",
        brandConcept: parsedOutput
      });
      
    } catch (error: any) {
      console.error("Claude concept generation error:", error);
      const errorMessage = error?.message || "Unknown error";
      res.status(500).json({ error: "Claude concept generation failed", details: errorMessage });
    }
  });
  
  // Test route for FLUX logo generation 
  app.post("/api/test-flux-logo", async (req: Request, res: Response) => {
    try {
      const { brandName, industry, description, values, style, colors } = req.body;
      
      if (!brandName) {
        return res.status(400).json({ error: "Brand name is required" });
      }
      
      log("Testing FLUX logo generation with correct parameters...");
      
      // Import the logo generation function
      const { generateLogo } = await import('./openai');
      
      // Call the generate logo function with the full parameter set
      // Including the optimal parameters for Flux Schnell model
      const logoResult = await generateLogo({
        brandName,
        industry: industry || "Technology",
        description: description || `${brandName} is a professional and innovative company.`,
        values: Array.isArray(values) ? values : ["Innovation", "Quality", "Trust"],
        style: style || "Modern",
        colors: Array.isArray(colors) ? colors : ["#3366CC", "#FF9900"],
        promptOverride: req.body.prompt // Optional prompt override
      });
      
      log("Logo generation successful with Flux Schnell model");
      
      res.json({
        success: true,
        message: "FLUX logo generation successful",
        logoSvg: logoResult.svg,
        prompt: logoResult.prompt
      });
    } catch (error: any) {
      console.error("FLUX logo generation error:", error);
      const errorMessage = error?.message || "Unknown error";
      res.status(500).json({ error: "FLUX logo generation failed", details: errorMessage });
    }
  });
  
  // Test endpoint for Supabase storage functionality
  app.post("/api/test-storage", async (req: Request, res: Response) => {
    try {
      // Import the storage utility directly
      const { uploadImageFromUrl } = await import('./storage-utils');
      
      // Get image URL from request body or use a default test image
      const { imageUrl } = req.body;
      const testImageUrl = imageUrl || 'https://picsum.photos/200'; // Use Lorem Picsum as a test image source
      
      log(`Testing Supabase storage with image URL: ${testImageUrl}`);
      
      // Attempt to upload the image
      const storedImageUrl = await uploadImageFromUrl(testImageUrl);
      
      if (storedImageUrl) {
        log(`Successfully stored image in Supabase: ${storedImageUrl}`);
        res.json({ 
          success: true, 
          message: 'Image successfully uploaded to Supabase storage',
          originalUrl: testImageUrl,
          storedUrl: storedImageUrl 
        });
      } else {
        log('Failed to store image in Supabase - using original URL as fallback');
        res.json({ 
          success: false, 
          message: 'Image could not be uploaded to Supabase storage, using original URL as fallback',
          originalUrl: testImageUrl,
          storedUrl: null
        });
      }
    } catch (error) {
      console.error('Error in test-storage endpoint:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error testing Supabase storage',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Logo generation route - handles both logos and billboard generation
  app.post("/api/generate-logo", async (req: Request, res: Response) => {
    try {
      const { brandName, industry, description, values, style, colors, prompt } = req.body;
      
      if (!brandName || !industry) {
        return res.status(400).json({ error: "Brand name and industry are required" });
      }
      
      // Import the logo generation function from openai.ts
      const { generateLogo } = await import('./openai');
      
      // If a prompt is provided, use it for custom image generation (billboard, etc.)
      if (prompt) {
        try {
          // For billboard or other custom generations with Flux
          console.log("Generating custom image with Flux AI using prompt:", prompt.substring(0, 100) + "...");
          
          // Import Replicate from openai.ts
          const openaiModule = await import('./openai');
          
          // Call Replicate's Flux Schnell model
          const imageOutput = await openaiModule.replicate.run(
            "black-forest-labs/flux-schnell", // Using the correct model
            {
              input: {
                prompt: prompt,
                width: 1024, 
                height: 768, // Billboard aspect ratio
                negative_prompt: "low quality, distorted, ugly, bad proportions, text errors, text cut off, spelling errors",
                num_outputs: 1,
                num_inference_steps: 4  // Maximum allowed value for Flux Schnell model
              }
            }
          );
          
          // Get the image URL
          const imageUrl = Array.isArray(imageOutput) ? imageOutput[0] : String(imageOutput);
          
          // Create SVG wrapper
          const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1024 768">
            <image href="${imageUrl}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/>
          </svg>`;
          
          return res.json({ 
            success: true,
            logoSvg: logoSvg,
            imageUrl: imageUrl
          });
        } catch (error) {
          console.error("Flux AI generation error:", error);
          return res.status(500).json({ error: "Failed to generate custom image" });
        }
      }
      
      // Default path: Generate a regular logo
      const logoResult = await generateLogo({
        brandName,
        industry,
        description: description || "", // Handle undefined description
        values: Array.isArray(values) ? values : [],  // Handle undefined values
        style: style || "modern",       // Default style
        colors: Array.isArray(colors) ? colors : []   // Handle undefined colors
      });
      
      res.json({ 
        success: true,
        logoSvg: logoResult.svg,
        prompt: logoResult.prompt
      });
    } catch (error) {
      console.error("Error generating logo or custom image:", error);
      res.status(500).json({ error: "Failed to generate logo or custom image" });
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

  // Endpoint to regenerate a specific element of a brand concept
  app.post("/api/regenerate-element", async (req: Request, res: Response) => {
    try {
      const { conceptId, elementType, newValues, brandInputs, projectId } = req.body;
      
      if (!conceptId || !elementType || !brandInputs || !projectId) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields (conceptId, elementType, brandInputs, projectId)" 
        });
      }
      
      // Get the existing concept
      const existingConcept = await storage.getBrandConcept(conceptId);
      if (!existingConcept) {
        return res.status(404).json({ success: false, message: "Brand concept not found" });
      }
      
      // Clone the current brand output
      const brandOutput = JSON.parse(JSON.stringify(existingConcept.brandOutput));
      
      // Import Anthropic for generating elements via free-form text
      const { anthropic } = await import('./openai');
      
      // Based on elementType, merge the new values
      if (elementType === 'colors') {
        // Check if we're doing manual edit or AI-based generation
        if (newValues && typeof newValues === 'object' && newValues.description) {
          // AI-based generation from description
          const description = newValues.description;
          console.log(`Generating colors based on description: ${description}`);
          
          try {
            // Use Claude to generate color palette based on the description
            const claudeResponse = await anthropic.messages.create({
              model: "claude-3-5-sonnet-20240620",
              max_tokens: 1000,
              temperature: 0.3,
              system: "You are a brand design expert specializing in color theory who creates beautiful color palettes.",
              messages: [
                { 
                  role: "user", 
                  content: `Generate a brand color palette based on this description: "${description}". The brand is named "${brandInputs.brandName ? brandInputs.brandName : 'Brand'}" in the "${brandInputs.industry ? brandInputs.industry : 'general'}" industry.
                  
                  Return a JSON object with 4 colors in this exact format:
                  {
                    "primary": { "name": "Primary", "hex": "#HEXCODE" },
                    "secondary": { "name": "Secondary", "hex": "#HEXCODE" },
                    "accent": { "name": "Accent", "hex": "#HEXCODE" },
                    "base": { "name": "Base", "hex": "#HEXCODE" }
                  }
                  
                  Make sure all hex codes are valid 6-digit codes (like #RRGGBB). Use colors that match the description perfectly.
                  Your entire response must be just this JSON, nothing else.`
                }
              ],
            });
            
            // Extract JSON from Claude's response
            let jsonResponse = '';
            if (claudeResponse.content[0].type === 'text') {
              const content = claudeResponse.content[0].text;
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              jsonResponse = jsonMatch ? jsonMatch[0] : content;
            }
            
            // Parse the JSON response
            let colorData;
            try {
              colorData = JSON.parse(jsonResponse);
              
              // Transform the data into our expected format
              const formattedColors = [
                { name: "Primary", hex: colorData.primary.hex, type: "primary" },
                { name: "Secondary", hex: colorData.secondary.hex, type: "secondary" },
                { name: "Accent", hex: colorData.accent.hex, type: "accent" },
                { name: "Base", hex: colorData.base.hex, type: "base" }
              ];
              
              // Update the colors in the brand output
              brandOutput.colors = formattedColors;
            } catch (jsonError) {
              console.error("Error parsing Claude color JSON:", jsonError);
              
              // Fallback colors based on description keywords
              const fallbackColors = [
                { name: "Primary", hex: description.includes("blue") ? "#2563EB" : 
                                       description.includes("green") ? "#10B981" : 
                                       description.includes("red") ? "#EF4444" : 
                                       description.includes("purple") ? "#8B5CF6" : 
                                       description.includes("dark") ? "#1F2937" : "#3B82F6", 
                  type: "primary" },
                { name: "Secondary", hex: description.includes("monochrome") ? "#4B5563" : "#0F766E", type: "secondary" },
                { name: "Accent", hex: description.includes("earthy") ? "#D97706" : "#38BDF8", type: "accent" },
                { name: "Base", hex: description.includes("light") ? "#F9FAFB" : "#1F2937", type: "base" }
              ];
              
              // Update colors with fallback
              brandOutput.colors = fallbackColors;
              console.log("Using fallback colors:", fallbackColors);
            }
            
          } catch (error) {
            console.error("Error generating colors with AI:", error);
            
            // Instead of failing, use fallback colors based on description keywords
            const fallbackColors = [
              { name: "Primary", hex: description.includes("blue") ? "#2563EB" : 
                                     description.includes("green") ? "#10B981" : 
                                     description.includes("red") ? "#EF4444" : 
                                     description.includes("purple") ? "#8B5CF6" : 
                                     description.includes("dark") ? "#1F2937" : "#3B82F6", 
                type: "primary" },
              { name: "Secondary", hex: description.includes("monochrome") ? "#4B5563" : "#0F766E", type: "secondary" },
              { name: "Accent", hex: description.includes("earthy") ? "#D97706" : "#38BDF8", type: "accent" },
              { name: "Base", hex: description.includes("light") ? "#F9FAFB" : "#1F2937", type: "base" }
            ];
            
            // Update with fallback colors
            brandOutput.colors = fallbackColors;
            console.log("Using fallback colors due to error:", fallbackColors);
          }
        } else {
          // Manual edit - direct update
          brandOutput.colors = newValues;
        }
      } else if (elementType === 'typography') {
        // Check if we're doing manual edit or AI-based generation
        if (newValues && typeof newValues === 'object' && newValues.description) {
          // AI-based generation from description
          const description = newValues.description;
          console.log(`Generating typography based on description: ${description}`);
          
          try {
            // Use Claude for typography generation to match our other components
            let typographyData;
            
            try {
              // Import anthropic from openai.ts file
              const { anthropic } = await import('./openai');
              
              const claudeResponse = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20240620",
                max_tokens: 1000,
                temperature: 0.3,
                system: "You are a typography expert. Choose appropriate fonts based on the user's description.",
                messages: [
                  { 
                    role: "user", 
                    content: `Generate a font combination based on this description: "${description}". The brand is named "${brandInputs.brandName ? brandInputs.brandName : 'Brand'}" in the "${brandInputs.industry ? brandInputs.industry : 'general'}" industry.
                    
                    Choose from these available fonts:
                    - Sans-serif: Arial, Roboto, Montserrat, Open Sans, Lato, Poppins, Raleway, Nunito, Source Sans Pro, Oswald, Ubuntu, PT Sans, Noto Sans, Inter, Work Sans, Quicksand, Barlow, Mulish, Rubik, Karla
                    - Serif: Playfair Display, Merriweather, Georgia, Times New Roman, Baskerville, Garamond, Didot, Bodoni, Caslon, Palatino, Cambria
                    - Display & decorative: Bebas Neue, Abril Fatface, Pacifico, Comfortaa, Dancing Script, Lobster, Caveat, Sacramento, Righteous, Permanent Marker
                    - Tech & Modern: Audiowide, Orbitron, Exo, Exo 2, Rajdhani, Quantico, Teko, Aldrich, Syncopate, Michroma
                    - Creative & Unique: Poiret One, Julius Sans One, Amatic SC, Handlee, Kalam, Indie Flower, Patrick Hand
                    - Monospace: Courier, Courier New, Roboto Mono, IBM Plex Mono, Source Code Pro, Space Mono, Fira Code
                    
                    Return only a JSON object with this structure:
                    {"headings": "Font Name", "body": "Font Name"}
                    
                    Important: Your entire response must be just this JSON object, nothing else.`
                  }
                ],
              });
            
              // Extract the JSON from Claude's response
              let jsonResponse = '';
              if (claudeResponse.content[0].type === 'text') {
                const content = claudeResponse.content[0].text;
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                jsonResponse = jsonMatch ? jsonMatch[0] : content;
              }
              
              try {
                typographyData = JSON.parse(jsonResponse);
              } catch (jsonError) {
                console.error("Error parsing Claude JSON:", jsonError);
                // Fallback to default values if JSON parsing fails
                typographyData = {
                  headings: description.toLowerCase().includes("tech") ? "Audiowide" : 
                             description.toLowerCase().includes("modern") ? "Montserrat" : 
                             description.toLowerCase().includes("elegant") ? "Playfair Display" : "Montserrat",
                  body: "Open Sans"
                };
              }
            } catch (claudeError) {
              console.error("Claude API error:", claudeError);
              
              // Use smarter fallback typography based on description keywords
              typographyData = {
                headings: description.toLowerCase().includes("tech") ? "Audiowide" : 
                          description.toLowerCase().includes("modern") ? "Montserrat" : 
                          description.toLowerCase().includes("elegant") || description.toLowerCase().includes("luxury") ? "Playfair Display" : 
                          description.toLowerCase().includes("playful") || description.toLowerCase().includes("fun") ? "Fredoka One" :
                          description.toLowerCase().includes("clean") ? "Poppins" :
                          description.toLowerCase().includes("creative") ? "Poiret One" :
                          description.toLowerCase().includes("handmade") ? "Indie Flower" : "Montserrat",
                body: description.toLowerCase().includes("tech") ? "Roboto Mono" :
                      description.toLowerCase().includes("elegant") ? "Baskerville" :
                      description.toLowerCase().includes("classic") ? "Georgia" : "Open Sans"
              };
            }
            
            // Validate the typography data
            if (!typographyData || !typographyData.headings || !typographyData.body) {
              typographyData = {
                headings: "Montserrat",
                body: "Open Sans"
              };
            }
            
            // Update the typography in the brand output
            brandOutput.typography = {
              headings: typographyData.headings,
              body: typographyData.body
            };
            
          } catch (error) {
            console.error("Error generating typography with AI:", error);
            
            // Instead of failing, just use the description to make a simple font selection
            // This ensures the UI flow isn't broken even if AI services fail
            const simpleTypography = {
              headings: description.toLowerCase().includes("tech") ? "Audiowide" : 
                        description.toLowerCase().includes("modern") ? "Montserrat" : 
                        description.toLowerCase().includes("elegant") ? "Playfair Display" : 
                        description.toLowerCase().includes("playful") ? "Fredoka One" : "Montserrat",
              body: "Open Sans"
            };
            
            // Update the typography with our simple fallback
            brandOutput.typography = simpleTypography;
            
            // Just log the error, don't fail the request
            console.log("Using fallback typography:", simpleTypography);
          }
        } else {
          // Manual edit - direct update
          brandOutput.typography = newValues;
        }
      } else if (elementType === 'logo') {
        // For logo regeneration, we need to call the FLUX API
        try {
          // Import the generateLogo function
          const { generateLogo, generateMonochromeLogo, generateReverseLogo } = await import('./openai');
          
          // Check if we have a custom description or prompt override
          let customDescription = '';
          let promptOverride = '';
          
          if (newValues && typeof newValues === 'object') {
            // Check for custom description
            if (newValues.description) {
              customDescription = newValues.description;
              console.log(`Generating logo with custom description: ${customDescription}`);
            }
            
            // Check for prompt override (takes precedence over description)
            if (newValues.prompt) {
              promptOverride = newValues.prompt;
              console.log(`Generating logo with custom prompt override`);
            }
          }
          
          // Generate a new logo using the current brand input
          const { svg: logoSvg, prompt: logoPrompt } = await generateLogo({
            brandName: brandInputs.brandName,
            industry: brandInputs.industry || '',
            description: customDescription || brandInputs.description,
            values: brandInputs.values.map((v: any) => v.value),
            style: brandInputs.designStyle,
            colors: brandInputs.colorPreferences || [],
            promptOverride: promptOverride // Use the prompt override if provided
          });
          
          // Generate monochrome and reverse versions
          const monochromeLogo = generateMonochromeLogo(logoSvg);
          const reverseLogo = generateReverseLogo(logoSvg);
          
          // Update the logo in the brand output
          brandOutput.logo = {
            primary: logoSvg,
            monochrome: monochromeLogo,
            reverse: reverseLogo,
            prompt: logoPrompt // Store the prompt for future edits
          };
          
          // Update the logo description in the brand output to match the custom description
          if (customDescription) {
            brandOutput.logoDescription = customDescription;
          }
        } catch (error: any) {
          console.error("Error regenerating logo:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to regenerate logo",
            error: error?.message || String(error)
          });
        }
      } else if (elementType === 'applications') {
        // For brand applications regeneration, we use Claude to generate application suggestions
        try {
          // Import Anthropic for generating applications via free-form text
          const { anthropic } = await import('./openai');
          
          // Check if we have a custom description
          let customDescription = '';
          if (newValues && typeof newValues === 'object' && newValues.description) {
            customDescription = newValues.description;
            console.log(`Generating brand applications with description: ${customDescription}`);
          }
          
          // If no custom description is provided, use a default one based on the brand info
          const description = customDescription || 
            `Brand applications for ${brandInputs.brandName} in the ${brandInputs.industry || 'general'} industry. The brand style is ${brandInputs.designStyle || 'modern'}.`;
          
          // We don't need to call Claude here since our mockups are already nicely designed
          // But we would in the future if we wanted to generate actual application designs
          
          // For now, we just store the applications description for reference
          brandOutput.applicationsDescription = description;
          
          // Update brand applications flag to indicate they've been customized
          brandOutput.hasCustomApplications = true;
          
          console.log("Brand applications updated with description:", description);
        } catch (error: any) {
          console.error("Error generating brand applications:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to generate brand applications",
            error: error?.message || String(error)
          });
        }
      } else {
        return res.status(400).json({ 
          success: false, 
          message: "Unsupported element type. Supported types: colors, typography, logo, applications" 
        });
      }
      
      // Update the brand concept with the new output
      const updatedConcept = await storage.updateBrandConcept(conceptId, {
        brandOutput: brandOutput
      });
      
      // Return success response
      res.json({
        success: true,
        message: `Brand ${elementType} has been regenerated successfully`,
        brandOutput
      });
      
    } catch (error: any) {
      console.error("Error regenerating brand element:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to regenerate brand element", 
        error: error?.message || String(error)
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
