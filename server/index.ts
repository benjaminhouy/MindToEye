import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Import necessary modules for direct PostgreSQL connection
import { createTablesIfNotExist, postgresStorage } from './db';
import { initializeStorageBucket } from './storage-utils';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize PostgreSQL database connection
async function initializeDatabase() {
  console.log('🔌 Initializing database connection...');
  
  // Check for database connection URL
  const dbUrl = process.env.DATABASE_URL;
  
  if (dbUrl) {
    console.log('✓ Database connection URL detected.');
    
    try {
      // Verify database connection
      console.log('🔍 Verifying database connectivity...');
      
      // Import db for direct query
      const { db } = await import('./db');
      
      if (db) {
        try {
          // Simple health check query to verify connectivity
          const { sql } = await import('drizzle-orm');
          await db.execute(sql`SELECT 1 as connected`);
          console.log('✅ Successfully connected to database');
        } catch (connErr) {
          console.error('❌ Database connection test failed:', connErr);
          console.error('The application requires a working database connection.');
          console.error('If SSL errors occur, check environment configuration for NODE_TLS_REJECT_UNAUTHORIZED.');
          return;
        }
      } else {
        console.warn('⚠️ Database client not initialized. Check your database configuration.');
        return;
      }
      
      // Create tables if they don't exist using direct SQL
      console.log('📝 Creating database tables if needed...');
      await createTablesIfNotExist();
      
      // Initialize storage bucket for assets
      console.log('📦 Initializing Supabase storage bucket...');
      const storageInitialized = await initializeStorageBucket();
      console.log(`${storageInitialized ? '✅' : '⚠️'} Storage bucket initialization ${storageInitialized ? 'successful' : 'failed'}`);
      
      console.log('✅ Database initialization complete.');
    } catch (err) {
      console.error('❌ Failed to initialize database:', err);
      console.error('The application requires a valid database connection.');
    }
  } else {
    // No fallback - application requires a database connection
    console.error('❌ ERROR: DATABASE_URL environment variable is missing.');
    console.error('The application requires the following environment variable:');
    console.error('- DATABASE_URL');
    console.error('Please ensure DATABASE_URL is set correctly to a valid pooled connection string.');
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
