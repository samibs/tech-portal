import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { storage } from "../storage";
import { 
  generateToken, 
  hashPassword, 
  comparePassword, 
  emergencyAdminLogin,
  auditLog,
  UserRole,
  type AuthenticatedRequest
} from "../middleware/auth";

// Login schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

// Register schema
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Valid email is required").optional(),
  role: z.enum([UserRole.ADMIN, UserRole.USER, UserRole.VIEWER]).default(UserRole.USER)
});

// Change password schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters")
});

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 registration attempts per hour
  message: 'Too many registration attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export function registerAuthRoutes(app: Express): void {
  // Login endpoint
  app.post("/api/auth/login", authLimiter, async (req: Request, res: Response) => {
    try {
      const validationResult = loginSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid login data", 
          errors: validationResult.error.format() 
        });
      }
      
      const { username, password } = validationResult.data;
      
      // Check for emergency admin login first
      const emergencyToken = await emergencyAdminLogin(username, password);
      if (emergencyToken) {
        // Log emergency admin access
        await storage.createAuditLog({
          userId: -1,
          username: username,
          role: UserRole.EMERGENCY_ADMIN,
          action: "Emergency Admin Login",
          details: "Emergency admin accessed the system",
          ip: req.ip,
          userAgent: req.get('User-Agent') || null
        });
        
        return res.json({
          success: true,
          token: emergencyToken,
          user: {
            id: -1,
            username: username,
            role: UserRole.EMERGENCY_ADMIN,
            isEmergencyAdmin: true
          }
        });
      }
      
      // Regular user login
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Check if user is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return res.status(423).json({ 
          message: "Account is temporarily locked due to too many failed attempts",
          lockedUntil: user.lockedUntil
        });
      }
      
      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ message: "Account is disabled" });
      }
      
      // Verify password
      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        // Increment failed login attempts
        const newAttempts = user.failedLoginAttempts + 1;
        let lockedUntil: Date | undefined;
        
        // Lock account after 5 failed attempts for 30 minutes
        if (newAttempts >= 5) {
          lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }
        
        await storage.updateUserLoginAttempts(user.id, newAttempts, lockedUntil);
        
        // Log failed login attempt
        await storage.createAuditLog({
          userId: user.id,
          username: user.username,
          role: user.role,
          action: "Failed Login Attempt",
          details: `Failed login attempt ${newAttempts}/5`,
          ip: req.ip,
          userAgent: req.get('User-Agent') || null
        });
        
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Reset failed login attempts on successful login
      if (user.failedLoginAttempts > 0) {
        await storage.updateUserLoginAttempts(user.id, 0);
      }
      
      // Update last login time
      await storage.updateUser(user.id, { lastLogin: new Date() });
      
      // Generate token
      const token = generateToken({
        id: user.id,
        username: user.username,
        role: user.role
      });
      
      // Log successful login
      await storage.createAuditLog({
        userId: user.id,
        username: user.username,
        role: user.role,
        action: "Successful Login",
        details: "User logged in successfully",
        ip: req.ip,
        userAgent: req.get('User-Agent') || null
      });
      
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
          lastLogin: user.lastLogin
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error during login" });
    }
  });

  // Register endpoint (admin only)
  app.post("/api/auth/register", registerLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Only allow registration if user is authenticated and has admin privileges
      if (!req.user || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.EMERGENCY_ADMIN)) {
        return res.status(403).json({ message: "Only administrators can create new users" });
      }
      
      const validationResult = registerSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid registration data", 
          errors: validationResult.error.format() 
        });
      }
      
      const { username, password, email, role } = validationResult.data;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create user
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        role
      });
      
      // Log user creation
      await auditLog(req, "User Created", {
        newUserId: newUser.id,
        newUsername: newUser.username,
        newUserRole: newUser.role
      });
      
      res.status(201).json({
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role,
          email: newUser.email,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error during registration" });
    }
  });

  // Change password endpoint
  app.post("/api/auth/change-password", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const validationResult = changePasswordSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid password change data", 
          errors: validationResult.error.format() 
        });
      }
      
      const { currentPassword, newPassword } = validationResult.data;
      
      // Emergency admin cannot change password this way
      if (req.user.role === UserRole.EMERGENCY_ADMIN) {
        return res.status(400).json({ message: "Emergency admin password cannot be changed via API" });
      }
      
      // Get current user
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password
      const isValidPassword = await comparePassword(currentPassword, user.password);
      if (!isValidPassword) {
        await auditLog(req, "Failed Password Change", "Invalid current password provided");
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);
      
      // Update password
      await storage.updateUser(user.id, { password: hashedNewPassword });
      
      // Log password change
      await auditLog(req, "Password Changed", "User successfully changed their password");
      
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Internal server error during password change" });
    }
  });

  // Get current user info
  app.get("/api/auth/me", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Emergency admin
      if (req.user.role === UserRole.EMERGENCY_ADMIN) {
        return res.json({
          id: -1,
          username: req.user.username,
          role: UserRole.EMERGENCY_ADMIN,
          isEmergencyAdmin: true
        });
      }
      
      // Regular user
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error("Get user info error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint (mainly for audit logging)
  app.post("/api/auth/logout", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user) {
        await auditLog(req, "User Logout", "User logged out");
      }
      
      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Internal server error during logout" });
    }
  });

  // Get all users (admin only)
  app.get("/api/auth/users", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.EMERGENCY_ADMIN)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await storage.getUsers();
      
      // Remove password hashes from response
      const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        failedLoginAttempts: user.failedLoginAttempts,
        lockedUntil: user.lockedUntil,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user (admin only)
  app.patch("/api/auth/users/:id", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.EMERGENCY_ADMIN)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const { username, email, role, isActive } = req.body;
      
      const updatedUser = await storage.updateUser(userId, {
        username,
        email,
        role,
        isActive
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      await auditLog(req, "User Updated", {
        updatedUserId: userId,
        changes: { username, email, role, isActive }
      });
      
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        email: updatedUser.email,
        isActive: updatedUser.isActive,
        updatedAt: updatedUser.updatedAt
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/auth/users/:id", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.EMERGENCY_ADMIN)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Prevent deleting yourself
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      await auditLog(req, "User Deleted", { deletedUserId: userId });
      
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get audit logs (admin only)
  app.get("/api/auth/audit-logs", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.EMERGENCY_ADMIN)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;
      const auditLogs = await storage.getAuditLogs(limit);
      
      res.json(auditLogs);
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
