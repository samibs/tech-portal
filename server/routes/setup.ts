import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { hashPassword, UserRole } from "../middleware/auth";

// Setup schema for first admin user
const setupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Valid email is required").optional()
});

export function registerSetupRoutes(app: Express): void {
  // Check if setup is needed (no users exist)
  app.get("/api/setup/status", async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      const needsSetup = users.length === 0;
      
      res.json({
        needsSetup,
        userCount: users.length,
        emergencyAdminAvailable: true,
        emergencyAdminCredentials: needsSetup ? {
          username: process.env.EMERGENCY_ADMIN_USERNAME || 'emergency_admin',
          password: process.env.EMERGENCY_ADMIN_PASSWORD || 'EmergencyAdmin2024!'
        } : undefined
      });
    } catch (error) {
      console.error("Setup status check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create first admin user (only when no users exist)
  app.post("/api/setup/admin", async (req: Request, res: Response) => {
    try {
      // Check if any users already exist
      const existingUsers = await storage.getUsers();
      if (existingUsers.length > 0) {
        return res.status(400).json({ 
          message: "Setup already completed. Users already exist in the system." 
        });
      }

      const validationResult = setupSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid setup data", 
          errors: validationResult.error.format() 
        });
      }
      
      const { username, password, email } = validationResult.data;
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create first admin user
      const adminUser = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        role: UserRole.ADMIN
      });
      
      console.log(`🎉 First admin user created: ${username}`);
      
      res.status(201).json({
        success: true,
        message: "First admin user created successfully",
        user: {
          id: adminUser.id,
          username: adminUser.username,
          role: adminUser.role,
          email: adminUser.email,
          createdAt: adminUser.createdAt
        }
      });
    } catch (error) {
      console.error("Setup admin creation error:", error);
      res.status(500).json({ message: "Internal server error during setup" });
    }
  });
}
