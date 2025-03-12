import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

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
    
    // Start Flask server
    try {
      // Check if python is installed
      const pythonPath = process.env.PYTHON_PATH || 'python';
      const flaskScriptPath = path.resolve(process.cwd(), 'run_flask.py');
      
      if (fs.existsSync(flaskScriptPath)) {
        log(`Starting Flask server from ${flaskScriptPath}`);
        
        // Launch Flask server as a child process
        const flaskProcess = spawn(pythonPath, [flaskScriptPath], {
          env: {
            ...process.env,
            FLASK_PORT: '5001',
            FLASK_DEBUG: 'True',
          },
          stdio: 'inherit', // This will pipe stdout and stderr to the parent process
        });
        
        flaskProcess.on('spawn', () => {
          log(`Flask process spawned, waiting for server to start...`);
        });
        
        flaskProcess.on('error', (err) => {
          log(`Error starting Flask server: ${err.message}`);
        });
        
        flaskProcess.on('exit', (code, signal) => {
          if (code !== 0) {
            log(`Flask process exited with code ${code} and signal ${signal}`);
          }
        });
        
        // Handle process exit
        process.on('exit', () => {
          log('Node process exiting, killing Flask server...');
          flaskProcess.kill();
        });
        
        // Handle SIGINT and SIGTERM
        process.on('SIGINT', () => {
          log('Received SIGINT signal, shutting down...');
          flaskProcess.kill('SIGINT');
          process.exit(0);
        });
        
        process.on('SIGTERM', () => {
          log('Received SIGTERM signal, shutting down...');
          flaskProcess.kill('SIGTERM');
          process.exit(0);
        });
      } else {
        log(`Flask script not found at ${flaskScriptPath}`);
      }
    } catch (error) {
      log(`Failed to start Flask server: ${error}`);
    }
  });
})();
