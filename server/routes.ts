import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Replicate from "replicate";
import Anthropic from "@anthropic-ai/sdk";
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

  app.post("/api/generate-concept", (req: Request, res: Response) => {
    log("Received request to generate brand concept");
    
    // Increase server timeout for this specific request
    res.setTimeout(120000); // 2 minute timeout
    
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
      res.write(JSON.stringify({
        status: "processing",
        message: "Brand concept generation has started. This may take up to 1-2 minutes to complete."
      }));
      
      // Process the request asynchronously
      (async () => {
        try {
          log("Calling AI service to generate brand concept");
          const brandOutput = await generateBrandConcept(brandInput);
          log("AI service returned brand concept successfully");
          
          // Send the final result
          res.write(JSON.stringify({ 
            success: true,
            status: "complete",
            brandOutput
          }));
          
          res.end();
        } catch (error) {
          console.error("Error generating brand concept:", error);
          res.write(JSON.stringify({ 
            success: false, 
            error: "Failed to generate brand concept",
            message: error instanceof Error ? error.message : String(error)
          }));
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
      const { brandName, prompt } = req.body;
      
      if (!brandName || !prompt) {
        return res.status(400).json({ error: "Brand name and prompt are required" });
      }
      
      log("Testing direct FLUX logo generation...");
      // Initialize client for this test
      const testReplicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
      });
      
      log("Sending logo prompt to FLUX model...");
      const output = await testReplicate.run(
        "black-forest-labs/flux-pro",
        {
          input: {
            prompt: prompt,
            width: 1024,
            height: 1024,
            negative_prompt: "low quality, distorted, ugly, bad proportions, text errors",
            num_outputs: 1,
            num_inference_steps: 25
          }
        }
      );
      
      log("FLUX logo response: " + JSON.stringify(output));
      
      // Get the URL from the response
      const imageUrl = Array.isArray(output) ? output[0] : String(output);
      
      // Create an SVG wrapper for the image
      const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <image href="${imageUrl}" width="200" height="200" preserveAspectRatio="xMidYMid meet"/>
      </svg>`;
      
      res.json({
        success: true,
        message: "FLUX logo generation successful",
        imageUrl: imageUrl,
        logoSvg: logoSvg
      });
    } catch (error: any) {
      console.error("FLUX logo generation error:", error);
      const errorMessage = error?.message || "Unknown error";
      res.status(500).json({ error: "FLUX logo generation failed", details: errorMessage });
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
          
          // Check if we have a custom description
          let customDescription = '';
          if (newValues && typeof newValues === 'object' && newValues.description) {
            customDescription = newValues.description;
            console.log(`Generating logo with custom description: ${customDescription}`);
          }
          
          // Generate a new logo using the current brand input
          const logoSvg = await generateLogo({
            brandName: brandInputs.brandName,
            industry: brandInputs.industry || '',
            description: customDescription || brandInputs.description,
            values: brandInputs.values.map((v: any) => v.value),
            style: brandInputs.designStyle,
            colors: brandInputs.colorPreferences || []
          });
          
          // Generate monochrome and reverse versions
          const monochromeLogo = generateMonochromeLogo(logoSvg);
          const reverseLogo = generateReverseLogo(logoSvg);
          
          // Update the logo in the brand output
          brandOutput.logo = {
            primary: logoSvg,
            monochrome: monochromeLogo,
            reverse: reverseLogo
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
