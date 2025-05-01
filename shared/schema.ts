import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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
});

// Zod schema for app insert
export const insertAppSchema = createInsertSchema(replitApps)
  .pick({
    name: true,
    replitUrl: true,
    startCommand: true,
    port: true,
    type: true,
  })
  .extend({
    type: z.enum([
      AppType.FRONTEND,
      AppType.BACKEND,
      AppType.DATABASE,
      AppType.OTHER
    ]),
  });

export type InsertApp = z.infer<typeof insertAppSchema>;
export type ReplitApp = typeof replitApps.$inferSelect;

// Settings schema
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  checkFrequency: integer("check_frequency").notNull().default(30), // in seconds
  autoRestart: boolean("auto_restart").notNull().default(false),
  maxRetries: integer("max_retries").notNull().default(3),
  retryDelay: integer("retry_delay").notNull().default(5), // in seconds
});

export const updateSettingsSchema = createInsertSchema(settings)
  .pick({
    checkFrequency: true,
    autoRestart: true,
    maxRetries: true,
    retryDelay: true,
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
