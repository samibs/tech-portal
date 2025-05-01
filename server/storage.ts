import { writeFile, readFile } from "fs/promises";
import path from "path";
import { AppStatus, AppType, InsertApp, ReplitApp, Settings, InsertLog, LogEntry } from "@shared/schema";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const APPS_FILE = path.join(DATA_DIR, "apps.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const LOGS_FILE = path.join(DATA_DIR, "logs.json");

// Ensures data directory exists
async function ensureDataDir() {
  try {
    await import("fs").then(fs => fs.promises.mkdir(DATA_DIR, { recursive: true }));
  } catch (error) {
    console.error("Error creating data directory:", error);
  }
}

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

// File-based storage implementation
export class FileStorage implements IStorage {
  private apps: Map<number, ReplitApp>;
  private settings: Settings;
  private logs: LogEntry[];
  private appIdCounter: number;
  private logIdCounter: number;
  private initialized: boolean;

  constructor() {
    this.apps = new Map();
    this.settings = {
      id: 1,
      checkFrequency: 30,
      autoRestart: false,
      maxRetries: 3,
      retryDelay: 5
    };
    this.logs = [];
    this.appIdCounter = 1;
    this.logIdCounter = 1;
    this.initialized = false;
  }

  // Initialize data from files
  async init() {
    if (this.initialized) return;
    
    await ensureDataDir();
    
    try {
      // Load apps
      try {
        const appsData = await readFile(APPS_FILE, 'utf8');
        const appsArray = JSON.parse(appsData) as ReplitApp[];
        this.apps = new Map(appsArray.map(app => [app.id, app]));
        this.appIdCounter = Math.max(...appsArray.map(app => app.id), 0) + 1;
      } catch (error) {
        // If file doesn't exist, use defaults
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error("Error loading apps:", error);
        }
      }
      
      // Load settings
      try {
        const settingsData = await readFile(SETTINGS_FILE, 'utf8');
        this.settings = JSON.parse(settingsData) as Settings;
      } catch (error) {
        // If file doesn't exist, use defaults
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error("Error loading settings:", error);
        }
        // Save default settings
        await this.saveSettings();
      }
      
      // Load logs
      try {
        const logsData = await readFile(LOGS_FILE, 'utf8');
        this.logs = JSON.parse(logsData) as LogEntry[];
        this.logIdCounter = Math.max(...this.logs.map(log => log.id), 0) + 1;
      } catch (error) {
        // If file doesn't exist, use defaults
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error("Error loading logs:", error);
        }
      }
      
      this.initialized = true;
    } catch (error) {
      console.error("Error initializing storage:", error);
      throw error;
    }
  }

  // Save data to files
  private async saveApps() {
    try {
      await writeFile(APPS_FILE, JSON.stringify(Array.from(this.apps.values())), 'utf8');
    } catch (error) {
      console.error("Error saving apps:", error);
    }
  }

  private async saveSettings() {
    try {
      await writeFile(SETTINGS_FILE, JSON.stringify(this.settings), 'utf8');
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  }

  private async saveLogs() {
    try {
      await writeFile(LOGS_FILE, JSON.stringify(this.logs), 'utf8');
    } catch (error) {
      console.error("Error saving logs:", error);
    }
  }

  // App methods
  async getApps(): Promise<ReplitApp[]> {
    await this.init();
    return Array.from(this.apps.values());
  }

  async getApp(id: number): Promise<ReplitApp | undefined> {
    await this.init();
    return this.apps.get(id);
  }

  async createApp(insertApp: InsertApp): Promise<ReplitApp> {
    await this.init();
    const id = this.appIdCounter++;
    const now = new Date();
    
    const app: ReplitApp = {
      id,
      ...insertApp,
      status: AppStatus.STOPPED,
      lastChecked: now,
      lastLogs: null,
      createdAt: now
    };
    
    this.apps.set(id, app);
    await this.saveApps();
    
    // Log app creation
    await this.createLog({
      appId: id,
      action: "App Created",
      details: `Registered new app: ${insertApp.name}`,
      status: AppStatus.STOPPED
    });
    
    return app;
  }

  async updateApp(id: number, updates: Partial<ReplitApp>): Promise<ReplitApp | undefined> {
    await this.init();
    const app = this.apps.get(id);
    
    if (!app) return undefined;
    
    const updatedApp = { ...app, ...updates };
    this.apps.set(id, updatedApp);
    await this.saveApps();
    
    return updatedApp;
  }

  async deleteApp(id: number): Promise<boolean> {
    await this.init();
    const deleted = this.apps.delete(id);
    if (deleted) {
      await this.saveApps();
      
      // Log app deletion
      await this.createLog({
        appId: id,
        action: "App Deleted",
        details: `App ID ${id} was deleted`,
        status: null
      });
    }
    return deleted;
  }

  // Settings methods
  async getSettings(): Promise<Settings> {
    await this.init();
    return this.settings;
  }

  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    await this.init();
    this.settings = { ...this.settings, ...updates };
    await this.saveSettings();
    
    // Log settings update
    await this.createLog({
      appId: null,
      action: "Settings Updated",
      details: `Updated settings: ${Object.keys(updates).join(', ')}`,
      status: null
    });
    
    return this.settings;
  }

  // Logs methods
  async getLogs(appId?: number): Promise<LogEntry[]> {
    await this.init();
    if (appId) {
      return this.logs.filter(log => log.appId === appId);
    }
    return this.logs;
  }

  async createLog(log: InsertLog): Promise<LogEntry> {
    await this.init();
    const id = this.logIdCounter++;
    const now = new Date();
    
    const newLog: LogEntry = {
      id,
      ...log,
      timestamp: now
    };
    
    this.logs.unshift(newLog); // Add to start of array
    
    // Keep logs limited to prevent excessive growth
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }
    
    await this.saveLogs();
    return newLog;
  }
}

// Export a singleton instance
export const storage = new FileStorage();
