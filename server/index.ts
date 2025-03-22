import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Import necessary modules
import { createTablesIfNotExist } from './db';
import { supabase, supabaseStorage } from './supabase';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize Supabase database exclusively
async function initializeDatabase() {
  console.log('Initializing Supabase database...');
  
  // Check for Supabase credentials
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && supabase) {
    console.log('Supabase database detected. Creating tables if needed...');
    try {
      // Create tables in Supabase if they don't exist
      await supabaseStorage.createTablesIfNotExist();
      
      // Add demo user for testing
      await supabaseStorage.insertSampleData();
      console.log('Supabase database initialization complete.');
    } catch (err) {
      console.error('Failed to initialize Supabase database:', err);
      console.error('The application requires a valid Supabase connection.');
    }
  } else {
    // No fallback - application requires Supabase
    console.error('ERROR: Supabase credentials are missing or invalid.');
    console.error('The application requires the following environment variables:');
    console.error('- SUPABASE_URL');
    console.error('- SUPABASE_ANON_KEY');
    console.warn('Development mode: Using in-memory storage, but this is not recommended for production.');
  }
}

// Run database initialization
initializeDatabase();

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`Express server serving on port ${port}`);
  });
})();
