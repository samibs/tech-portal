```typescript
import { Router } from "express";
import { processManager } from "../services/process-manager";
import { requirePermission } from "../middleware/auth";
import { storage } from "../storage";
import { insertAppPortSchema } from "@shared/schema";
import { createServer, type Server } from "http";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import {
  insertAppSchema,
  updateSettingsSchema,
  AppStatus,
  insertEndpointSchema,
  EndpointStatus,
} from "@shared/schema";
import { startMonitoring, stopMonitoring, updateCheckFrequency } from "./services/monitor";
import { startApp, stopApp, restartApp, terminateGhostProcesses } from "./services/controller";
import {
  getRestartRecommendations,
  getAppRestartRecommendation,
  generateAllAppPredictions,
  generateAppPredictions,
} from "./services/recommendation";
import { initializeEmailTransporter, sendTestEmailNotification } from "./services/email";
import { registerAuthRoutes } from "./routes/auth";
import { registerSetupRoutes } from "./routes/setup";
import { authenticateToken } from "./middleware/auth";
import processRoutes from "./routes/process";
import portRoutes from "./routes/ports";
import { webSocketManager } from "./websockets";
import { WebSocketServer } from "ws";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize monitoring service
  await startMonitoring();

  // Start process monitoring
  await processManager.startMonitoring();
  console.log("🚀 Process monitoring started");

  // Register authentication routes (these don't require authentication)
  registerAuthRoutes(app);

  // Register setup routes (these don't require authentication)
  registerSetupRoutes(app);

  app.use("/api", authenticateToken);

  // Add process monitoring routes
  app.use("/api/processes", processRoutes);
  app.use("/api/ports", portRoutes);

  // API routes (now protected by authentication)

  // Get all apps
  app.get(
    "/api/apps",
    requirePermission("apps:read"),
    async (req: Request, res: Response) => {
      try {
        const apps = await storage.getApps();
        res.json(apps);
      } catch (error) {
        console.error("Error fetching apps:", error);
        res.status(500).json({ message: "Failed to fetch apps" });
      }
    }
  );

  // Get a single app
  app.get(
    "/api/apps/:id",
    requirePermission("apps:read"),
    async (req: Request, res: Response) => {
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
    }
  );

  // Create a new app
  app.post(
    "/api/apps",
    requirePermission("apps:write"),
    async (req: Request, res: Response) => {
      try {
        const validationResult = insertAppSchema.safeParse(req.body);

        if (!validationResult.success) {
          return res.status(400).json({
            message: "Invalid app data",
            errors: validationResult.error.format(),
          });
        }

        const app = await storage.createApp(validationResult.data);
        res.status(201).json(app);
      } catch (error) {
        console.error("Error creating app:", error);
        res.status(500).json({ message: "Failed to create app" });
      }
    }
  );

  // Update an app
  app.patch(
    "/api/apps/:id",
    requirePermission("apps:write"),
    async (req: Request, res: Response) => {
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
    }
  );

  // Delete an app
  app.delete(
    "/api/apps/:id",
    requirePermission("apps:delete"),
    async (req: Request, res: Response) => {
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
    }
  );

  // Get app logs
  app.get(
    "/api/apps/:id/logs",
    requirePermission("logs:read"),
    async (req: Request, res: Response) => {
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
    }
  );

  // Start an app
  app.post(
    "/api/apps/:id/start",
    requirePermission("apps:control"),
    async (req: Request, res: Response) => {
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
            details:
              "Note: This is a simulation of app control. In a production environment, this would connect to the actual API.",
          });
        } else {
          res.status(500).json({
            message: result.error || "Failed to start app",
            simulation: true,
          });
        }
      } catch (error) {
        console.error("Error starting app:", error);
        res.status(500).json({ message: "Failed to start app" });
      }
    }
  );

  // Stop an app
  app.post(
    "/api/apps/:id/stop",
    requirePermission("apps:control"),
    async (req: Request, res: Response) => {
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
            details:
              "Note: This is a simulation of app control. In a production environment, this would connect to the actual API.",
          });
        } else {
          res.status(500).json({
            message: result.error || "Failed to stop app",
            simulation: true,
          });
        }
      } catch (error) {
        console.error("Error stopping app:", error);
        res.status(500).json({ message: "Failed to stop app" });
      }
    }
  );

  // Restart an app
  app.post(
    "/api/apps/:id/restart",
    requirePermission("apps:control"),
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(r_eq.params.id);
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
            details:
              "Note: This is a simulation of app control. In a production environment, this would connect to the actual API.",
          });
        } else {
          res.status(500).json({
            message: result.error || "Failed to restart app",
            simulation: true,
          });
        }
      } catch (error) {
        console.error("Error restarting app:", error);
        res.status(500).json({ message: "Failed to start app" });
      }
    }
  );

  // Get settings
  app.get("/api/settings", authenticateToken, requirePermission("settings:read"), async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Update settings
  app.patch("/api/settings", authenticateToken, requirePermission("settings:write"), async (req: Request, res: Response) => {
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
  app.get("/api/logs", authenticateToken, requirePermission("logs:read"), async (req: Request, res: Response) => {
    try {
      const logs = await storage.getLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Get system stats
  app.get("/api/stats", authenticateToken, requirePermission("apps:read"), async (req: Request, res: Response) => {
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
  app.get("/api/recommendations", authenticateToken, requirePermission("apps:read"), async (req: Request, res: Response) => {
    try {
      const recommendations = await getRestartRecommendations();
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching restart recommendations:", error);
      res.status(500).json({ message: "Failed to fetch restart recommendations" });
    }
  });

  // Get failure prediction for a specific app
  app.get(
    "/api/apps/:id/prediction",
    authenticateToken,
    requirePermission("apps:read"),
    async (req: Request, res: Response) => {
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
            recommendationScore: 0
          });
        }

        res.json(prediction);
      } catch (error) {
        console.error("Error generating prediction for app ${id}:", error);
        res.status(500).json({ message: "Failed to generate app prediction" });
      }
    }
  );

  // Get all users
  app.get("/api/users", authenticateToken, requirePermission("users:read"), async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create a new user
  app.post("/api/users", authenticateToken, requirePermission("users:create"), async (req, res) => {
    try {
      const validationResult = insertUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid user data",
          errors: validationResult.error.format(),
        });
      }
      const user = await storage.createUser(validationResult.data);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Update a user
  app.patch("/api/users/:id", authenticateToken, requirePermission("users:update"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUserById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const validationResult = updateUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid user data",
          errors: validationResult.error.format(),
        });
      }

      const updatedUser = await storage.updateUser(id, validationResult.data);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete a user
  app.delete("/api/users/:id", authenticateToken, requirePermission("users:delete"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Get all roles
  app.get("/api/roles", authenticateToken, requirePermission("roles:read"), async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Create a WebSocket server
  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (ws) => {
    // Add the new client to the list
    webSocketManager.addClient(ws);

    // Handle incoming messages
    ws.on("message", (message) => {
      console.log('received: %s', message);
    });

    // Handle client disconnection
    ws.on("close", () => {
      webSocketManager.removeClient(ws);
    });
  });

  return httpServer;
}
```