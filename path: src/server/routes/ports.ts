content:
```typescript
import { Router } from 'express';
import { requirePermission } from '../middleware/auth';
import { storage } from '../storage';
import { insertAppPortSchema } from '@shared/schema';

const router = Router();

// Get all ports (optionally filtered by app)
router.get("/", requirePermission("ports:read"), async (req, res) => {
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
  router.get("/apps/:id/ports", requirePermission("ports:read"), async (req, res) => {
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

  // Check port availability
  router.get("/check/:port", requirePermission("ports:read"), async (req, res) => {
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

  // Add a port mapping
  router.post("/", requirePermission("ports:write"), async (req, res) => {
    try {
      const validationResult = insertAppPortSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid port mapping data",
          errors: validationResult.error.format(),
        });
      }
      const portMapping = await storage.createPortMapping(validationResult.data);
      res.status(201).json(portMapping);
    } catch (error) {
      console.error("Error creating port mapping:", error);
      res.status(500).json({ message: "Failed to create port mapping" });
    }
  });

  // Delete a port mapping
  router.delete("/:id", requirePermission("ports:write"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = await storage.deletePortMapping(id);
      if (!success) {
        return res.status(404).json({ message: "Port mapping not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting port mapping:", error);
      res.status(500).json({ message: "Failed to delete port mapping" });
    }
  });

export default router;
```
