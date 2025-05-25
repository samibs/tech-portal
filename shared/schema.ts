import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enhanced User schema with roles and security features
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // admin, user, viewer, emergency_admin
  email: text("email"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastLogin: integer("last_login", { mode: "timestamp" }),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: integer("locked_until", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  email: true,
});

export const updateUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  role: true,
  isActive: true,
  password: true,
  lastLogin: true,
}).partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;

// Audit log schema for security and compliance
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  username: text("username"),
  role: text("role"),
  action: text("action").notNull(),
  details: text("details"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).pick({
  userId: true,
  username: true,
  role: true,
  action: true,
  details: true,
  ip: true,
  userAgent: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Session schema for managing user sessions
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Session = typeof sessions.$inferSelect;

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

// App schema (renamed from Apps to webApps)
export const webApps = sqliteTable("web_apps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  appUrl: text("app_url").notNull(), // Changed from AppsUrl to appUrl
  startCommand: text("start_command").notNull(),
  port: integer("port").notNull(),
  type: text("type").notNull(), // Will use AppType enum
  lastChecked: integer("last_checked", { mode: "timestamp" }),
  status: text("status").notNull().default("Stopped"), // Will use AppStatus enum
  lastLogs: text("last_logs"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  
  // Performance metrics (added for prediction model)
  averageResponseTime: integer("average_response_time"), // in milliseconds
  resourceUsage: integer("resource_usage"), // percentage (0-100)
  uptime: integer("uptime"), // in minutes
  errorRate: integer("error_rate"), // percentage (0-100)
  lastRestarted: integer("last_restarted", { mode: "timestamp" }),
  
  // Enhanced monitoring fields
  checkForGhostProcesses: integer("check_for_ghost_processes", { mode: "boolean" }).default(true),
  healthCheckPath: text("health_check_path").default("/health"),
  additionalPorts: text("additional_ports"), // JSON string for array of numbers
});

// Zod schema for app insert
export const insertAppSchema = createInsertSchema(webApps)
  .pick({
    name: true,
    appUrl: true,
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
export type WebApp = typeof webApps.$inferSelect;

// Settings schema
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // App checking settings
  checkFrequency: integer("check_frequency").notNull().default(30), // in seconds
  autoRestart: integer("auto_restart", { mode: "boolean" }).notNull().default(false),
  maxRetries: integer("max_retries").notNull().default(3),
  retryDelay: integer("retry_delay").notNull().default(5), // in seconds

  // Enhanced monitoring settings
  endpointCheckFrequency: integer("endpoint_check_frequency").notNull().default(60), // in seconds
  portCheckFrequency: integer("port_check_frequency").notNull().default(120), // in seconds
  processCheckFrequency: integer("process_check_frequency").notNull().default(300), // in seconds
  enableGhostProcessDetection: integer("enable_ghost_process_detection", { mode: "boolean" }).notNull().default(true),
  cleanupGhostProcesses: integer("cleanup_ghost_processes", { mode: "boolean" }).notNull().default(false), // Whether to automatically kill ghost processes
  sendToastNotifications: integer("send_toast_notifications", { mode: "boolean" }).notNull().default(true),
  endpointTimeout: integer("endpoint_timeout").notNull().default(5000), // in milliseconds
  
  // Email notification settings
  enableEmails: integer("enable_emails", { mode: "boolean" }).notNull().default(false),
  emailAddress: text("email_address"),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port").default(587),
  smtpUser: text("smtp_user"),
  smtpPassword: text("smtp_password"),
  smtpSender: text("smtp_sender")
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
    
    // Email notification settings
    enableEmails: true,
    emailAddress: true,
    smtpHost: true,
    smtpPort: true,
    smtpUser: true,
    smtpPassword: true,
    smtpSender: true,
  });

export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Log entry schema
export const logEntries = sqliteTable("log_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id"),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
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
export const endpoints = sqliteTable("endpoints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id").notNull(),
  path: text("path").notNull(),
  method: text("method").notNull().default("GET"),
  description: text("description"),
  expectedStatusCode: integer("expected_status_code").notNull().default(200),
  timeout: integer("timeout").notNull().default(5000), // in milliseconds
  status: text("status").notNull().default(EndpointStatus.UNKNOWN),
  lastChecked: integer("last_checked", { mode: "timestamp" }),
  responseTime: integer("response_time"), // in milliseconds
  errorMessage: text("error_message"),
  lastSuccessful: integer("last_successful", { mode: "timestamp" }),
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
export const appPorts = sqliteTable("app_ports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id").notNull(),
  port: integer("port").notNull(),
  service: text("service"), // What service uses this port (e.g., "HTTP Server", "WebSocket", "Database")
  status: text("status").notNull().default("Unknown"), // "Available", "In use", "Blocked"
  lastChecked: integer("last_checked", { mode: "timestamp" }),
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
export const appProcesses = sqliteTable("app_processes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id").notNull(),
  pid: integer("pid").notNull(),
  command: text("command").notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  status: text("status").notNull().default("Running"), // "Running", "Terminated", "Zombie"
  cpuUsage: integer("cpu_usage"), // percentage
  memoryUsage: integer("memory_usage"), // in MB
  lastChecked: integer("last_checked", { mode: "timestamp" }),
});

export const insertAppProcessSchema = createInsertSchema(appProcesses)
  .pick({
    appId: true,
    pid: true,
    command: true,
  });

export type InsertAppProcess = z.infer<typeof insertAppProcessSchema>;
export type AppProcess = typeof appProcesses.$inferSelect;
