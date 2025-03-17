import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import fs from 'fs';
import path from 'path';

// Load environment variables function
function loadEnvFile(filePath: string, logPrefix: string) {
  if (fs.existsSync(filePath)) {
    console.log(`${logPrefix} environment variables from ${path.basename(filePath)}`);
    const envConfig = fs.readFileSync(filePath, 'utf8').split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .reduce<Record<string, string>>((acc, line) => {
        const [key, value] = line.split('=');
        if (key && value) {
          acc[key.trim()] = value.trim();
        }
        return acc;
      }, {});
    
    // Set environment variables
    Object.entries(envConfig).forEach(([key, value]) => {
      // Only set if not already defined
      if (!process.env[key]) {
        process.env[key] = value as string;
      }
    });
    
    return true;
  }
  return false;
}

// First try to load from development environment (preferred for development)
const envDevPath = path.join(process.cwd(), '.env.development');
const devLoaded = loadEnvFile(envDevPath, 'Loading');

// Fallback to Supabase environment if development wasn't loaded
if (!devLoaded) {
  const envSupabasePath = path.join(process.cwd(), '.env.supabase');
  loadEnvFile(envSupabasePath, 'Falling back to');
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
