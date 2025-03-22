import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Import necessary modules
import { createTablesIfNotExist } from './db';
import { supabase, supabaseStorage } from './supabase';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize databases (Supabase or local PostgreSQL)
async function initializeDatabase() {
  console.log('Initializing database...');
  
  // Check for Supabase
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && supabase) {
    console.log('Supabase database detected. Creating tables...');
    try {
      // Create tables in Supabase
      await supabaseStorage.createTablesIfNotExist();
      
      // Add demo user for testing
      await supabaseStorage.insertSampleData();
      console.log('Supabase database initialization complete.');
    } catch (err) {
      console.error('Failed to initialize Supabase database:', err);
    }
  } 
  // Fall back to local PostgreSQL
  else if (process.env.DATABASE_URL) {
    console.log('Local PostgreSQL database detected. Tables will be created if they don\'t exist.');
    try {
      await createTablesIfNotExist();
      console.log('PostgreSQL database initialization complete.');
    } catch (err) {
      console.error('Failed to create database tables:', err);
    }
  } else {
    console.warn('No database configuration found. Using in-memory storage.');
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
