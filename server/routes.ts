import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { 
  insertAppSchema, 
  updateSettingsSchema, 
  AppStatus,
  insertEndpointSchema,
  insertAppPortSchema,
  insertAppProcessSchema,
  EndpointStatus
} from "@shared/schema";
import { startMonitoring, stopMonitoring, updateCheckFrequency } from "./services/monitor";
import { startApp, stopApp, restartApp, terminateGhostProcesses } from "./services/controller";
import { 
  getRestartRecommendations, 
  getAppRestartRecommendation,
  generateAllAppPredictions,
  generateAppPredictions
} from "./services/recommendation";
import { initializeEmailTransporter, sendTestEmailNotification } from "./services/email";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize monitoring service
  await startMonitoring();

  // API routes
  
  // Get all apps
  app.get("/api/apps", async (req: Request, res: Response) => {
    try {
      const apps = await storage.getApps();
      res.json(apps);
    } catch (error) {
      console.error("Error fetching apps:", error);
      res.status(500).json({ message: "Failed to fetch apps" });
    }
  });

  // Get a single app
  app.get("/api/apps/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid app ID" });
      }
      
      const app = await storage.getApp(id);
      if (!app) {
        return res.status(404).json({ message: "App not found" });
      }
      
      res.json(app);
    } catch (error) {
      console.error("Error fetching app:", error);
      res.status(500).json({ message: "Failed to fetch app" });
    }
  });

  // Create a new app
  app.post("/api/apps", async (req: Request, res: Response) => {
    try {
      const validationResult = insertAppSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid app data", 
          errors: validationResult.error.format() 
        });
      }
      
      const app = await storage.createApp(validationResult.data);
      res.status(201).json(app);
    } catch (error) {
      console.error("Error creating app:", error);
      res.status(500).json({ message: "Failed to create app" });
    }
  });

  // Update an app
  app.patch("/api/apps/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid app ID" });
      }
      
      const app = await storage.getApp(id);
      if (!app) {
        return res.status(404).json({ message: "App not found" });
      }
      
      const updatedApp = await storage.updateApp(id, req.body);
      res.json(updatedApp);
    } catch (error) {
      console.error("Error updating app:", error);
      res.status(500).json({ message: "Failed to update app" });
    }
  });

  // Delete an app
  app.delete("/api/apps/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid app ID" });
      }
      
      const success = await storage.deleteApp(id);
      if (!success) {
        return res.status(404).json({ message: "App not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting app:", error);
      res.status(500).json({ message: "Failed to delete app" });
    }
  });

  // Get app logs
  app.get("/api/apps/:id/logs", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid app ID" });
      }
      
      const logs = await storage.getLogs(id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Start an app
  app.post("/api/apps/:id/start", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid app ID" });
      }
      
      const app = await storage.getApp(id);
      if (!app) {
        return res.status(404).json({ message: "App not found" });
      }
      
      const result = await startApp(app);
      if (result.success) {
        res.json({ 
          message: "App start simulation successful", 
          app: result.app,
          simulation: true,
          details: "Note: This is a simulation of app control. In a production environment, this would connect to the actual Replit API."
        });
      } else {
        res.status(500).json({ 
          message: result.error || "Failed to start app", 
          simulation: true
        });
      }
    } catch (error) {
      console.error("Error starting app:", error);
      res.status(500).json({ message: "Failed to start app" });
    }
  });

  // Stop an app
  app.post("/api/apps/:id/stop", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid app ID" });
      }
      
      const app = await storage.getApp(id);
      if (!app) {
        return res.status(404).json({ message: "App not found" });
      }
      
      const result = await stopApp(app);
      if (result.success) {
        res.json({ 
          message: "App stop simulation successful", 
          app: result.app,
          simulation: true,
          details: "Note: This is a simulation of app control. In a production environment, this would connect to the actual Replit API."
        });
      } else {
        res.status(500).json({ 
          message: result.error || "Failed to stop app",
          simulation: true
        });
      }
    } catch (error) {
      console.error("Error stopping app:", error);
      res.status(500).json({ message: "Failed to stop app" });
    }
  });

  // Restart an app
  app.post("/api/apps/:id/restart", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid app ID" });
      }
      
      const app = await storage.getApp(id);
      if (!app) {
        return res.status(404).json({ message: "App not found" });
      }
      
      const result = await restartApp(app);
      if (result.success) {
        res.json({ 
          message: "App restart simulation successful", 
          app: result.app,
          simulation: true,
          details: "Note: This is a simulation of app control. In a production environment, this would connect to the actual Replit API."
        });
      } else {
        res.status(500).json({ 
          message: result.error || "Failed to restart app",
          simulation: true
        });
      }
    } catch (error) {
      console.error("Error restarting app:", error);
      res.status(500).json({ message: "Failed to restart app" });
    }
  });

  // Get settings
  app.get("/api/settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Update settings
  app.patch("/api/settings", async (req: Request, res: Response) => {
    try {
      const validationResult = updateSettingsSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid settings data", 
          errors: validationResult.error.format() 
        });
      }
      
      const settings = await storage.updateSettings(validationResult.data);
      
      // Update monitor check frequency if it was changed
      if (req.body.checkFrequency) {
        await updateCheckFrequency(settings.checkFrequency);
      }
      
      // Initialize email transporter if email settings were changed
      if (req.body.enableEmails !== undefined || 
          req.body.smtpHost !== undefined || 
          req.body.smtpPort !== undefined || 
          req.body.smtpUser !== undefined || 
          req.body.smtpPassword !== undefined) {
        await initializeEmailTransporter();
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Get all logs
  app.get("/api/logs", async (req: Request, res: Response) => {
    try {
      const logs = await storage.getLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Get system stats
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const apps = await storage.getApps();
      const settings = await storage.getSettings();
      
      const totalApps = apps.length;
      const runningApps = apps.filter(app => app.status === AppStatus.RUNNING).length;
      const stoppedApps = apps.filter(app => app.status === AppStatus.STOPPED).length;
      const unreachableApps = apps.filter(app => 
        app.status === AppStatus.UNREACHABLE || app.status === AppStatus.ERROR
      ).length;
      
      res.json({
        totalApps,
        runningApps,
        stoppedApps,
        unreachableApps,
        checkFrequency: settings.checkFrequency
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get restart recommendations for all apps
  app.get("/api/recommendations", async (req: Request, res: Response) => {
    try {
      const recommendations = await getRestartRecommendations();
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching restart recommendations:", error);
      res.status(500).json({ message: "Failed to fetch restart recommendations" });
    }
  });

  // Get restart recommendation for a specific app
  app.get("/api/apps/:id/recommendation", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid app ID" });
      }
      
      const app = await storage.getApp(id);
      if (!app) {
        return res.status(404).json({ message: "App not found" });
      }
      
      const recommendation = await getAppRestartRecommendation(id);
      if (!recommendation) {
        return res.json({ 
          message: "No restart recommendation available",
          appId: id,
          appName: app.name,
          recommendationScore: 0
        });
      }
      
      res.json(recommendation);
    } catch (error) {
      console.error("Error fetching app restart recommendation:", error);
      res.status(500).json({ message: "Failed to fetch restart recommendation" });
    }
  });

  // Get failure predictions for all apps
  app.get("/api/predictions", async (req: Request, res: Response) => {
    try {
      const predictions = await generateAllAppPredictions();
      res.json(predictions);
    } catch (error) {
      console.error("Error generating predictions:", error);
      res.status(500).json({ message: "Failed to generate predictions" });
    }
  });

  // Get failure prediction for a specific app
  app.get("/api/apps/:id/prediction", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid app ID" });
      }
      
      const app = await storage.getApp(id);
      if (!app) {
        return res.status(404).json({ message: "App not found" });
      }
      
      const prediction = await generateAppPredictions(id);
      if (!prediction) {
        return res.json({ 
          message: "No prediction available",
          appId: id,
          appName: app.name,
          aggregatedFailureProbability: 0
        });
      }
      
      res.json(prediction);
    } catch (error) {
      console.error(`Error generating prediction for app ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to generate app prediction" });
    }
  });

  // ENDPOINT MANAGEMENT
  
  // Get all endpoints (optionally filtered by app)
  app.get("/api/endpoints", async (req: Request, res: Response) => {
    try {
      const appId = req.query.appId ? parseInt(req.query.appId as string) : undefined;
      const endpoints = await storage.getEndpoints(appId);
      res.json(endpoints);
    } catch (error) {
      console.error("Error fetching endpoints:", error);
      res.status(500).json({ message: "Failed to fetch endpoints" });
    }
  });
  
  // Get endpoints for a specific app
  app.get("/api/apps/:id/endpoints", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid app ID" });
      }
      
      const app = await storage.getApp(id);
      if (!app) {
        return res.status(404).json({ message: "App not found" });
      }
      
      const endpoints = await storage.getEndpoints(id);
      res.json(endpoints);
    } catch (error) {
      console.error("Error fetching app endpoints:", error);
      res.status(500).json({ message: "Failed to fetch app endpoints" });
    }
  });
  
  // Get a specific endpoint
  app.get("/api/endpoints/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid endpoint ID" });
      }
      
      const endpoint = await storage.getEndpoint(id);
      if (!endpoint) {
        return res.status(404).json({ message: "Endpoint not found" });
      }
      
      res.json(endpoint);
    } catch (error) {
      console.error("Error fetching endpoint:", error);
      res.status(500).json({ message: "Failed to fetch endpoint" });
    }
  });
  
  // Create a new endpoint
  app.post("/api/endpoints", async (req: Request, res: Response) => {
    try {
      const validationResult = insertEndpointSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid endpoint data", 
          errors: validationResult.error.format() 
        });
      }
      
      // Validate that the app exists
      const app = await storage.getApp(validationResult.data.appId);
      if (!app) {
        return res.status(404).json({ message: "App not found" });
      }
      
      const endpoint = await storage.createEndpoint(validationResult.data);
      res.status(201).json(endpoint);
    } catch (error) {
      console.error("Error creating endpoint:", error);
      res.status(500).json({ message: "Failed to create endpoint" });
    }
  });
  
  // Update an endpoint
  app.patch("/api/endpoints/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid endpoint ID" });
      }
      
      const endpoint = await storage.getEndpoint(id);
      if (!endpoint) {
        return res.status(404).json({ message: "Endpoint not found" });
      }
      
      const updatedEndpoint = await storage.updateEndpoint(id, req.body);
      res.json(updatedEndpoint);
    } catch (error) {
      console.error("Error updating endpoint:", error);
      res.status(500).json({ message: "Failed to update endpoint" });
    }
  });
  
  // Delete an endpoint
  app.delete("/api/endpoints/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid endpoint ID" });
      }
      
      const success = await storage.deleteEndpoint(id);
      if (!success) {
        return res.status(404).json({ message: "Endpoint not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting endpoint:", error);
      res.status(500).json({ message: "Failed to delete endpoint" });
    }
  });
  
  // PORT MANAGEMENT
  
  // Get all ports (optionally filtered by app)
  app.get("/api/ports", async (req: Request, res: Response) => {
    try {
      const appId = req.query.appId ? parseInt(req.query.appId as string) : undefined;
      const ports = await storage.getPorts(appId);
      res.json(ports);
    } catch (error) {
      console.error("Error fetching ports:", error);
      res.status(500).json({ message: "Failed to fetch ports" });
    }
  });
  
  // Get ports for a specific app
  app.get("/api/apps/:id/ports", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid app ID" });
      }
      
      const app = await storage.getApp(id);
      if (!app) {
        return res.status(404).json({ message: "App not found" });
      }
      
      const ports = await storage.getPorts(id);
      res.json(ports);
    } catch (error) {
      console.error("Error fetching app ports:", error);
      res.status(500).json({ message: "Failed to fetch app ports" });
    }
  });
  
  // Test email notifications
  app.post("/api/email/test", async (req: Request, res: Response) => {
    try {
      const emailAddress = req.body.email;
      
      if (!emailAddress) {
        return res.status(400).json({ message: "Email address is required" });
      }
      
      const result = await sendTestEmailNotification(emailAddress);
      
      if (result) {
        res.json({ 
          success: true, 
          message: "Test email sent successfully" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to send test email. Check your SMTP configuration." 
        });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send test email due to an error" 
      });
    }
  });
  
  // Check port availability
  app.get("/api/ports/check/:port", async (req: Request, res: Response) => {
    try {
      const port = parseInt(req.params.port);
      if (isNaN(port)) {
        return res.status(400).json({ message: "Invalid port number" });
      }
      
      const isAvailable = await storage.checkPortAvailability(port);
      res.json({ 
        port, 
        available: isAvailable,
        message: isAvailable 
          ? `Port ${port} is available` 
          : `Port ${port} is currently in use`
      });
    } catch (error) {
      console.error("Error checking port availability:", error);
      res.status(500).json({ message: "Failed to check port availability" });
    }
  });
  
  // PROCESS MANAGEMENT
  
  // Get all processes (optionally filtered by app)
  app.get("/api/processes", async (req: Request, res: Response) => {
    try {
      const appId = req.query.appId ? parseInt(req.query.appId as string) : undefined;
      const processes = await storage.getProcesses(appId);
      res.json(processes);
    } catch (error) {
      console.error("Error fetching processes:", error);
      res.status(500).json({ message: "Failed to fetch processes" });
    }
  });
  
  // Get processes for a specific app
  app.get("/api/apps/:id/processes", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid app ID" });
      }
      
      const app = await storage.getApp(id);
      if (!app) {
        return res.status(404).json({ message: "App not found" });
      }
      
      const processes = await storage.getProcesses(id);
      res.json(processes);
    } catch (error) {
      console.error("Error fetching app processes:", error);
      res.status(500).json({ message: "Failed to fetch app processes" });
    }
  });
  
  // Terminate ghost processes for an app
  app.post("/api/apps/:id/terminate-ghost-processes", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid app ID" });
      }
      
      const app = await storage.getApp(id);
      if (!app) {
        return res.status(404).json({ message: "App not found" });
      }
      
      // Check if ghost process monitoring is enabled
      if (!app.checkForGhostProcesses) {
        return res.status(400).json({ 
          success: false, 
          message: "Ghost process detection is not enabled for this app" 
        });
      }
      
      // Use the controller service to terminate ghost processes
      const result = await terminateGhostProcesses(app);
      
      if (result.success) {
        res.json({ 
          success: true, 
          terminatedCount: result.terminatedCount,
          message: result.terminatedCount === 0 
            ? "No ghost processes found" 
            : `Successfully terminated ${result.terminatedCount} ghost processes`,
          simulation: true,
          details: "Note: This is a simulation of ghost process termination. In a production environment, this would connect to the actual Replit API."
        });
      } else {
        res.status(500).json({ 
          success: false, 
          terminatedCount: 0,
          message: result.error || "Failed to terminate ghost processes",
          simulation: true
        });
      }
    } catch (error) {
      console.error("Error terminating ghost processes:", error);
      res.status(500).json({ message: "Failed to terminate ghost processes" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Clean up when the server shuts down
  process.on('SIGINT', async () => {
    await stopMonitoring();
    process.exit(0);
  });

  return httpServer;
}
