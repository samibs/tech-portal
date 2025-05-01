import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertAppSchema, updateSettingsSchema, AppStatus } from "@shared/schema";
import { startMonitoring, stopMonitoring, updateCheckFrequency } from "./services/monitor";
import { startApp, stopApp, restartApp } from "./services/controller";
import { getRestartRecommendations, getAppRestartRecommendation } from "./services/recommendation";

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

  // Create HTTP server
  const httpServer = createServer(app);

  // Clean up when the server shuts down
  process.on('SIGINT', async () => {
    await stopMonitoring();
    process.exit(0);
  });

  return httpServer;
}
