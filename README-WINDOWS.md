# Tech Portal - Windows Installation Guide

This guide provides step-by-step instructions for installing and configuring Tech Portal on Windows systems.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [PostgreSQL](https://www.postgresql.org/download/windows/) for Windows
- Git for Windows (optional)

## Installation Steps

### 1. Clone or Download the Repository

**Option 1: Using Git:**
```
git clone https://github.com/yourusername/tech-portal.git
cd tech-portal
```

**Option 2: Download ZIP:**
- Download the ZIP file from the repository
- Extract to a folder of your choice
- Open Command Prompt and navigate to the extracted folder:
```
cd path\to\tech-portal
```

### 2. Install Dependencies

```
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Database connection
DATABASE_URL=postgresql://username:password@localhost:5432/techportal

# Port configuration
PORT=5050

# Session security
SESSION_SECRET=your-secret-key-here
```

### 4. Setting Up PostgreSQL Database

#### Install PostgreSQL (if not already installed)
1. Download PostgreSQL installer from [the official website](https://www.postgresql.org/download/windows/)
2. Run the installer and follow the installation wizard
3. Remember the password you set for the 'postgres' user
4. Complete the installation including pgAdmin (recommended)

#### Create Database

**Using pgAdmin:**
1. Open pgAdmin from the Start Menu
2. Connect to your PostgreSQL server (enter password when prompted)
3. Right-click on 'Databases' and select 'Create' > 'Database'
4. Name it 'techportal' and click Save

**Using Command Line:**
1. Open Command Prompt
2. Log in to PostgreSQL:
```
psql -U postgres
```
3. Enter your password when prompted
4. Create the database:
```
CREATE DATABASE techportal;
```
5. Exit PostgreSQL:
```
\q
```

### 5. Initialize Database Schema

Run the database migration to create all required tables:

```
npm run db:push
```

### 6. Start the Application

#### Development Mode

```
npm run dev
```

#### Production Mode

```
npm run build
npm start
```

## Accessing the Application

- Backend API: http://localhost:5050
- Frontend (in development mode): Automatically opens in browser

## Port Configuration

### Backend Port (5050)
The backend port is configured in the `.env` file using the PORT variable.

### Frontend Development Port
For development, you can set a specific port by using:
```
set VITE_PORT=5173 && npm run dev
```

## Windows-Specific Configuration

### Running as a Windows Service

To run the application as a Windows Service, you can use tools like:

#### Option 1: PM2
```
npm install -g pm2
pm2 start npm --name "tech-portal" -- start
pm2 save
pm2-startup install
```

#### Option 2: NSSM (Non-Sucking Service Manager)
1. Download [NSSM](https://nssm.cc/download)
2. Extract and run from Command Prompt as Administrator:
```
nssm install TechPortal
```
3. In the GUI:
   - Path: point to your Node.js executable (C:\Program Files\nodejs\node.exe)
   - Startup directory: your project directory
   - Arguments: path\to\server\index.js
   - Set Environment variables including your DATABASE_URL, etc.

### Setting Up Scheduled Backups

Create a batch file (e.g., `backup.bat`):
```bat
@echo off
For /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
set PGPASSWORD=yourpassword
"C:\Program Files\PostgreSQL\{version}\bin\pg_dump" -U postgres techportal > "C:\backups\techportal_backup_%mydate%.sql"
```

Schedule this using Windows Task Scheduler.

## Email Notification Setup

1. Configure your SMTP settings through the application:
   - Navigate to "Integrations" in the web interface
   - Enter your SMTP server details (host, port, username, password)
   - Click "Save Email Settings"
   - Use "Send Test Email" to verify your configuration

## Troubleshooting Windows-Specific Issues

### PostgreSQL Connection Issues
- Ensure PostgreSQL service is running:
  ```
  sc query postgresql
  ```
- If not running:
  ```
  sc start postgresql
  ```
- Check Windows Firewall to ensure PostgreSQL port (5432) is allowed

### Node.js Path Issues
- Verify Node.js is in your PATH:
  ```
  node --version
  ```
- If not found, add Node.js to your PATH environment variable

### EADDRINUSE Errors
If the port is already in use:
1. Find the process using the port:
   ```
   netstat -ano | findstr :5050
   ```
2. Identify the PID and terminate the process:
   ```
   taskkill /PID [PID] /F
   ```

## Additional Windows Resources

- [PostgreSQL Windows Documentation](https://www.postgresql.org/docs/current/install-windows.html)
- [Node.js Windows Setup Guide](https://nodejs.org/en/download/package-manager/#windows)
- [PM2 Windows Documentation](https://pm2.keymetrics.io/docs/usage/startup/#windows-startup-script)

## Reporting Issues

If you encounter any Windows-specific issues, please report them to the repository issue tracker.