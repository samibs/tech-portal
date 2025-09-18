import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// Emergency admin credentials (should be set via environment variables)
const EMERGENCY_ADMIN = {
  username: process.env.EMERGENCY_ADMIN_USERNAME || 'emergency_admin',
  password: process.env.EMERGENCY_ADMIN_PASSWORD || 'EmergencyAdmin2024!',
  role: 'emergency_admin'
};

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
  EMERGENCY_ADMIN = 'emergency_admin'
}

export const rolePermissions = {
  [UserRole.EMERGENCY_ADMIN]: ['*'], // Full access to everything
  [UserRole.ADMIN]: [
    'apps:read', 'apps:write', 'apps:delete', 'apps:control',
    'settings:read', 'settings:write',
    'users:read', 'users:write', 'users:delete',
    'logs:read', 'endpoints:read', 'endpoints:write',
    'processes:read', 'processes:write'
  ],
  [UserRole.USER]: [
    'apps:read', 'apps:write', 'apps:control',
    'logs:read', 'endpoints:read', 'endpoints:write',
    'processes:read'
  ],
  [UserRole.VIEWER]: [
    'apps:read', 'logs:read', 'endpoints:read', 'processes:read'
  ]
};

export function generateToken(user: { id: number; username: string; role: string }): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    secret,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token: string): string | jwt.JwtPayload {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.verify(token, secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Authentication middleware
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = verifyToken(token);
    
    // Check if it's emergency admin
    if (decoded.role === UserRole.EMERGENCY_ADMIN) {
      req.user = decoded;
      return next();
    }
    
    // Verify user still exists in database
    const user = await storage.getUser(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token - user not found' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

// Authorization middleware
export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = req.user.role as UserRole;
    const permissions = rolePermissions[userRole] || [];
    
    // Emergency admin has all permissions
    if (userRole === UserRole.EMERGENCY_ADMIN || permissions.includes('*')) {
      return next();
    }
    
    // Check specific permission
    if (permissions.includes(permission)) {
      return next();
    }
    
    return res.status(403).json({ 
      message: 'Insufficient permissions',
      required: permission,
      userRole: userRole
    });
  };
}

// Emergency admin login
export async function emergencyAdminLogin(username: string, password: string): Promise<string | null> {
  if (username === EMERGENCY_ADMIN.username && password === EMERGENCY_ADMIN.password) {
    const emergencyUser = {
      id: -1, // Special ID for emergency admin
      username: EMERGENCY_ADMIN.username,
      role: UserRole.EMERGENCY_ADMIN
    };
    
    console.log(`🚨 EMERGENCY ADMIN LOGIN: ${username} at ${new Date().toISOString()}`);
    
    return generateToken(emergencyUser);
  }
  
  return null;
}

// Rate limiting for authentication endpoints
export const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
};

// Audit logging for sensitive operations
export async function auditLog(req: AuthenticatedRequest, action: string, details?: Record<string, unknown>) {
  const logEntry = {
    timestamp: new Date(),
    userId: req.user?.id || null,
    username: req.user?.username || 'anonymous',
    role: req.user?.role || 'none',
    action,
    details: details ? JSON.stringify(details) : null,
    ip: req.ip,
    userAgent: req.get('User-Agent') || null
  };
  
  console.log('🔍 AUDIT LOG:', logEntry);
  
  // Store in database (you'll need to create an audit_logs table)
  try {
    await storage.createAuditLog(logEntry);
  } catch (error) {
    console.error('Failed to store audit log:', error);
  }
}

// Alias for backward compatibility
export const requireAuth = authenticateToken;
