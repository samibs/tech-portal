import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (kept from original file for compatibility)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// App status enum
export enum AppStatus {
  RUNNING = "Running",
  STOPPED = "Stopped",
  UNREACHABLE = "Unreachable",
  ERROR = "Error"
}

// App type enum
export enum AppType {
  FRONTEND = "Frontend",
  BACKEND = "Backend",
  DATABASE = "Database",
  OTHER = "Other"
}

// App schema
export const replitApps = pgTable("replit_apps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  replitUrl: text("replit_url").notNull(),
  startCommand: text("start_command").notNull(),
  port: integer("port").notNull(),
  type: text("type").notNull(), // Will use AppType enum
  lastChecked: timestamp("last_checked"),
  status: text("status").notNull().default("Stopped"), // Will use AppStatus enum
  lastLogs: text("last_logs"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  // Performance metrics (added for prediction model)
  averageResponseTime: integer("average_response_time"), // in milliseconds
  resourceUsage: integer("resource_usage"), // percentage (0-100)
  uptime: integer("uptime"), // in minutes
  errorRate: integer("error_rate"), // percentage (0-100)
  lastRestarted: timestamp("last_restarted"),
  
  // Enhanced monitoring fields
  checkForGhostProcesses: boolean("check_for_ghost_processes").default(true),
  healthCheckPath: text("health_check_path").default("/health"),
  additionalPorts: jsonb("additional_ports").$type<number[]>(),
});

// Zod schema for app insert
export const insertAppSchema = createInsertSchema(replitApps)
  .pick({
    name: true,
    replitUrl: true,
    startCommand: true,
    port: true,
    type: true,
    healthCheckPath: true,
    checkForGhostProcesses: true,
  })
  .extend({
    type: z.enum([
      AppType.FRONTEND,
      AppType.BACKEND,
      AppType.DATABASE,
      AppType.OTHER
    ]),
    additionalPorts: z.array(z.number()).optional(),
  });

export type InsertApp = z.infer<typeof insertAppSchema>;
export type ReplitApp = typeof replitApps.$inferSelect;

// Settings schema
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  // App checking settings
  checkFrequency: integer("check_frequency").notNull().default(30), // in seconds
  autoRestart: boolean("auto_restart").notNull().default(false),
  maxRetries: integer("max_retries").notNull().default(3),
  retryDelay: integer("retry_delay").notNull().default(5), // in seconds

  // Enhanced monitoring settings
  endpointCheckFrequency: integer("endpoint_check_frequency").notNull().default(60), // in seconds
  portCheckFrequency: integer("port_check_frequency").notNull().default(120), // in seconds
  processCheckFrequency: integer("process_check_frequency").notNull().default(300), // in seconds
  enableGhostProcessDetection: boolean("enable_ghost_process_detection").notNull().default(true),
  cleanupGhostProcesses: boolean("cleanup_ghost_processes").notNull().default(false), // Whether to automatically kill ghost processes
  sendToastNotifications: boolean("send_toast_notifications").notNull().default(true),
  endpointTimeout: integer("endpoint_timeout").notNull().default(5000), // in milliseconds
});

export const updateSettingsSchema = createInsertSchema(settings)
  .pick({
    checkFrequency: true,
    autoRestart: true,
    maxRetries: true,
    retryDelay: true,
    endpointCheckFrequency: true,
    portCheckFrequency: true, 
    processCheckFrequency: true,
    enableGhostProcessDetection: true,
    cleanupGhostProcesses: true,
    sendToastNotifications: true,
    endpointTimeout: true,
  });

export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Log entry schema
export const logEntries = pgTable("log_entries", {
  id: serial("id").primaryKey(),
  appId: integer("app_id"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  action: text("action").notNull(),
  details: text("details"),
  status: text("status"),
});

export const insertLogSchema = createInsertSchema(logEntries)
  .pick({
    appId: true,
    action: true,
    details: true,
    status: true,
  });

export type InsertLog = z.infer<typeof insertLogSchema>;
export type LogEntry = typeof logEntries.$inferSelect;

// Endpoint status enum
export enum EndpointStatus {
  UP = "Up",
  DOWN = "Down",
  DEGRADED = "Degraded",
  UNKNOWN = "Unknown"
}

// Endpoint schema
export const endpoints = pgTable("endpoints", {
  id: serial("id").primaryKey(),
  appId: integer("app_id").notNull(),
  path: text("path").notNull(),
  method: text("method").notNull().default("GET"),
  description: text("description"),
  expectedStatusCode: integer("expected_status_code").notNull().default(200),
  timeout: integer("timeout").notNull().default(5000), // in milliseconds
  status: text("status").notNull().default(EndpointStatus.UNKNOWN),
  lastChecked: timestamp("last_checked"),
  responseTime: integer("response_time"), // in milliseconds
  errorMessage: text("error_message"),
  lastSuccessful: timestamp("last_successful"),
  checkFrequency: integer("check_frequency"), // in seconds, null means use global setting
});

export const insertEndpointSchema = createInsertSchema(endpoints)
  .pick({
    appId: true,
    path: true,
    method: true,
    description: true,
    expectedStatusCode: true,
    timeout: true,
    checkFrequency: true,
  });

export type InsertEndpoint = z.infer<typeof insertEndpointSchema>;
export type Endpoint = typeof endpoints.$inferSelect;

// Port schema to track all ports used by an application
export const appPorts = pgTable("app_ports", {
  id: serial("id").primaryKey(),
  appId: integer("app_id").notNull(),
  port: integer("port").notNull(),
  service: text("service"), // What service uses this port (e.g., "HTTP Server", "WebSocket", "Database")
  status: text("status").notNull().default("Unknown"), // "Available", "In use", "Blocked"
  lastChecked: timestamp("last_checked"),
});

export const insertAppPortSchema = createInsertSchema(appPorts)
  .pick({
    appId: true,
    port: true,
    service: true,
  });

export type InsertAppPort = z.infer<typeof insertAppPortSchema>;
export type AppPort = typeof appPorts.$inferSelect;

// Process schema to track running processes for applications
export const appProcesses = pgTable("app_processes", {
  id: serial("id").primaryKey(),
  appId: integer("app_id").notNull(),
  pid: integer("pid").notNull(),
  command: text("command").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  status: text("status").notNull().default("Running"), // "Running", "Terminated", "Zombie"
  cpuUsage: integer("cpu_usage"), // percentage
  memoryUsage: integer("memory_usage"), // in MB
  lastChecked: timestamp("last_checked"),
});

export const insertAppProcessSchema = createInsertSchema(appProcesses)
  .pick({
    appId: true,
    pid: true,
    command: true,
  });

export type InsertAppProcess = z.infer<typeof insertAppProcessSchema>;
export type AppProcess = typeof appProcesses.$inferSelect;
