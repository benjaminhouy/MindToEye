import type { Express, Request as ExpressRequest, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Replicate from "replicate";
import Anthropic from "@anthropic-ai/sdk";
import { 
  brandInputSchema, 
  insertBrandConceptSchema,
  insertProjectSchema,
  User, Project, BrandConcept, UserWithEmail
} from "@shared/schema";
import { generateBrandConcept, generateLogo } from "./openai";
import { log } from "./vite";
import { ZodError } from "zod";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Async version of scrypt
const scryptAsync = promisify(scrypt);

// Password hashing function
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

// Password comparison function
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

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
    let userId: number | undefined;
    let authId: string | undefined;

    // ALWAYS check for x-auth-id header first (most reliable method)
    if (req.headers['x-auth-id']) {
      authId = req.headers['x-auth-id'] as string;
      console.log("Auth ID from header in verifyProjectOwnership:", authId);
      
      // Try to parse as numeric ID first (for backward compatibility)
      const numericId = parseInt(authId);
      
      if (!isNaN(numericId)) {
        // If authId is a valid number, use it directly as userId
        userId = numericId;
        console.log("Using numeric authId directly as userId in verifyProjectOwnership:", userId);
      } else {
        // Otherwise, look up the user by Supabase authId (UUID)
        try {
          const user = await storage.getUserByAuthId(authId);
          if (user) {
            userId = user.id;
            console.log("Found user by Supabase authId in verifyProjectOwnership:", userId);
          } else {
            console.log("User not found for Supabase authId:", authId);
          }
        } catch (err) {
          console.error("Error looking up user by authId:", err);
        }
      }
    }
    // Extract from the Authorization header (Bearer token from Supabase) AS FALLBACK
    else if (req.headers.authorization) {
      try {
        // Get the Supabase token from Authorization header
        const token = req.headers.authorization.replace('Bearer ', '');
        console.log("Using authorization header as fallback in verifyProjectOwnership");
        
        // For debugging purposes, check if there's also an auth-id header with different capitalization
        const headers = Object.keys(req.headers).filter(h => h.toLowerCase().includes('auth'));
        if (headers.length > 0) {
          console.log("Available auth headers:", headers);
        }
        
        // Try to decode token to get Supabase user ID
        try {
          // Import the Supabase client to verify the token
          const { createSupabaseClientWithToken } = await import('./storage-utils');
          const userClient = createSupabaseClientWithToken(token);
          if (userClient) {
            const { data: userData } = await userClient.auth.getUser();
            if (userData?.user) {
              // Look up the user by Supabase authId (UUID)
              const user = await storage.getUserByAuthId(userData.user.id);
              if (user) {
                userId = user.id;
                console.log("Found user by auth token in verifyProjectOwnership:", userId);
              }
            }
          }
        } catch (tokenErr) {
          console.error("Error decoding auth token:", tokenErr);
        }
      } catch (err) {
        console.error("Error processing authorization:", err);
      }
    }
    
    // Get userId from params directly
    if (!userId && req.params.id) {
      // Try to get the project first to extract owner ID
      try {
        const projectId = parseInt(req.params.id || req.params.projectId);
        if (!isNaN(projectId)) {
          console.log("Attempting to get project details to extract owner:", projectId);
          const project = await storage.getProject(projectId);
          if (project) {
            console.log("Found project with ID", projectId, "owned by user", project.userId);
            
            // Check if the current authenticated user matches the authId in Supabase
            if (req.headers.authorization) {
              const token = req.headers.authorization.replace('Bearer ', '');
              try {
                // Import on demand to prevent circular dependencies
                const { createSupabaseClientWithToken } = await import('./storage-utils');
                const client = createSupabaseClientWithToken(token);
                if (client) {
                  const { data } = await client.auth.getUser();
                  if (data?.user) {
                    const user = await storage.getUserByAuthId(data.user.id);
                    if (user && user.id === project.userId) {
                      userId = user.id;
                      console.log("Verified user ownership via Supabase token, userId:", userId);
                    }
                  }
                }
              } catch (err) {
                console.error("Error verifying token:", err);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error getting project:", err);
      }
    }

    // Fallback to query params or body for development if userId is not set
    if (!userId) {
      userId = req.query.userId ? parseInt(req.query.userId as string) : 
               (req.body.userId ? parseInt(req.body.userId) : undefined);
      console.log("Using fallback userId from query/body:", userId);
    }
    
    if (isNaN(userId as number) || !userId) {
      // Log headers for debugging 
      console.log("Access denied. Headers:", Object.keys(req.headers));
      console.log("x-auth-id header:", req.headers['x-auth-id'] || 'not present');
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
    let userId: number | undefined;
    let authId: string | undefined;

    // ALWAYS check for x-auth-id header first (most reliable method)
    if (req.headers['x-auth-id']) {
      authId = req.headers['x-auth-id'] as string;
      console.log("Auth ID from header in verifyConceptOwnership:", authId);
      
      // Try to parse as numeric ID first (for backward compatibility)
      const numericId = parseInt(authId);
      
      if (!isNaN(numericId)) {
        // If authId is a valid number, use it directly as userId
        userId = numericId;
        console.log("Using numeric authId directly as userId in verifyConceptOwnership:", userId);
      } else {
        // Otherwise, look up the user by Supabase authId (UUID)
        try {
          const user = await storage.getUserByAuthId(authId);
          if (user) {
            userId = user.id;
            console.log("Found user by Supabase authId in verifyConceptOwnership:", userId);
          } else {
            console.log("User not found for Supabase authId:", authId);
          }
        } catch (err) {
          console.error("Error looking up user by authId:", err);
        }
      }
    }
    // Extract from the Authorization header (Bearer token from Supabase) AS FALLBACK
    else if (req.headers.authorization) {
      try {
        // Get the Supabase token from Authorization header
        const token = req.headers.authorization.replace('Bearer ', '');
        console.log("Using authorization header as fallback in verifyConceptOwnership");
        
        // For debugging purposes, check if there's also an auth-id header with different capitalization
        const headers = Object.keys(req.headers).filter(h => h.toLowerCase().includes('auth'));
        if (headers.length > 0) {
          console.log("Available auth headers:", headers);
        }
        
        // Try to decode token to get Supabase user ID
        try {
          // Import the Supabase client to verify the token
          const { createSupabaseClientWithToken } = await import('./storage-utils');
          const userClient = createSupabaseClientWithToken(token);
          if (userClient) {
            const { data: userData } = await userClient.auth.getUser();
            if (userData?.user) {
              // Look up the user by Supabase authId (UUID)
              const user = await storage.getUserByAuthId(userData.user.id);
              if (user) {
                userId = user.id;
                console.log("Found user by auth token in verifyConceptOwnership:", userId);
              }
            }
          }
        } catch (tokenErr) {
          console.error("Error decoding auth token in concept middleware:", tokenErr);
        }
      } catch (err) {
        console.error("Error processing authorization:", err);
      }
    }
    
    // Get userId from params directly
    if (!userId && req.params.id) {
      // Try to get the concept first to extract owner info
      try {
        const conceptId = parseInt(req.params.id);
        if (!isNaN(conceptId)) {
          console.log("Attempting to get concept details to extract owner:", conceptId);
          const concept = await storage.getBrandConcept(conceptId);
          if (concept) {
            const project = await storage.getProject(concept.projectId);
            if (project) {
              console.log("Found concept with ID", conceptId, "in project", concept.projectId, "owned by user", project.userId);
              
              // Check if the current authenticated user matches the authId in Supabase
              if (req.headers.authorization) {
                const token = req.headers.authorization.replace('Bearer ', '');
                try {
                  // Import on demand to prevent circular dependencies
                  const { createSupabaseClientWithToken } = await import('./storage-utils');
                  const client = createSupabaseClientWithToken(token);
                  if (client) {
                    const { data } = await client.auth.getUser();
                    if (data?.user) {
                      const user = await storage.getUserByAuthId(data.user.id);
                      if (user && user.id === project.userId) {
                        userId = user.id;
                        console.log("Verified user ownership via Supabase token in concept middleware, userId:", userId);
                      }
                    }
                  }
                } catch (err) {
                  console.error("Error verifying token in concept middleware:", err);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Error getting concept:", err);
      }
    }

    // Fallback to query params or body for development if userId is not set
    if (!userId) {
      userId = req.query.userId ? parseInt(req.query.userId as string) : 
               (req.body.userId ? parseInt(req.body.userId) : undefined);
      console.log("Using fallback userId from query/body:", userId);
    }
    
    if (isNaN(userId as number) || !userId) {
      // Log headers for debugging
      console.log("Access denied in concept middleware. Headers:", Object.keys(req.headers));
      console.log("x-auth-id header in concept middleware:", req.headers['x-auth-id'] || 'not present');
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
  // Let the Vite middleware handle all root-level routes
  // Vite will serve the React application and React router will handle navigation
  // These routes are intentionally left empty so they'll fall through
  // to the Vite middleware defined in server/vite.ts

  // API health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });
  
  // Get currently authenticated user or user by ID
  app.get("/api/user", async (req: Request, res: Response) => {
    try {
      // Check if a userId query parameter was provided
      const userId = req.query.userId?.toString();
      const authId = req.headers['x-auth-id']?.toString();
      
      // Log the request details for debugging
      console.log(`/api/user endpoint called with userId=${userId}, authId=${authId}`);
      console.log("Headers:", JSON.stringify(req.headers, null, 2));
      
      // Direct user ID lookup - either from query param or auth header
      if (userId) {
        // Try both formats - authId (UUID) or numeric ID
        let user = await storage.getUserByAuthId(userId);
        if (!user && !isNaN(Number(userId))) {
          user = await storage.getUser(Number(userId));
        }
        
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        
        // Return minimal user data for UI display with email derived from username
        const userWithEmail: UserWithEmail = {
          ...user,
          email: user.username // Use username as email since our schema doesn't have a separate email field
        };
        
        return res.json(userWithEmail);
      }
      
      // Look up by auth header if no userId specified
      if (authId) {
        // Try both formats - authId (UUID) or numeric ID
        let user = await storage.getUserByAuthId(authId);
        if (!user && !isNaN(Number(authId))) {
          user = await storage.getUser(Number(authId));
        }
        
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        
        // Return minimal user data for UI display with email derived from username
        const userWithEmail: UserWithEmail = {
          ...user,
          email: user.username // Use username as email since our schema doesn't have a separate email field
        };
        
        return res.json(userWithEmail);
      }
      
      // If no userId or authId provided, return 401
      return res.status(401).json({ error: "Authentication required" });
    } catch (error) {
      console.error("Error in /api/user endpoint:", error);
      res.status(500).json({ error: "Failed to retrieve user data" });
    }
  });
  
  // Test endpoint for Supabase Admin API integration
  app.get("/api/test-supabase-admin", async (_req: Request, res: Response) => {
    try {
      // Import the Supabase admin client directly
      const supabaseAdminModule = await import('./supabase-admin');
      const { supabaseAdmin } = supabaseAdminModule;
      
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          message: "Supabase Admin client not initialized",
          error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
        });
      }
      
      // Test if we can list users (this will validate the service role key)
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1
      });
      
      if (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to connect to Supabase Admin API",
          error: error.message
        });
      }
      
      return res.status(200).json({
        success: true,
        message: "Successfully connected to Supabase Admin API",
        usersCount: data.users.length > 0 ? 
          `Found at least ${data.users.length} user(s)` : 
          "No users found, but connection successful"
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Error testing Supabase Admin API",
        error: error.message || String(error)
      });
    }
  });
  
  // Test endpoint for Supabase storage
  app.get("/api/check-storage-policies", async (req: Request, res: Response) => {
    try {
      // Extract JWT from the request for authenticated policy checks
      const authHeader = req.headers.authorization;
      const jwtToken = authHeader ? authHeader.split(' ')[1] : undefined;
      const { checkStoragePolicies } = await import('./check-storage-policy');
      const { createSupabaseClientWithToken } = await import('./storage-utils');
      
      // First try with the JWT token if available
      console.log(`Checking storage policies${jwtToken ? ' with JWT token' : ' without JWT token'}...`);
      
      // Define the result type locally
      type JwtTestResultType = { 
        success: boolean; 
        reason: string; 
        message?: string;
      };
      
      let jwtTestResult: JwtTestResultType = { 
        success: false, 
        reason: "No JWT token provided" 
      };
      
      if (jwtToken) {
        // Try a direct test upload using the JWT token
        const storageClient = createSupabaseClientWithToken(jwtToken);
        if (storageClient) {
          try {
            const testContent = Buffer.from('Storage policy test with JWT - ' + new Date().toISOString());
            const testPath = `policy-test/jwt-${Date.now()}.txt`;
            
            console.log(`Testing file upload to ${testPath} with JWT token...`);
            
            const { error: uploadError } = await storageClient
              .storage
              .from('assets')
              .upload(testPath, testContent, {
                contentType: 'text/plain',
                upsert: true
              });
            
            if (uploadError) {
              console.log('JWT token upload test failed:', uploadError.message);
              jwtTestResult = {
                success: false,
                reason: uploadError.message,
                message: "RLS policy may be missing or incorrect"
              };
            } else {
              console.log('JWT token upload test succeeded!');
              jwtTestResult = { 
                success: true,
                reason: "Upload successful" 
              };
              // Clean up test file
              await storageClient.storage.from('assets').remove([testPath]);
            }
          } catch (jwtError) {
            console.error('Error in JWT token test:', jwtError);
            jwtTestResult = {
              success: false,
              reason: jwtError instanceof Error ? jwtError.message : String(jwtError),
              message: "Exception occurred during JWT test"
            };
          }
        } else {
          jwtTestResult = {
            success: false,
            reason: "Failed to create Supabase client with token"
          };
        }
      }
      
      // Also run the standard policy check
      const result = await checkStoragePolicies();
      
      // Add JWT test results to the response
      result.jwtTest = jwtTestResult;
      
      res.json(result);
    } catch (error) {
      console.error('Error checking storage policies:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to check storage policies',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Debug endpoint for directly testing Supabase storage
  app.get("/api/debug-supabase-storage", async (req: Request, res: Response) => {
    try {
      // Import the supabase client
      const { supabase } = await import('./storage-utils');
      
      if (!supabase) {
        return res.status(500).json({ 
          success: false, 
          message: "Supabase client not initialized. Check environment variables." 
        });
      }
      
      // First, list all buckets to see what's available
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        return res.status(500).json({ 
          success: false, 
          message: "Failed to list buckets", 
          error: bucketsError.message 
        });
      }
      
      // Check if the assets bucket exists
      const assetsBucket = buckets.find(bucket => bucket.name === 'assets');
      
      let listResult = null;
      let testUploadResult = null;
      
      // If assets bucket exists, try to list files
      if (assetsBucket) {
        const { data: files, error: listError } = await supabase
          .storage
          .from('assets')
          .list();
          
        listResult = {
          success: !listError,
          files: files || [],
          error: listError ? listError.message : null
        };
        
        // Try a test upload if listing succeeded
        if (!listError) {
          // Create a small test file
          const testSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><circle cx="25" cy="25" r="20" fill="#10B981"/></svg>`;
          const testData = Buffer.from(testSvg);
          const testPath = `test-upload-${Date.now()}.svg`;
          
          const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('assets')
            .upload(testPath, testData, {
              contentType: 'image/svg+xml',
              upsert: true
            });
          
          testUploadResult = {
            success: !uploadError,
            path: uploadData?.path || null,
            error: uploadError ? uploadError.message : null
          };
        }
      }
      
      // Return comprehensive debug information
      res.json({
        success: true,
        supabaseInitialized: !!supabase,
        bucketsCount: buckets.length,
        bucketsFound: buckets.map(b => b.name),
        assetsBucketExists: !!assetsBucket,
        assetsBucketInfo: assetsBucket || null,
        listResult,
        testUploadResult,
        supabaseUrl: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.substring(0, 20)}...` : null,
        environmentVariablesSet: {
          SUPABASE_URL: !!process.env.SUPABASE_URL,
          SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
          SUPABASE_DB_URL: !!process.env.SUPABASE_DB_URL,
        }
      });
    } catch (error) {
      console.error("Error debugging Supabase storage:", error);
      res.status(500).json({ 
        success: false, 
        message: "Unexpected error during storage debug", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/storage-setup-guide", async (_req: Request, res: Response) => {
    try {
      const { generateStorageSetupInstructions } = await import('./storage-fix-guide');
      const instructions = await generateStorageSetupInstructions();
      res.json({ 
        success: true, 
        setupGuide: instructions
      });
    } catch (error) {
      console.error('Error generating storage setup guide:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate storage setup guide'
      });
    }
  });
  
  app.get("/api/test-storage", async (req: Request, res: Response) => {
    try {
      const { initializeStorageBucket } = await import('./storage-utils');
      
      console.log('Testing Supabase storage connection from API endpoint...');
      const success = await initializeStorageBucket();
      
      // Get auth ID from headers for more detailed testing
      const authId = req.headers['x-auth-id'] as string;
      console.log(`Test storage auth ID from headers: ${authId || 'not provided'}`);
      
      // Create a quick test file to verify write access
      if (success && authId) {
        const { supabase } = await import('./storage-utils');
        if (supabase) {
          const testContent = Buffer.from('Test file content');
          const testPath = `${authId}/test-files/test-${Date.now()}.txt`;
          
          console.log(`Attempting to upload test file to ${testPath}...`);
          
          const { error: uploadError } = await supabase
            .storage
            .from('assets') // Use the same bucket name as in storage-utils.ts
            .upload(testPath, testContent, {
              contentType: 'text/plain',
              upsert: true
            });
            
          if (uploadError) {
            console.error('Error uploading test file:', uploadError.message);
            return res.json({ 
              status: "storage-error", 
              bucketInitialized: success,
              uploadSuccess: false,
              error: uploadError.message,
              authIdProvided: !!authId
            });
          }
          
          console.log('Test file upload successful!');
          
          // Try to list the contents of the user's folder
          const { data: filesList, error: listError } = await supabase
            .storage
            .from('assets')
            .list(`${authId}`);
            
          const fileCount = filesList?.length || 0;
          console.log(`Found ${fileCount} files in user folder.`);
          
          return res.json({ 
            status: "ok", 
            bucketInitialized: success,
            uploadSuccess: true,
            fileCount: fileCount,
            filesInRoot: filesList || [],
            authIdProvided: !!authId
          });
        }
      }
      
      res.json({ 
        status: success ? "ok" : "error", 
        bucketInitialized: success,
        authIdProvided: !!authId
      });
    } catch (error) {
      console.error('Error testing Supabase storage:', error);
      res.status(500).json({ 
        status: "error", 
        message: "Failed to test Supabase storage",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // User registration route for Supabase Auth
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      const { email, authId } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(email);
      if (existingUser) {
        // If user exists, just return the user
        console.log(`User already exists in database: ID=${existingUser.id}, Email=${email}`);
        return res.status(200).json(existingUser);
      }
      
      // Create user in our database
      const userData = {
        username: email,
        password: "auth-via-supabase", // Placeholder since auth is handled by Supabase
        authId: authId || null,
      };
      
      const user = await storage.createUser(userData);
      
      console.log(`User created in database: ID=${user.id}, Email=${email}, AuthID=${authId || 'none'}`);
      
      res.status(201).json(user);
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });
  
  // Legacy demo user creation route (keeping for backwards compatibility)
  app.post("/api/demo-user", async (req: Request, res: Response) => {
    try {
      // Create a unique demo user with timestamp
      const timestamp = new Date().getTime();
      const demoEmail = `demo-user-${timestamp}@mindtoeye.demo`;
      const demoAuthId = `demo-${timestamp}`;
      
      // Create demo user in our database
      const userData = {
        username: demoEmail,
        password: "demo-password", // Not used for authentication
        authId: demoAuthId,
      };
      
      const user = await storage.createUser(userData);
      
      console.log(`Demo user created: ID=${user.id}, Email=${demoEmail}, AuthID=${demoAuthId}`);
      
      // Return user with auth credentials
      res.status(201).json({
        ...user,
        isDemo: true,
        demoAuthId
      });
    } catch (error) {
      console.error("Error creating demo user:", error);
      res.status(500).json({ error: "Failed to create demo user" });
    }
  });
  
  // Anonymous user registration with Supabase
  app.post("/api/register-anonymous", async (req: Request, res: Response) => {
    try {
      // Get the authorization token from the header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Missing or invalid authorization token" });
      }
      
      const token = authHeader.split(' ')[1];
      
      // Verify the Supabase token by calling their auth API
      const { supabase } = await import('./storage-utils');
      if (!supabase) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      // Get the user from the token
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !userData?.user) {
        console.error("Error verifying Supabase token:", userError);
        return res.status(401).json({ error: "Invalid authentication token" });
      }
      
      // Get the authId from Supabase user
      const authId = userData.user.id;
      
      // Check if this user already exists in our database
      let user = await storage.getUserByAuthId(authId);
      
      if (!user) {
        // Create a new user in our database
        const timestamp = new Date().getTime();
        const username = `anon-${timestamp}@mindtoeye.demo`;
        
        const newUser = {
          username,
          password: `anon-password-${Date.now()}`, // Random password for anonymous user
          authId,
          isDemo: true, // Mark as demo user
        };
        
        user = await storage.createUser(newUser);
        console.log(`Anonymous user created: ID=${user.id}, AuthID=${authId}`);
      } else {
        console.log(`Existing anonymous user found: ID=${user.id}, AuthID=${authId}`);
      }
      
      // Return the user information
      res.status(201).json({
        ...user,
        isDemo: true
      });
    } catch (error) {
      console.error("Error registering anonymous user:", error);
      res.status(500).json({ error: "Failed to register anonymous user" });
    }
  });

  // Route to save a demo account's work to a regular account
  app.post("/api/save-demo-account", async (req: Request, res: Response) => {
    try {
      // Get the authorization token and auth ID
      const authHeader = req.headers.authorization;
      const authId = req.headers['x-auth-id'] as string;
      
      if (!authHeader && !authId) {
        return res.status(401).json({ error: "Missing authentication details" });
      }
      
      // Get the new email from the request body
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required to save your work" });
      }
      
      // Find the user by authId
      let userId: number | undefined;
      
      if (authId) {
        const user = await storage.getUserByAuthId(authId);
        if (user) {
          userId = user.id;
        }
      }
      
      if (!userId) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if the user is actually a demo user
      if (!user.isDemo) {
        return res.status(400).json({ error: "Only demo accounts can be saved to a permanent account" });
      }
      
      // Check if the email is already in use by another account
      const existingUser = await storage.getUserByUsername(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ 
          error: "This email is already registered",
          message: "Please use a different email address or log in with this email if it's yours."
        });
      }
      
      // Use Supabase Admin functions to properly create or link the user
      try {
        // Import the Supabase admin functions
        const supabaseAdminModule = await import('./supabase-admin');
        const { linkAnonymousUser, generatePasswordResetLink } = supabaseAdminModule;
        
        // Attempt to link the anonymous account to the new email in Supabase
        const supabaseUser = await linkAnonymousUser(authId, email);
        
        // Generate a password reset link for the user to set their password
        const { properties } = await generatePasswordResetLink(email);
        
        // In a production app, you would send the reset link via email
        // For development, we'll log it to the console
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Password reset link (for testing only): ${properties.action_link}`);
        }
        
        console.log(
          `Demo account saved with Supabase Auth integration. Email: ${email}, ` +
          `Supabase User ID: ${supabaseUser.id}, Reset link generated` +
          (process.env.NODE_ENV !== 'production' ? ' (see logs)' : ' (would be emailed in production)')
        );
        
        // Update our database record with the email but keep isDemo flag for now
        // The user will be fully converted after they set a password via the reset link
        const updatedUser = await storage.updateUser(userId, {
          username: email,
          isDemo: true // Keep isDemo true until password is set
        });
        
        if (!updatedUser) {
          return res.status(500).json({ error: "Failed to update user in database" });
        }
        
        // Return the updated user
        res.status(200).json({
          ...updatedUser,
          // Tell the client the user is no longer in demo mode
          // This prevents the "Save Your Work" button from appearing
          isDemo: false,
          // Add info about password reset
          passwordResetSent: true
        });
      } catch (supabaseError) {
        // Log the error but continue with the database-only approach as fallback
        console.error("Supabase Auth integration failed:", supabaseError);
        
        // Fall back to our original implementation
        console.log("Falling back to database-only account save");
        
        // Update the user record in our database, but don't change isDemo status yet
        const updatedUser = await storage.updateUser(userId, {
          username: email,
          isDemo: true // Keep isDemo true for session continuity
        });
        
        if (!updatedUser) {
          return res.status(500).json({ error: "Failed to update user" });
        }
        
        console.log(`Demo user work saved (database only): ID=${updatedUser.id}, Email=${email}`);
        
        // Return the updated user
        res.status(200).json({
          ...updatedUser,
          isDemo: false, // Tell client user is not in demo mode
          passwordResetSent: false // Indicate no password reset was sent
        });
      }
    } catch (error) {
      console.error("Error saving demo account:", error);
      
      // Check for duplicate key error and provide a better message
      if (error instanceof Error && error.message.includes('duplicate key') && error.message.includes('username')) {
        return res.status(409).json({ 
          error: "This email is already registered",
          message: "Please use a different email address or log in with this email if it's yours."
        });
      }
      
      res.status(500).json({ error: "Failed to save demo account" });
    }
  });

  // Project routes
  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      // Extract authenticated user ID using auth_id first, then fallback to query params
      let userId: number | undefined;
      let authId: string | undefined;

      // ALWAYS check for x-auth-id header first (most reliable method)
      if (req.headers['x-auth-id']) {
        authId = req.headers['x-auth-id'] as string;
        console.log("Auth ID from header in GET projects:", authId);
        
        // Try to parse as numeric ID first (for backward compatibility)
        const numericId = parseInt(authId);
        
        if (!isNaN(numericId)) {
          // If authId is a valid number, use it directly as userId
          userId = numericId;
          console.log("Using numeric authId directly as userId:", userId);
        } else {
          // Otherwise, look up the user by Supabase authId (UUID)
          try {
            const user = await storage.getUserByAuthId(authId);
            if (user) {
              userId = user.id;
              console.log("Found user by Supabase authId in GET projects:", userId);
            } else {
              console.log("User not found for Supabase authId:", authId);
            }
          } catch (err) {
            console.error("Error looking up user by authId:", err);
          }
        }
      }
      // Extract from the Authorization header (Bearer token from Supabase) AS FALLBACK
      else if (req.headers.authorization) {
        try {
          // Get the token from the Authorization header
          const token = req.headers.authorization.replace('Bearer ', '');
          
          console.log("Using authorization header as fallback in GET projects");
          
          // For debugging purposes, check if there's also an auth-id header with different capitalization
          const headers = Object.keys(req.headers).filter(h => h.toLowerCase().includes('auth'));
          if (headers.length > 0) {
            console.log("Available auth headers:", headers);
          }
        } catch (err) {
          console.error("Error processing authorization:", err);
        }
      }
      
      // Fallback to query params for development if userId is not set
      if (!userId) {
        userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
        console.log("Using fallback userId from query:", userId);
      }
      
      if (isNaN(userId as number)) {
        // If the user ID is not valid, and it's likely a demo or anonymous user,
        // return an empty array instead of an error to avoid red error messages
        if (authId) {
          console.log("Demo/anonymous user or not registered yet. Returning empty projects for auth ID:", authId);
          return res.json([]);
        }
        
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
      // Extract authenticated user ID using auth_id first, then fallback to query params
      let userId: number | undefined;
      let authId: string | undefined;

      // Always check for x-auth-id header first (the most reliable method)
      if (req.headers['x-auth-id']) {
        authId = req.headers['x-auth-id'] as string;
        console.log("Auth ID from header:", authId);
        
        // Try to parse as numeric ID first (for backward compatibility)
        const numericId = parseInt(authId);
        
        if (!isNaN(numericId)) {
          // If authId is a valid number, use it directly as userId
          userId = numericId;
          console.log("Using numeric authId directly as userId for project creation:", userId);
        } else {
          // Otherwise, look up the user by Supabase authId (UUID)
          try {
            const user = await storage.getUserByAuthId(authId);
            if (user) {
              userId = user.id;
              console.log("Found user by Supabase authId for project creation:", userId);
            } else {
              console.log("User not found for Supabase authId:", authId);
            }
          } catch (err) {
            console.error("Error looking up user by authId:", err);
          }
        }
      } 
      // Also check Authorization header as fallback
      else if (req.headers.authorization) {
        try {
          // Get the token from the Authorization header
          const token = req.headers.authorization.replace('Bearer ', '');
          
          // In a real app, we would decode the JWT to get the auth ID
          console.log("Using token from Authorization header");
        } catch (err) {
          console.error("Error processing authorization:", err);
        }
      }
      
      // Fallback to request body for development if userId is not set
      if (!userId) {
        userId = req.body.userId ? parseInt(req.body.userId) : undefined;
        console.log("Using fallback userId from body:", userId);
      }
      
      if (isNaN(userId as number) || userId === undefined) {
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
          
          // Extract authId from headers if available
          const authId = req.headers['x-auth-id'] as string;
          if (authId) {
            log(`Using authId from header: ${authId} for concept generation`);
          }
          
          // Extract JWT token from authorization header if available
          const authHeader = req.headers.authorization;
          const jwtToken = authHeader?.startsWith('Bearer ') 
            ? authHeader.substring(7) // Remove 'Bearer ' prefix
            : undefined;
            
          if (jwtToken) {
            log(`Using JWT token from authorization header for authenticated storage operations`);
          } else {
            log(`No JWT token found in authorization header, storage operations may fail`);
          }
          
          log("Calling AI service to generate brand concept");
          
          // Extract project ID and concept ID if available
          const projectId = brandInput.projectId || req.body.projectId || 'general';
          const conceptId = brandInput.conceptId || req.body.conceptId || Date.now().toString();
          
          log(`Using projectId: ${projectId}, conceptId: ${conceptId} for storage paths`);
          
          // Add projectId and conceptId to brandInput for hierarchical storage paths
          brandInput.projectId = projectId;
          brandInput.conceptId = conceptId;
          
          // Pass authId and jwtToken to the generateBrandConcept function
          const brandOutput = await generateBrandConcept(brandInput, authId, jwtToken);
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
  
  // Test route for Supabase storage with JWT authentication
  // Direct JWT token upload test with simple path structure
  app.post("/api/direct-jwt-upload", async (req: Request, res: Response) => {
    try {
      // Get JWT token from Authorization header
      const authHeader = req.headers.authorization;
      const jwtToken = authHeader ? authHeader.split(' ')[1] : undefined;
      const authId = req.headers['x-auth-id'] as string;
      
      if (!jwtToken || !authId) {
        return res.status(400).json({ 
          success: false, 
          message: "JWT token and auth ID are required in headers" 
        });
      }
      
      console.log("Running direct JWT upload test...");
      console.log("Auth ID:", authId);
      console.log("JWT token present:", !!jwtToken);
      
      // Import the Supabase client creator
      const { createSupabaseClientWithToken } = await import('./storage-utils');
      
      // Create a Supabase client with the JWT token
      const supabaseClient = createSupabaseClientWithToken(jwtToken);
      
      if (!supabaseClient) {
        return res.status(500).json({ 
          success: false, 
          message: "Failed to create Supabase client with token" 
        });
      }
      
      // Create a simple test SVG
      const testSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50">
        <rect width="200" height="50" fill="#10B981" rx="10" />
        <text x="100" y="30" font-family="Arial" font-size="20" fill="white" text-anchor="middle">JWT Test</text>
      </svg>`;
      
      const testData = Buffer.from(testSvg);
      
      // Try multiple path structures and test uploads
      const testResults = [];
      
      // Test 1: Root level path (should fail with proper RLS)
      const rootPath = `test-${Date.now()}.svg`;
      
      try {
        const { data: rootData, error: rootError } = await supabaseClient
          .storage
          .from('assets')
          .upload(rootPath, testData, {
            contentType: 'image/svg+xml',
            upsert: true
          });
          
        testResults.push({
          test: "Root path",
          path: rootPath,
          success: !rootError,
          error: rootError ? rootError.message : null
        });
      } catch (e) {
        testResults.push({
          test: "Root path",
          path: rootPath,
          success: false,
          error: e instanceof Error ? e.message : String(e)
        });
      }
      
      // Test 2: Direct auth ID folder
      const authPath = `${authId}/test-${Date.now()}.svg`;
      
      try {
        const { data: authData, error: authError } = await supabaseClient
          .storage
          .from('assets')
          .upload(authPath, testData, {
            contentType: 'image/svg+xml',
            upsert: true
          });
          
        testResults.push({
          test: "Auth ID folder",
          path: authPath,
          success: !authError,
          url: authData ? supabaseClient.storage.from('assets').getPublicUrl(authPath).data.publicUrl : null,
          error: authError ? authError.message : null
        });
      } catch (e) {
        testResults.push({
          test: "Auth ID folder",
          path: authPath,
          success: false,
          error: e instanceof Error ? e.message : String(e)
        });
      }
      
      // Test 3: Project subfolder
      const projectPath = `${authId}/projects/test-${Date.now()}.svg`;
      
      try {
        const { data: projectData, error: projectError } = await supabaseClient
          .storage
          .from('assets')
          .upload(projectPath, testData, {
            contentType: 'image/svg+xml',
            upsert: true
          });
          
        testResults.push({
          test: "Project subfolder",
          path: projectPath,
          success: !projectError,
          url: projectData ? supabaseClient.storage.from('assets').getPublicUrl(projectPath).data.publicUrl : null,
          error: projectError ? projectError.message : null
        });
      } catch (e) {
        testResults.push({
          test: "Project subfolder",
          path: projectPath,
          success: false,
          error: e instanceof Error ? e.message : String(e)
        });
      }
      
      // Return comprehensive results
      res.json({
        success: true,
        message: "Direct JWT upload tests completed",
        testResults,
        policy: {
          recommendation: "If all tests failed, your policy might be incorrect. Try: ((bucket_id = 'assets'::text) AND (auth.role() = 'authenticated'::text))"
        }
      });
    } catch (error) {
      console.error("Error in direct JWT upload test:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error running direct JWT upload test",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/test-storage-upload", async (req: Request, res: Response) => {
    try {
      // Extract auth ID from header
      const authId = req.headers['x-auth-id'] as string || 'demo-user';
      
      // Extract JWT token from Authorization header
      const authHeader = req.headers.authorization;
      const jwtToken = authHeader ? authHeader.split(' ')[1] : undefined;
      
      console.log(`Testing storage upload with auth ID: ${authId}`);
      console.log(`JWT token provided: ${jwtToken ? 'Yes' : 'No'}`);
      
      // Create a test SVG image
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
        <text x="50" y="55" font-family="Arial" font-size="12" text-anchor="middle" fill="white">Test</text>
      </svg>`;
      
      const { 
        uploadLogoFromUrl, 
        createSupabaseClientWithToken, 
        initializeStorageBucket 
      } = await import('./storage-utils');
      
      const STORAGE_BUCKET = 'assets';
      
      // Get the Supabase client - use JWT token if available
      const storageClient = jwtToken 
        ? createSupabaseClientWithToken(jwtToken)
        : (await import('./storage-utils')).supabase;
      
      // First test direct bucket access
      let bucketAccessResults = null;
      if (storageClient) {
        try {
          // Initialize the bucket with JWT token if available
          await initializeStorageBucket(jwtToken);
          
          // 1. Try to directly access the bucket
          console.log(`Directly testing access to the '${STORAGE_BUCKET}' bucket with ${jwtToken ? 'JWT token' : 'anon key'}...`);
          const { data: filesList, error: listError } = await storageClient
            .storage
            .from(STORAGE_BUCKET)
            .list();
            
          if (listError) {
            console.error(`Error listing files from bucket: ${listError.message}`);
            bucketAccessResults = { 
              listBucketSuccess: false, 
              listFilesSuccess: false, 
              error: listError.message 
            };
          } else {
            console.log(`Successfully listed files from bucket. Found ${filesList?.length || 0} files.`);
            
            // 2. Try a test upload
            const testSvg = svgContent;
            const testData = Buffer.from(testSvg);
            const testPath = `${authId}/test-upload-${Date.now()}.svg`;
            
            console.log(`Attempting test upload to '${STORAGE_BUCKET}/${testPath}' with ${jwtToken ? 'JWT token' : 'anon key'}...`);
            
            const { data: uploadData, error: uploadError } = await storageClient
              .storage
              .from(STORAGE_BUCKET)
              .upload(testPath, testData, {
                contentType: 'image/svg+xml',
                upsert: true
              });
            
            if (uploadError) {
              console.error(`Test upload failed: ${uploadError.message}`);
              console.error(`Error details:`, uploadError);
              bucketAccessResults = { 
                listBucketSuccess: true, 
                listFilesSuccess: true, 
                uploadSuccess: false,
                error: uploadError.message,
                errorDetails: {
                  // Access only known properties of StorageError to avoid TypeScript errors
                  message: uploadError.message,
                  // Include any additional error information as a safe stringified JSON
                  fullError: JSON.stringify(uploadError)
                }
              };
            } else {
              console.log(`Test upload succeeded! Path: ${uploadData?.path || 'unknown'}`);
              
              // Get public URL
              const { data: publicUrlData } = storageClient
                .storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(testPath);
              
              bucketAccessResults = { 
                listBucketSuccess: true, 
                listFilesSuccess: true, 
                uploadSuccess: true,
                uploadedPath: uploadData?.path,
                publicUrl: publicUrlData?.publicUrl
              };
            }
          }
        } catch (error) {
          console.error('Unexpected error during bucket test:', error);
          bucketAccessResults = { error: String(error) };
        }
      }
      
      // Convert SVG to data URL
      const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
      
      console.log(`Attempting to upload test SVG to Supabase storage via uploadLogoFromUrl...`);
      // Pass JWT token to the upload function
      const result = await uploadLogoFromUrl(
        dataUrl,
        999, // Test project ID
        999, // Test concept ID
        'svg',
        authId,
        jwtToken // Pass JWT token for authenticated upload
      );
      
      // Return comprehensive results
      if (result) {
        console.log(`Storage test successful! URL: ${result}`);
        res.json({ 
          success: true, 
          message: "Successfully uploaded test image to Supabase storage",
          url: result,
          bucketAccessResults: bucketAccessResults,
          authMethod: jwtToken ? 'JWT Token' : 'Anon Key',
          authId: authId
        });
      } else {
        console.log(`Storage test failed, no URL returned`);
        res.json({ 
          success: false, 
          message: "Failed to upload test image to Supabase storage",
          bucketAccessResults: bucketAccessResults,
          authMethod: jwtToken ? 'JWT Token' : 'Anon Key',
          authId: authId
        });
      }
    } catch (error) {
      console.error("Error in test-storage-upload:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        authMethodAttempted: req.headers.authorization ? 'JWT Token' : 'Anon Key'
      });
    }
  });
  
  app.post("/api/test-flux-logo", async (req: Request, res: Response) => {
    try {
      const { brandName, industry, description, values, style, colors } = req.body;
      
      if (!brandName) {
        return res.status(400).json({ error: "Brand name is required" });
      }
      
      // Extract authId from request headers
      const authId = req.headers['x-auth-id'] as string;
      console.log(`Testing FLUX logo generation with auth ID: ${authId || 'none'}`);
      
      log("Testing FLUX logo generation with correct parameters...");
      
      // Import the logo generation function
      const { generateLogo } = await import('./openai');
      
      // Call the generate logo function with the full parameter set
      // Including the optimal parameters for Flux Schnell model
      // Create temporary IDs for test logos so they're stored in a consistent location
      const temporaryProjectId = 'test';
      const temporaryConceptId = Date.now().toString();
      
      // Get JWT token for storage operations
      const jwtToken = req.headers.authorization?.split(' ')[1];
      
      const logoResult = await generateLogo({
        brandName,
        industry: industry || "Technology",
        description: description || `${brandName} is a professional and innovative company.`,
        values: Array.isArray(values) ? values : ["Innovation", "Quality", "Trust"],
        style: style || "Modern",
        colors: Array.isArray(colors) ? colors : ["#3366CC", "#FF9900"],
        promptOverride: req.body.prompt, // Optional prompt override
        projectId: temporaryProjectId, // Pass project ID for storage path
        conceptId: temporaryConceptId, // Pass concept ID for storage path
        authId, // Pass the authId for storage permissions
        jwtToken // Pass JWT token for authenticated storage operations
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
      // Extract auth ID from header if present
      const authId = req.headers['x-auth-id'] as string;
      const jwtToken = req.headers['x-supabase-auth'] as string;
      console.log("Auth ID from header in test-storage:", authId);
      console.log("JWT token present:", !!jwtToken);
      
      // Import the storage utility directly
      const { uploadImageFromUrl, uploadLogoFromUrl } = await import('./storage-utils');
      
      // Get image URL from request body or use a default test image
      const { imageUrl, useLogoUpload, projectId, conceptId } = req.body;
      const testImageUrl = imageUrl || 'https://picsum.photos/200'; // Use Lorem Picsum as a test image source
      
      // Check if using the specific logo upload function
      if (useLogoUpload === true) {
        log(`Testing Supabase logo storage with URL: ${testImageUrl}`);
        
        // Use the specialized logo upload function with project/concept hierarchy
        const storedLogoUrl = await uploadLogoFromUrl(
          testImageUrl,
          projectId || 999999, // Default test project ID if not provided
          conceptId || 999999, // Default test concept ID if not provided
          'svg', // Default to SVG format for logos
          authId, // Pass the authenticated user ID for proper storage path
          jwtToken // Pass the JWT token for authenticated storage operations
        );
        
        if (storedLogoUrl) {
          log(`Successfully stored logo in Supabase: ${storedLogoUrl}`);
          res.json({ 
            success: true, 
            message: 'Logo successfully uploaded to Supabase storage',
            originalUrl: testImageUrl,
            storedUrl: storedLogoUrl 
          });
        } else {
          log('Failed to store logo in Supabase - using original URL as fallback');
          res.json({ 
            success: false,
            message: 'Failed to store logo in Supabase - using original URL as fallback',
            originalUrl: testImageUrl,
            storedUrl: testImageUrl
          });
        }
      } else {
        // Standard image upload test (general storage)
        log(`Testing Supabase general storage with image URL: ${testImageUrl}`);
        
        // Attempt to upload the image with authId for proper user storage path
        const storedImageUrl = await uploadImageFromUrl(
          testImageUrl, 
          {}, // Empty params object for default storage path
          authId, 
          jwtToken // Pass JWT token for authenticated storage operations
        );
        
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

  // Diagnostic endpoint to test Supabase storage with various auth methods
  app.post("/api/diagnose-storage", async (req: Request, res: Response) => {
    try {
      // Extract auth ID and JWT token from headers
      const authId = req.headers['x-auth-id'] as string;
      const authHeader = req.headers.authorization;
      const jwtToken = authHeader ? authHeader.split(' ')[1] : undefined;
      
      console.log("Diagnosing storage with auth ID:", authId);
      console.log("JWT token present:", !!jwtToken);
      
      // Import necessary modules
      const { supabase, createSupabaseClientWithToken, initializeStorageBucket } = await import('./storage-utils');
      
      // Verify storage bucket exists
      const bucketInitialized = await initializeStorageBucket();
      console.log("Storage bucket initialization:", bucketInitialized ? "success" : "failed");
      
      // Test variables to track results
      const results: any = {
        authProvided: { authId: !!authId, jwtToken: !!jwtToken },
        bucketInitialized,
        anonymousResults: { attempted: false },
        jwtResults: { attempted: false },
        userFolderResults: { attempted: false }
      };
      
      // 1. First test with anonymous key (should fail with proper RLS)
      if (supabase) {
        try {
          console.log("Testing with anonymous key...");
          const testData = Buffer.from('Anonymous test - ' + new Date().toISOString());
          const testPath = `test-anonymous-${Date.now()}.txt`;
          
          const { data: anonData, error: anonError } = await supabase
            .storage
            .from('assets')
            .upload(testPath, testData, {
              contentType: 'text/plain',
              upsert: true
            });
            
          results.anonymousResults = {
            attempted: true,
            success: !anonError,
            path: anonData?.path,
            error: anonError ? anonError.message : null
          };
          
          console.log("Anonymous upload result:", !anonError ? "success" : "failed");
        } catch (anonExError) {
          results.anonymousResults = {
            attempted: true,
            success: false,
            error: anonExError instanceof Error ? anonExError.message : String(anonExError)
          };
        }
      }
      
      // 2. Test with JWT token (should succeed with proper RLS)
      if (jwtToken) {
        try {
          console.log("Testing with JWT token...");
          const jwtClient = createSupabaseClientWithToken(jwtToken);
          
          if (jwtClient) {
            const testJwtData = Buffer.from('JWT test - ' + new Date().toISOString());
            const testJwtPath = `test-jwt-${Date.now()}.txt`;
            
            const { data: jwtData, error: jwtError } = await jwtClient
              .storage
              .from('assets')
              .upload(testJwtPath, testJwtData, {
                contentType: 'text/plain',
                upsert: true
              });
              
            results.jwtResults = {
              attempted: true,
              success: !jwtError,
              path: jwtData?.path,
              error: jwtError ? jwtError.message : null
            };
            
            console.log("JWT token upload result:", !jwtError ? "success" : "failed");
          } else {
            results.jwtResults = {
              attempted: true,
              success: false,
              error: "Failed to create Supabase client with token"
            };
          }
        } catch (jwtExError) {
          results.jwtResults = {
            attempted: true,
            success: false,
            error: jwtExError instanceof Error ? jwtExError.message : String(jwtExError)
          };
        }
      }
      
      // 3. Test with user-specific folder using JWT (most relevant to our app)
      if (jwtToken && authId) {
        try {
          console.log("Testing with JWT token in user-specific folder...");
          const jwtClient = createSupabaseClientWithToken(jwtToken);
          
          if (jwtClient) {
            const testUserData = Buffer.from('User folder test - ' + new Date().toISOString());
            const testUserPath = `${authId}/test-folder/test-${Date.now()}.txt`;
            
            const { data: userData, error: userError } = await jwtClient
              .storage
              .from('assets')
              .upload(testUserPath, testUserData, {
                contentType: 'text/plain',
                upsert: true
              });
              
            results.userFolderResults = {
              attempted: true,
              success: !userError,
              path: userData?.path,
              error: userError ? userError.message : null
            };
            
            console.log("User folder upload result:", !userError ? "success" : "failed");
          } else {
            results.userFolderResults = {
              attempted: true,
              success: false,
              error: "Failed to create Supabase client with token"
            };
          }
        } catch (userExError) {
          results.userFolderResults = {
            attempted: true,
            success: false,
            error: userExError instanceof Error ? userExError.message : String(userExError)
          };
        }
      }
      
      // Add guidance for fixing RLS if any uploads failed
      if (!results.jwtResults.success || !results.userFolderResults.success) {
        results.rlsGuidance = {
          title: "Storage Permission Issue Detected",
          steps: [
            "Go to your Supabase dashboard",
            "Navigate to Storage → Policies",
            "Find the 'assets' bucket",
            "For INSERT policy, add 'auth.role() = authenticated'",
            "For better security, use '(auth.uid() = storage.foldername::text)' to only allow users to upload to folders matching their ID"
          ]
        };
      }
      
      res.json({
        success: true,
        message: "Storage diagnostic complete",
        results
      });
    } catch (error) {
      console.error("Error in storage diagnostic:", error);
      res.status(500).json({
        success: false,
        message: "Storage diagnostic failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Logo generation route - handles both logos and billboard generation
  app.post("/api/generate-logo", async (req: Request, res: Response) => {
    try {
      const { brandName, industry, description, values, style, colors, prompt } = req.body;
      
      // Extract auth ID and JWT token from headers if present
      const authId = req.headers['x-auth-id'] as string;
      let jwtToken = req.headers['x-supabase-auth'] as string | undefined;
      console.log("Auth ID from header in logo generation:", authId);
      console.log("JWT token present in logo generation:", !!jwtToken);
      
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
      
      // Temporary project and concept IDs for standalone logo generation
      // Use actual project/concept IDs if available from the request
      const temporaryProjectId = req.body.projectId || 999999;
      const temporaryConceptId = req.body.conceptId || 999999;
      
      // Extract JWT token from Authorization header if not already present
      if (!jwtToken) {
        const authHeader = req.headers.authorization;
        if (authHeader) {
          const bearerToken = authHeader.split(' ')[1];
          if (bearerToken) {
            jwtToken = bearerToken;
          }
        }
      }
      
      // Default path: Generate a regular logo
      const logoResult = await generateLogo({
        brandName,
        industry,
        description: description || "", // Handle undefined description
        values: Array.isArray(values) ? values : [],  // Handle undefined values
        style: style || "modern",       // Default style
        colors: Array.isArray(colors) ? colors : [],  // Handle undefined colors
        projectId: temporaryProjectId, // Pass project ID for storage path
        conceptId: temporaryConceptId, // Pass concept ID for storage path
        authId: authId, // Pass the authId for proper storage permissions
        jwtToken: jwtToken // Pass JWT token for authenticated storage operations
      });
      
      // Extract logo URL from SVG if present
      let originalLogoUrl = '';
      try {
        const urlMatch = logoResult.svg.match(/href="([^"]+)"/);
        if (urlMatch && urlMatch[1]) {
          originalLogoUrl = urlMatch[1];
        }
      } catch (parseError) {
        console.log("Could not extract URL from SVG:", parseError);
      }
      
      let permanentLogoUrl = '';
      let permanentLogoSvg = logoResult.svg;
      
      // Import the upload function
      if (originalLogoUrl) {
        try {
          // Import the logo upload utility
          const { uploadLogoFromUrl } = await import('./storage-utils');
          
          // Store the logo in Supabase storage
          const storedLogoUrl = await uploadLogoFromUrl(
            originalLogoUrl, 
            temporaryProjectId,
            temporaryConceptId,
            'svg', // Assuming SVG format for logos
            authId, // Pass the authenticated user ID for proper storage path
            jwtToken // Pass the JWT token for authenticated storage operations
          );
          
          // If we got back a permanent URL, update the SVG
          if (storedLogoUrl && storedLogoUrl !== originalLogoUrl) {
            permanentLogoUrl = storedLogoUrl;
            // Update the SVG with the permanent URL
            permanentLogoSvg = logoResult.svg.replace(originalLogoUrl, storedLogoUrl);
            console.log(`Logo URL successfully migrated to permanent storage: ${storedLogoUrl}`);
          }
        } catch (storageError) {
          console.error("Error storing logo in permanent storage:", storageError);
          // Continue with the original URL as fallback
        }
      }
      
      res.json({ 
        success: true,
        logoSvg: permanentLogoSvg,
        prompt: logoResult.prompt,
        permanentUrl: permanentLogoUrl || originalLogoUrl
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
      
      // Extract authenticated user ID using auth_id first, then fallback to query params
      let userId: number | undefined;
      let authId: string | undefined;

      // Always check for x-auth-id header first (most reliable method)
      if (req.headers['x-auth-id']) {
        authId = req.headers['x-auth-id'] as string;
        console.log("Auth ID from header in concepts post:", authId);
        
        // Look up the user by authId
        if (authId) {
          try {
            const user = await storage.getUserByAuthId(authId);
            if (user) {
              userId = user.id;
              console.log("Found user by authId in concepts post:", userId);
            } else {
              console.log("User not found for authId:", authId);
            }
          } catch (err) {
            console.error("Error looking up user by authId:", err);
          }
        }
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Verify the user owns this project
      if (userId && project.userId !== userId) {
        return res.status(403).json({ error: "Forbidden: You don't have access to this project" });
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
      
      // Check authentication
      let userId: number | undefined;
      let authId: string | undefined;
      const jwtToken = req.headers['x-supabase-auth'] as string;
      
      // ALWAYS check for x-auth-id header first (most reliable method)
      if (req.headers['x-auth-id']) {
        authId = req.headers['x-auth-id'] as string;
        console.log("Auth ID from header in regenerate-element:", authId);
        console.log("JWT token present in regenerate-element:", !!jwtToken);
        
        // Look up the user by authId
        if (authId) {
          try {
            const user = await storage.getUserByAuthId(authId);
            if (user) {
              userId = user.id;
              console.log("Found user by authId in regenerate-element:", userId);
            } else {
              console.log("User not found for authId:", authId);
            }
          } catch (err) {
            console.error("Error looking up user by authId:", err);
          }
        }
      }
      
      // Get the existing concept
      const existingConcept = await storage.getBrandConcept(conceptId);
      if (!existingConcept) {
        return res.status(404).json({ success: false, message: "Brand concept not found" });
      }
      
      // Verify ownership if we have authentication information
      if (userId && existingConcept) {
        // Get the project
        const project = await storage.getProject(existingConcept.projectId);
        if (project && project.userId !== userId) {
          console.log(`Unauthorized access: user ${userId} tried to modify concept ${conceptId} which belongs to user ${project.userId}`);
          return res.status(403).json({ 
            success: false, 
            message: "You don't have permission to modify this concept" 
          });
        }
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
          // Import the generateLogo function and storage utilities
          const { generateLogo, generateMonochromeLogo, generateReverseLogo } = await import('./openai');
          const { uploadLogoFromUrl } = await import('./storage-utils');
          
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
          
          // Extract logo URL from SVG if present
          let originalLogoUrl = '';
          try {
            const urlMatch = logoSvg.match(/href="([^"]+)"/);
            if (urlMatch && urlMatch[1]) {
              originalLogoUrl = urlMatch[1];
            }
          } catch (parseError) {
            console.log("Could not extract URL from SVG:", parseError);
          }
          
          // Final versions of the logo
          let primaryLogoSvg = logoSvg;
          
          // Store the logo in permanent storage if we extracted a URL
          if (originalLogoUrl) {
            try {
              console.log(`Storing logo for concept ${conceptId} in permanent storage...`);
              console.log(`Logo storage details:
                - Original logo URL: ${originalLogoUrl}
                - Project ID: ${projectId}
                - Concept ID: ${conceptId}
                - Auth ID: ${authId || 'not provided'}
              `);
              
              // Store the logo in Supabase storage with proper project/concept hierarchy
              const storedLogoUrl = await uploadLogoFromUrl(
                originalLogoUrl,
                projectId,
                conceptId,
                'svg', // Assuming SVG format for logos
                authId, // Pass the authenticated user ID for proper storage path
                jwtToken // Pass the JWT token for authenticated storage operations
              );
              
              console.log(`Storage result: ${storedLogoUrl ? 'Success - URL: ' + storedLogoUrl.substring(0, 30) + '...' : 'Failed - using original URL'}`);
              
              // If we got back a permanent URL, update the SVG
              if (storedLogoUrl && storedLogoUrl !== originalLogoUrl) {
                // Update the SVG with the permanent URL
                primaryLogoSvg = logoSvg.replace(originalLogoUrl, storedLogoUrl);
                console.log(`Logo URL successfully migrated to permanent storage: ${storedLogoUrl}`);
              }
            } catch (storageError) {
              console.error("Error storing logo in permanent storage:", storageError);
              // Continue with the original URL as fallback
              console.log("Using original Replicate URL as fallback");
            }
          }
          
          // Generate monochrome and reverse versions based on the updated SVG
          const monochromeLogo = generateMonochromeLogo(primaryLogoSvg);
          const reverseLogo = generateReverseLogo(primaryLogoSvg);
          
          // Update the logo in the brand output
          brandOutput.logo = {
            primary: primaryLogoSvg,
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

  // API endpoint for setting password on a previously saved demo account
  app.post("/api/set-account-password", async (req: Request, res: Response) => {
    try {
      // Get the authorization token and auth ID
      const authHeader = req.headers.authorization;
      const authId = req.headers['x-auth-id'] as string;
      
      if (!authHeader && !authId) {
        return res.status(401).json({ error: "Missing authentication details" });
      }
      
      // Get the password from the request body
      const { password, email } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }
      
      // Find the user by authId first
      let userId: number | undefined;
      let user;
      
      if (authId) {
        user = await storage.getUserByAuthId(authId);
        if (user) {
          userId = user.id;
        }
      }
      
      // If user not found by authId and email is provided, try finding by email
      if (!userId && email) {
        user = await storage.getUserByUsername(email);
        if (user) {
          userId = user.id;
        }
      }
      
      if (!userId || !user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Try to update the password in Supabase Auth first
      try {
        // Import the Supabase admin module
        const supabaseAdminModule = await import('./supabase-admin');
        const { updateUser, supabaseAdmin } = supabaseAdminModule;
        
        // If we have authId, update password directly in Supabase Auth
        if (authId) {
          // Update the user's password in Supabase Auth
          await updateUser(authId, { password });
          
          console.log(`Password updated in Supabase Auth for user ID=${authId}`);
          
          // Also update user metadata to mark as converted
          if (supabaseAdmin) {
            await supabaseAdmin.auth.admin.updateUserById(authId, {
              user_metadata: {
                converted: true,
                converted_at: new Date().toISOString()
              }
            });
          }
          
          console.log(`User metadata updated to mark as converted in Supabase Auth`);
        } 
        // If no authId but we have email, try to find user in Supabase by email
        else if (email && supabaseAdmin) {
          // List users to find by email (not ideal but works for small user bases)
          const { data } = await supabaseAdmin.auth.admin.listUsers();
          const supabaseUser = data.users.find(u => u.email === email);
          
          if (supabaseUser) {
            // Update the user's password in Supabase Auth
            await updateUser(supabaseUser.id, { password });
            
            // Also update authId in our database if it's missing
            if (!user.authId) {
              await storage.updateUser(userId, { authId: supabaseUser.id });
              console.log(`Updated authId in database for user ${userId} to ${supabaseUser.id}`);
            }
            
            console.log(`Password updated in Supabase Auth for user with email ${email}`);
          } else {
            console.log(`User with email ${email} not found in Supabase Auth`);
          }
        }
      } catch (supabaseError) {
        // Log error but continue with database update as fallback
        console.error("Error updating password in Supabase Auth:", supabaseError);
      }
      
      // Still hash and store password in our database for backward compatibility
      const hashedPassword = await hashPassword(password);
      
      // Update the user account with the password and fully convert from demo
      // This completes the two-phase authentication process
      const updatedUser = await storage.updateUser(userId, {
        password: hashedPassword,
        isDemo: false // Now fully convert from demo to regular account
      });
      
      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to set password" });
      }
      
      console.log(`Password set for user ID=${updatedUser.id}, Email=${updatedUser.username}, Account fully converted`);
      
      // Return success response
      res.status(200).json({
        success: true,
        message: "Password set successfully",
        user: {
          ...updatedUser,
          password: undefined // Never return password to client
        }
      });
    } catch (error) {
      console.error("Error setting account password:", error);
      res.status(500).json({ 
        error: "Failed to set password", 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Server-side authentication endpoint for converted demo accounts
  app.post("/api/logout", async (req: Request, res: Response) => {
    try {
      // Get the auth ID from the request header
      const authId = req.headers['x-auth-id'] as string;
      
      console.log(`Logging out user with authId: ${authId}`);
      
      // If we have Supabase configured, try to invalidate the session there
      if (authId) {
        try {
          // Import the supabase admin module
          const { supabaseAdmin } = await import('./supabase-admin');
          
          // Use the admin API to revoke all sessions for this user
          if (supabaseAdmin) {
            const { error } = await supabaseAdmin.auth.admin.signOut(authId);
            if (error) {
              console.warn("Error revoking session with Supabase admin:", error);
              // Continue anyway - we'll log the user out locally
            } else {
              console.log(`Successfully revoked all sessions for user ${authId} with Supabase admin API`);
            }
          }
        } catch (error) {
          console.warn("Error during Supabase admin logout:", error);
          // Continue anyway - we'll log the user out locally
        }
      }
      
      // Return success response
      return res.status(200).json({
        success: true,
        message: "Successfully logged out"
      });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to log out"
      });
    }
  });

  app.post("/api/login-with-email-password", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      // First try to authenticate with Supabase
      try {
        // Import the Supabase client
        const { supabase } = await import('./storage-utils');
        if (supabase) {
          // Try to sign in with Supabase Auth
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (!error && data.user) {
            // Successfully authenticated with Supabase
            console.log(`User authenticated via Supabase Auth: ID=${data.user.id}, Email=${data.user.email}`);
            
            // Check if user exists in our database
            let user = await storage.getUserByAuthId(data.user.id);
            
            // If user doesn't exist by authId, try by email
            if (!user) {
              user = await storage.getUserByUsername(email);
              
              // If found by email but authId doesn't match, update it
              if (user && (!user.authId || user.authId !== data.user.id)) {
                const updatedUser = await storage.updateUser(user.id, { authId: data.user.id });
                if (updatedUser) {
                  user = updatedUser;
                  console.log(`Updated authId for user ${user.id} to ${data.user.id}`);
                }
              }
            }
            
            // If still no user in our database, create one
            if (!user) {
              console.log(`User exists in Supabase but not in our database. Creating record for ${email}`);
              user = await storage.createUser({
                username: email,
                password: 'auth-via-supabase', // Placeholder, not used for auth
                authId: data.user.id,
                isDemo: false
              });
            }
            
            // Return user and session data
            return res.status(200).json({
              success: true,
              user: {
                ...user,
                password: undefined // Never return password to client
              },
              session: {
                ...data.session,
                user_id: user.id
              }
            });
          }
        }
      } catch (supabaseError) {
        console.error("Error authenticating with Supabase:", supabaseError);
        // Continue to database authentication as fallback
      }
      
      // Fallback to database authentication if Supabase auth fails
      console.log(`Falling back to database authentication for ${email}`);
      
      // Check if user exists in our database
      const user = await storage.getUserByUsername(email);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Check if the password matches
      const passwordMatches = await comparePasswords(password, user.password);
      
      if (!passwordMatches) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // If it's a converted demo account, we need to use the existing authId
      // If no authId, we'd need to create one with Supabase, but this is a simplified version
      if (!user.authId) {
        return res.status(500).json({ error: "Account not properly configured" });
      }
      
      console.log(`User authenticated via database: ID=${user.id}, Email=${user.username}, AuthID=${user.authId}`);
      
      // Return the user data including authId needed for API requests
      res.status(200).json({
        success: true,
        user: {
          ...user,
          password: undefined // Never return password to client
        },
        session: {
          // We're creating a simplified session here
          // In a real implementation, you'd use JWT tokens
          user_id: user.id,
          auth_id: user.authId
        }
      });
    } catch (error) {
      console.error("Error during authentication:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
