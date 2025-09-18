CREATE TABLE `app_ports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_id` integer NOT NULL,
	`port` integer NOT NULL,
	`service` text,
	`status` text DEFAULT 'Unknown' NOT NULL,
	`last_checked` integer
);
--> statement-breakpoint
CREATE TABLE `app_processes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_id` integer NOT NULL,
	`pid` integer NOT NULL,
	`command` text NOT NULL,
	`started_at` integer NOT NULL,
	`status` text DEFAULT 'Running' NOT NULL,
	`cpu_usage` integer,
	`memory_usage` integer,
	`last_checked` integer
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`username` text,
	`role` text,
	`action` text NOT NULL,
	`details` text,
	`ip` text,
	`user_agent` text,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `endpoints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_id` integer NOT NULL,
	`path` text NOT NULL,
	`method` text DEFAULT 'GET' NOT NULL,
	`description` text,
	`expected_status_code` integer DEFAULT 200 NOT NULL,
	`timeout` integer DEFAULT 5000 NOT NULL,
	`status` text DEFAULT 'Unknown' NOT NULL,
	`last_checked` integer,
	`response_time` integer,
	`error_message` text,
	`last_successful` integer,
	`check_frequency` integer
);
--> statement-breakpoint
CREATE TABLE `log_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_id` integer,
	`timestamp` integer NOT NULL,
	`action` text NOT NULL,
	`details` text,
	`status` text
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`check_frequency` integer DEFAULT 30 NOT NULL,
	`auto_restart` integer DEFAULT false NOT NULL,
	`max_retries` integer DEFAULT 3 NOT NULL,
	`retry_delay` integer DEFAULT 5 NOT NULL,
	`endpoint_check_frequency` integer DEFAULT 60 NOT NULL,
	`port_check_frequency` integer DEFAULT 120 NOT NULL,
	`process_check_frequency` integer DEFAULT 300 NOT NULL,
	`enable_ghost_process_detection` integer DEFAULT true NOT NULL,
	`cleanup_ghost_processes` integer DEFAULT false NOT NULL,
	`send_toast_notifications` integer DEFAULT true NOT NULL,
	`endpoint_timeout` integer DEFAULT 5000 NOT NULL,
	`enable_emails` integer DEFAULT false NOT NULL,
	`email_address` text,
	`smtp_host` text,
	`smtp_port` integer DEFAULT 587,
	`smtp_user` text,
	`smtp_password` text,
	`smtp_sender` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`email` text,
	`is_active` integer DEFAULT true NOT NULL,
	`last_login` integer,
	`failed_login_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `web_apps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`app_url` text NOT NULL,
	`start_command` text NOT NULL,
	`port` integer NOT NULL,
	`type` text NOT NULL,
	`last_checked` integer,
	`status` text DEFAULT 'Stopped' NOT NULL,
	`last_logs` text,
	`created_at` integer NOT NULL,
	`average_response_time` integer,
	`resource_usage` integer,
	`uptime` integer,
	`error_rate` integer,
	`last_restarted` integer,
	`check_for_ghost_processes` integer DEFAULT true,
	`health_check_path` text DEFAULT '/health',
	`additional_ports` text
);
