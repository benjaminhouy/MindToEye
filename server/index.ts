import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Import necessary modules for direct PostgreSQL connection
import { createTablesIfNotExist, postgresStorage } from './db';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize Supabase PostgreSQL database with direct connection
async function initializeDatabase() {
  console.log('Initializing Supabase database connection...');
  
  // Check for Supabase database URL
  const dbUrl = process.env.SUPABASE_DB_URL;
  
  if (dbUrl) {
    console.log('Supabase connection URL detected. Creating tables if needed...');
    try {
      // Create tables if they don't exist using direct SQL
      await createTablesIfNotExist();
      console.log('Supabase database initialization complete.');
    } catch (err) {
      console.error('Failed to initialize Supabase database:', err);
      console.error('The application requires a valid Supabase database connection.');
    }
  } else {
    // No fallback - application requires Supabase database
    console.error('ERROR: Supabase database connection URL is missing.');
    console.error('The application requires the following environment variable:');
    console.error('- SUPABASE_DB_URL');
    console.error('Please ensure SUPABASE_DB_URL is set correctly to a valid connection string.');
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
