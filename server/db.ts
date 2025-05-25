import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from "@shared/schema";
import path from 'path';
import fs from 'fs';

// Create SQLite database file in the data directory
const dbPath = path.join(process.cwd(), 'data', 'techportal.db');

// Ensure the data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create libsql client
const client = createClient({
  url: `file:${dbPath}`
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Initialize database with tables
export async function initializeDatabase() {
  try {
    // Create tables if they don't exist
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        email TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_login INTEGER,
        failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT,
        role TEXT,
        action TEXT NOT NULL,
        details TEXT,
        ip TEXT,
        user_agent TEXT,
        timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS web_apps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        app_url TEXT NOT NULL,
        start_command TEXT NOT NULL,
        port INTEGER NOT NULL,
        type TEXT NOT NULL,
        last_checked INTEGER,
        status TEXT NOT NULL DEFAULT 'Stopped',
        last_logs TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        average_response_time INTEGER,
        resource_usage INTEGER,
        uptime INTEGER,
        error_rate INTEGER,
        last_restarted INTEGER,
        check_for_ghost_processes INTEGER DEFAULT 1,
        health_check_path TEXT DEFAULT '/health',
        additional_ports TEXT
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        check_frequency INTEGER NOT NULL DEFAULT 30,
        auto_restart INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        retry_delay INTEGER NOT NULL DEFAULT 5,
        endpoint_check_frequency INTEGER NOT NULL DEFAULT 60,
        port_check_frequency INTEGER NOT NULL DEFAULT 120,
        process_check_frequency INTEGER NOT NULL DEFAULT 300,
        enable_ghost_process_detection INTEGER NOT NULL DEFAULT 1,
        cleanup_ghost_processes INTEGER NOT NULL DEFAULT 0,
        send_toast_notifications INTEGER NOT NULL DEFAULT 1,
        endpoint_timeout INTEGER NOT NULL DEFAULT 5000,
        enable_emails INTEGER NOT NULL DEFAULT 0,
        email_address TEXT,
        smtp_host TEXT,
        smtp_port INTEGER DEFAULT 587,
        smtp_user TEXT,
        smtp_password TEXT,
        smtp_sender TEXT
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS log_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id INTEGER,
        timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        action TEXT NOT NULL,
        details TEXT,
        status TEXT
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS endpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id INTEGER NOT NULL,
        path TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'GET',
        description TEXT,
        expected_status_code INTEGER NOT NULL DEFAULT 200,
        timeout INTEGER NOT NULL DEFAULT 5000,
        status TEXT NOT NULL DEFAULT 'Unknown',
        last_checked INTEGER,
        response_time INTEGER,
        error_message TEXT,
        last_successful INTEGER,
        check_frequency INTEGER
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS app_ports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id INTEGER NOT NULL,
        port INTEGER NOT NULL,
        service TEXT,
        status TEXT NOT NULL DEFAULT 'Unknown',
        last_checked INTEGER
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS app_processes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id INTEGER NOT NULL,
        pid INTEGER NOT NULL,
        command TEXT NOT NULL,
        started_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        status TEXT NOT NULL DEFAULT 'Running',
        cpu_usage INTEGER,
        memory_usage INTEGER,
        last_checked INTEGER
      )
    `);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Export the client instance for direct queries if needed
export { client };
