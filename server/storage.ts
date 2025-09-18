import { 
  AppStatus, 
  InsertApp, 
  WebApp, 
  Settings, 
  InsertLog, 
  LogEntry,
  Endpoint,
  InsertEndpoint,
  AppPort,
  InsertAppPort,
  AppProcess,
  InsertAppProcess,
  EndpointStatus,
  User,
  InsertUser,
  UpdateUser,
  AuditLog,
  InsertAuditLog
} from "@shared/schema";
import { db } from "./db";
import { 
  webApps, 
  settings, 
  logEntries, 
  endpoints, 
  appPorts, 
  appProcesses,
  users,
  auditLogs
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

// Storage interface
export interface IStorage {
  // App management
  getApps(): Promise<WebApp[]>;
  getApp(id: number): Promise<WebApp | undefined>;
  createApp(app: InsertApp): Promise<WebApp>;
  updateApp(id: number, updates: Partial<WebApp>): Promise<WebApp | undefined>;
  deleteApp(id: number): Promise<boolean>;
  
  // Settings management
  getSettings(): Promise<Settings>;
  updateSettings(updates: Partial<Settings>): Promise<Settings>;
  
  // Logs management
  getLogs(appId?: number): Promise<(LogEntry & { appName?: string })[]>;
  createLog(log: InsertLog): Promise<LogEntry>;
  
  // Endpoint management
  getEndpoints(appId?: number): Promise<Endpoint[]>;
  getEndpoint(id: number): Promise<Endpoint | undefined>;
  createEndpoint(endpoint: InsertEndpoint): Promise<Endpoint>;
  updateEndpoint(id: number, updates: Partial<Endpoint>): Promise<Endpoint | undefined>;
  deleteEndpoint(id: number): Promise<boolean>;
  
  // Port management
  getPorts(appId?: number): Promise<AppPort[]>;
  getPort(id: number): Promise<AppPort | undefined>;
  createPort(port: InsertAppPort): Promise<AppPort>;
  updatePort(id: number, updates: Partial<AppPort>): Promise<AppPort | undefined>;
  deletePort(id: number): Promise<boolean>;
  checkPortAvailability(port: number): Promise<boolean>;
  
  // Process management
  getProcesses(appId?: number): Promise<AppProcess[]>;
  getProcess(id: number): Promise<AppProcess | undefined>;
  createProcess(process: InsertAppProcess): Promise<AppProcess>;
  updateProcess(id: number, updates: Partial<AppProcess>): Promise<AppProcess | undefined>;
  deleteProcess(id: number): Promise<boolean>;
  terminateGhostProcesses(appId: number): Promise<number>; // Returns number of terminated processes
  
  // User management
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: UpdateUser): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  updateUserLoginAttempts(id: number, attempts: number, lockedUntil?: Date): Promise<void>;
  
  // Audit logging
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // App methods
  async getApps(): Promise<WebApp[]> {
    return await db.select().from(webApps);
  }

  async getApp(id: number): Promise<WebApp | undefined> {
    const [app] = await db.select().from(webApps).where(eq(webApps.id, id));
    return app;
  }

  async createApp(insertApp: InsertApp): Promise<WebApp> {
    const now = new Date();
    
    // Prepare the app data for insertion
    const appData = {
      ...insertApp,
      status: AppStatus.STOPPED,
      lastChecked: now,
      lastLogs: null,
      createdAt: now,
      checkForGhostProcesses: insertApp.checkForGhostProcesses ?? true,
      healthCheckPath: insertApp.healthCheckPath ?? "/health",
      additionalPorts: insertApp.additionalPorts ? JSON.stringify(insertApp.additionalPorts) : null
    };
    
    // Create the app
    const [app] = await db.insert(webApps)
      .values(appData)
      .returning();
    
    // Log app creation
    await this.createLog({
      appId: app.id,
      action: "App Created",
      details: `Registered new app: ${insertApp.name}`,
      status: AppStatus.STOPPED
    });
    
    // Parse additional ports for port creation
    const additionalPortsArray = insertApp.additionalPorts || [];
    
    // For each additional port, create a port entry
    if (additionalPortsArray.length > 0) {
      for (const port of additionalPortsArray) {
        await this.createPort({
          appId: app.id,
          port,
          service: "Additional Service" 
        });
      }
    }
    
    // Also create an entry for the main port
    await this.createPort({
      appId: app.id,
      port: app.port,
      service: "Main HTTP Service"
    });
    
    return app;
  }

  async updateApp(id: number, updates: Partial<WebApp>): Promise<WebApp | undefined> {
    // Check if app exists first
    const existingApp = await this.getApp(id);
    if (!existingApp) return undefined;
    
    // Handle additionalPorts serialization if it's being updated
    const updateData = { ...updates };
    if (updates.additionalPorts) {
      updateData.additionalPorts = JSON.stringify(updates.additionalPorts);
    }
    
    const [updatedApp] = await db.update(webApps)
      .set(updateData)
      .where(eq(webApps.id, id))
      .returning();
    
    return updatedApp;
  }

  async deleteApp(id: number): Promise<boolean> {
    // Check if app exists first
    const existingApp = await this.getApp(id);
    if (!existingApp) return false;
    
    // Delete the app
    const result = await db.delete(webApps)
      .where(eq(webApps.id, id))
      .returning();
    
    if (result.length > 0) {
      // Log app deletion
      await this.createLog({
        appId: id,
        action: "App Deleted",
        details: `App ID ${id} was deleted`,
        status: null
      });
      return true;
    }
    
    return false;
  }

  // Settings methods
  async getSettings(): Promise<Settings> {
    const [setting] = await db.select().from(settings).limit(1);
    
    // Create default settings if none exist
    if (!setting) {
      const defaultSettings = {
        checkFrequency: 30,
        autoRestart: false,
        maxRetries: 3,
        retryDelay: 5,
        endpointCheckFrequency: 60,
        portCheckFrequency: 120,
        processCheckFrequency: 300,
        enableGhostProcessDetection: true,
        cleanupGhostProcesses: false,
        sendToastNotifications: true,
        endpointTimeout: 5000
      };
      
      const [newSettings] = await db.insert(settings)
        .values(defaultSettings)
        .returning();
      
      return newSettings;
    }
    
    return setting;
  }

  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    // Get current settings or create if none exist
    const currentSettings = await this.getSettings();
    
    // Update settings
    const [updatedSettings] = await db.update(settings)
      .set(updates)
      .where(eq(settings.id, currentSettings.id))
      .returning();
    
    // Log settings update
    await this.createLog({
      appId: null,
      action: "Settings Updated",
      details: `Updated settings: ${Object.keys(updates).join(', ')}`,
      status: null
    });
    
    return updatedSettings;
  }

  // Logs methods
  async getLogs(appId?: number): Promise<(LogEntry & { appName?: string })[]> {
    if (appId) {
      const logs = await db.select({
          id: logEntries.id,
          appId: logEntries.appId,
          action: logEntries.action,
          details: logEntries.details,
          status: logEntries.status,
          timestamp: logEntries.timestamp,
          appName: webApps.name
        })
        .from(logEntries)
        .leftJoin(webApps, eq(logEntries.appId, webApps.id))
        .where(eq(logEntries.appId, appId))
        .orderBy(desc(logEntries.timestamp))
        .limit(1000);
      
      return logs as (LogEntry & { appName?: string })[];
    }
    
    const logs = await db.select({
        id: logEntries.id,
        appId: logEntries.appId,
        action: logEntries.action,
        details: logEntries.details,
        status: logEntries.status,
        timestamp: logEntries.timestamp,
        appName: webApps.name
      })
      .from(logEntries)
      .leftJoin(webApps, eq(logEntries.appId, webApps.id))
      .orderBy(desc(logEntries.timestamp))
      .limit(1000);
    
    return logs as (LogEntry & { appName?: string })[];
  }

  async createLog(log: InsertLog): Promise<LogEntry> {
    // Create new log
    const [newLog] = await db.insert(logEntries)
      .values({
        ...log,
        timestamp: new Date()
      })
      .returning();
    
    return newLog;
  }

  // Endpoint methods
  async getEndpoints(appId?: number): Promise<Endpoint[]> {
    if (appId) {
      return await db.select()
        .from(endpoints)
        .where(eq(endpoints.appId, appId))
        .orderBy(endpoints.path);
    }
    
    return await db.select().from(endpoints).orderBy(endpoints.appId, endpoints.path);
  }

  async getEndpoint(id: number): Promise<Endpoint | undefined> {
    const [endpoint] = await db.select()
      .from(endpoints)
      .where(eq(endpoints.id, id));
    
    return endpoint;
  }

  async createEndpoint(endpoint: InsertEndpoint): Promise<Endpoint> {
    // Create the endpoint
    const [newEndpoint] = await db.insert(endpoints)
      .values({
        ...endpoint,
        status: EndpointStatus.UNKNOWN,
        lastChecked: null,
      })
      .returning();
    
    // Get the app details for the log
    const app = await this.getApp(endpoint.appId);
    
    // Log endpoint creation
    await this.createLog({
      appId: endpoint.appId,
      action: "Endpoint Added",
      details: `Added endpoint ${endpoint.method} ${endpoint.path} to app: ${app?.name}`,
      status: null
    });
    
    return newEndpoint;
  }

  async updateEndpoint(id: number, updates: Partial<Endpoint>): Promise<Endpoint | undefined> {
    // Check if endpoint exists
    const existingEndpoint = await this.getEndpoint(id);
    if (!existingEndpoint) return undefined;
    
    // Update the endpoint
    const [updatedEndpoint] = await db.update(endpoints)
      .set(updates)
      .where(eq(endpoints.id, id))
      .returning();
    
    return updatedEndpoint;
  }

  async deleteEndpoint(id: number): Promise<boolean> {
    // Check if endpoint exists
    const existingEndpoint = await this.getEndpoint(id);
    if (!existingEndpoint) return false;
    
    // Delete the endpoint
    const result = await db.delete(endpoints)
      .where(eq(endpoints.id, id))
      .returning();
    
    if (result.length > 0) {
      // Log endpoint deletion
      await this.createLog({
        appId: existingEndpoint.appId,
        action: "Endpoint Deleted",
        details: `Deleted endpoint ${existingEndpoint.method} ${existingEndpoint.path}`,
        status: null
      });
      return true;
    }
    
    return false;
  }

  // Port methods
  async getPorts(appId?: number): Promise<AppPort[]> {
    if (appId) {
      return await db.select()
        .from(appPorts)
        .where(eq(appPorts.appId, appId))
        .orderBy(appPorts.port);
    }
    
    return await db.select().from(appPorts).orderBy(appPorts.appId, appPorts.port);
  }

  async getPort(id: number): Promise<AppPort | undefined> {
    const [port] = await db.select()
      .from(appPorts)
      .where(eq(appPorts.id, id));
    
    return port;
  }

  async createPort(port: InsertAppPort): Promise<AppPort> {
    // Create the port
    const [newPort] = await db.insert(appPorts)
      .values({
        ...port,
        status: "Unknown",
        lastChecked: null
      })
      .returning();
    
    // Get the app details for the log
    const app = await this.getApp(port.appId);
    
    // Log port creation
    await this.createLog({
      appId: port.appId,
      action: "Port Added",
      details: `Added port ${port.port} (${port.service}) to app: ${app?.name}`,
      status: null
    });
    
    return newPort;
  }

  async updatePort(id: number, updates: Partial<AppPort>): Promise<AppPort | undefined> {
    // Check if port exists
    const existingPort = await this.getPort(id);
    if (!existingPort) return undefined;
    
    // Update the port
    const [updatedPort] = await db.update(appPorts)
      .set(updates)
      .where(eq(appPorts.id, id))
      .returning();
    
    return updatedPort;
  }

  async deletePort(id: number): Promise<boolean> {
    // Check if port exists
    const existingPort = await this.getPort(id);
    if (!existingPort) return false;
    
    // Delete the port
    const result = await db.delete(appPorts)
      .where(eq(appPorts.id, id))
      .returning();
    
    if (result.length > 0) {
      // Log port deletion
      await this.createLog({
        appId: existingPort.appId,
        action: "Port Deleted",
        details: `Deleted port ${existingPort.port} (${existingPort.service})`,
        status: null
      });
      return true;
    }
    
    return false;
  }

  async checkPortAvailability(port: number): Promise<boolean> {
    // In a real implementation, this would attempt to check if the port is free
    // For simulation purposes, we'll check against our registered ports
    const conflictingPorts = await db.select()
      .from(appPorts)
      .where(and(
        eq(appPorts.port, port),
        eq(appPorts.status, "In use")
      ));
    
    return conflictingPorts.length === 0;
  }

  // Process methods
  async getProcesses(appId?: number): Promise<AppProcess[]> {
    if (appId) {
      return await db.select()
        .from(appProcesses)
        .where(eq(appProcesses.appId, appId))
        .orderBy(desc(appProcesses.startedAt));
    }
    
    return await db.select().from(appProcesses).orderBy(appProcesses.appId, desc(appProcesses.startedAt));
  }

  async getProcess(id: number): Promise<AppProcess | undefined> {
    const [process] = await db.select()
      .from(appProcesses)
      .where(eq(appProcesses.id, id));
    
    return process;
  }

  async createProcess(process: InsertAppProcess): Promise<AppProcess> {
    const now = new Date();
    
    // Create the process
    const [newProcess] = await db.insert(appProcesses)
      .values({
        ...process,
        startedAt: now,
        status: "Running",
        lastChecked: now
      })
      .returning();
    
    // Get the app details for the log
    const app = await this.getApp(process.appId);
    
    // Log process creation
    await this.createLog({
      appId: process.appId,
      action: "Process Started",
      details: `Started process PID ${process.pid} (${process.command}) for app: ${app?.name}`,
      status: null
    });
    
    return newProcess;
  }

  async updateProcess(id: number, updates: Partial<AppProcess>): Promise<AppProcess | undefined> {
    // Check if process exists
    const existingProcess = await this.getProcess(id);
    if (!existingProcess) return undefined;
    
    // Update the process
    const [updatedProcess] = await db.update(appProcesses)
      .set(updates)
      .where(eq(appProcesses.id, id))
      .returning();
    
    return updatedProcess;
  }

  async deleteProcess(id: number): Promise<boolean> {
    // Check if process exists
    const existingProcess = await this.getProcess(id);
    if (!existingProcess) return false;
    
    // Delete the process
    const result = await db.delete(appProcesses)
      .where(eq(appProcesses.id, id))
      .returning();
    
    if (result.length > 0) {
      // Log process deletion
      await this.createLog({
        appId: existingProcess.appId,
        action: "Process Terminated",
        details: `Terminated process PID ${existingProcess.pid} (${existingProcess.command})`,
        status: null
      });
      return true;
    }
    
    return false;
  }

  async terminateGhostProcesses(appId: number): Promise<number> {
    // In a real implementation, this would find and kill ghost processes
    // For simulation purposes, we'll update the status of any running processes to terminated
    const runningProcesses = await db.select()
      .from(appProcesses)
      .where(and(
        eq(appProcesses.appId, appId),
        eq(appProcesses.status, "Running")
      ));
    
    if (runningProcesses.length === 0) return 0;
    
    // "Terminate" each process
    for (const process of runningProcesses) {
      await db.update(appProcesses)
        .set({ 
          status: "Terminated",
          lastChecked: new Date()
        })
        .where(eq(appProcesses.id, process.id));
      
      // Log process termination
      await this.createLog({
        appId: process.appId,
        action: "Ghost Process Terminated",
        details: `Terminated ghost process PID ${process.pid} (${process.command})`,
        status: null
      });
    }
    
    return runningProcesses.length;
  }

  // User management methods
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.username);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const now = new Date();
    
    const [user] = await db.insert(users)
      .values({
        ...insertUser,
        isActive: true,
        failedLoginAttempts: 0,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    
    return user;
  }

  async updateUser(id: number, updates: UpdateUser): Promise<User | undefined> {
    const existingUser = await this.getUser(id);
    if (!existingUser) return undefined;
    
    const [updatedUser] = await db.update(users)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const existingUser = await this.getUser(id);
    if (!existingUser) return false;
    
    const result = await db.delete(users)
      .where(eq(users.id, id))
      .returning();
    
    return result.length > 0;
  }

  async updateUserLoginAttempts(id: number, attempts: number, lockedUntil?: Date): Promise<void> {
    await db.update(users)
      .set({
        failedLoginAttempts: attempts,
        lockedUntil: lockedUntil || null,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
  }

  // Audit logging methods
  async getAuditLogs(limit: number = 1000): Promise<AuditLog[]> {
    return await db.select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs)
      .values({
        ...log,
        timestamp: new Date()
      })
      .returning();
    
    return newLog;
  }
}

// Export a singleton instance using DatabaseStorage
export const storage = new DatabaseStorage();
