import { AppStatus, AppType, InsertApp, ReplitApp, Settings, InsertLog, LogEntry } from "@shared/schema";
import { db } from "./db";
import { replitApps, settings, logEntries } from "@shared/schema";
import { eq, desc, and, isNull } from "drizzle-orm";

// Storage interface
export interface IStorage {
  // App management
  getApps(): Promise<ReplitApp[]>;
  getApp(id: number): Promise<ReplitApp | undefined>;
  createApp(app: InsertApp): Promise<ReplitApp>;
  updateApp(id: number, updates: Partial<ReplitApp>): Promise<ReplitApp | undefined>;
  deleteApp(id: number): Promise<boolean>;
  
  // Settings management
  getSettings(): Promise<Settings>;
  updateSettings(updates: Partial<Settings>): Promise<Settings>;
  
  // Logs management
  getLogs(appId?: number): Promise<LogEntry[]>;
  createLog(log: InsertLog): Promise<LogEntry>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // App methods
  async getApps(): Promise<ReplitApp[]> {
    return await db.select().from(replitApps);
  }

  async getApp(id: number): Promise<ReplitApp | undefined> {
    const [app] = await db.select().from(replitApps).where(eq(replitApps.id, id));
    return app;
  }

  async createApp(insertApp: InsertApp): Promise<ReplitApp> {
    const now = new Date();
    
    // Create the app with default values
    const [app] = await db.insert(replitApps)
      .values({
        ...insertApp,
        status: AppStatus.STOPPED,
        lastChecked: now,
        lastLogs: null,
        createdAt: now
      })
      .returning();
    
    // Log app creation
    await this.createLog({
      appId: app.id,
      action: "App Created",
      details: `Registered new app: ${insertApp.name}`,
      status: AppStatus.STOPPED
    });
    
    return app;
  }

  async updateApp(id: number, updates: Partial<ReplitApp>): Promise<ReplitApp | undefined> {
    // Check if app exists first
    const existingApp = await this.getApp(id);
    if (!existingApp) return undefined;
    
    const [updatedApp] = await db.update(replitApps)
      .set(updates)
      .where(eq(replitApps.id, id))
      .returning();
    
    return updatedApp;
  }

  async deleteApp(id: number): Promise<boolean> {
    // Check if app exists first
    const existingApp = await this.getApp(id);
    if (!existingApp) return false;
    
    // Delete the app
    const result = await db.delete(replitApps)
      .where(eq(replitApps.id, id))
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
        retryDelay: 5
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
  async getLogs(appId?: number): Promise<LogEntry[]> {
    if (appId) {
      return await db.select()
        .from(logEntries)
        .where(eq(logEntries.appId, appId))
        .orderBy(desc(logEntries.timestamp))
        .limit(1000);
    }
    
    return await db.select()
      .from(logEntries)
      .orderBy(desc(logEntries.timestamp))
      .limit(1000);
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
}

// Export a singleton instance using DatabaseStorage
export const storage = new DatabaseStorage();
