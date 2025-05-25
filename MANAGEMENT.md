# TechPortal Management Scripts

This document describes the management scripts available for starting, stopping, and managing your TechPortal application on both Linux and Windows systems.

## Available Scripts

### Linux/macOS
- **`techportal.sh`** - Bash script for Linux/macOS systems

### Windows
- **`techportal.bat`** - Batch script for Windows Command Prompt
- **`techportal.ps1`** - PowerShell script for Windows PowerShell

## Quick Start

### Linux/macOS
```bash
# Make script executable (first time only)
chmod +x techportal.sh

# Start in development mode
./techportal.sh dev

# Start in production mode
./techportal.sh start

# Check status
./techportal.sh status

# Stop the application
./techportal.sh stop
```

### Windows Command Prompt
```cmd
REM Start in development mode
techportal.bat dev

REM Start in production mode
techportal.bat start

REM Check status
techportal.bat status

REM Stop the application
techportal.bat stop
```

### Windows PowerShell
```powershell
# Start in development mode
.\techportal.ps1 dev

# Start in production mode
.\techportal.ps1 start

# Check status
.\techportal.ps1 status

# Stop the application
.\techportal.ps1 stop
```

## Commands Reference

All scripts support the same commands with identical syntax:

### Core Commands

| Command | Description | Example |
|---------|-------------|---------|
| `start [mode]` | Start the application | `./techportal.sh start prod` |
| `stop` | Stop the application | `./techportal.sh stop` |
| `restart [mode]` | Restart the application | `./techportal.sh restart dev` |
| `status` | Show application status | `./techportal.sh status` |
| `dev` | Start in development mode | `./techportal.sh dev` |
| `build` | Build the application | `./techportal.sh build` |
| `logs [lines]` | Show application logs | `./techportal.sh logs 100` |
| `follow` | Follow logs in real-time | `./techportal.sh follow` |
| `help` | Show help information | `./techportal.sh help` |

### Modes

- **`dev`** or **`development`** - Development mode with hot reloading
- **`prod`** or **`production`** - Production mode (default)

## Detailed Usage

### Starting the Application

#### Development Mode
Development mode uses `npm run dev` and provides hot reloading for development:

```bash
# Linux/macOS
./techportal.sh dev
./techportal.sh start dev

# Windows
techportal.bat dev
.\techportal.ps1 dev
```

#### Production Mode
Production mode builds the application and runs it optimized for production:

```bash
# Linux/macOS
./techportal.sh start
./techportal.sh start prod

# Windows
techportal.bat start
.\techportal.ps1 start
```

### Checking Status

The status command shows:
- Whether the application is running
- Process ID (PID)
- Port number
- Log file location
- Whether the port is actively listening

```bash
# Example output
● TechPortal is running (PID: 12345)
  Port: 5050
  Log file: techportal.log
  PID file: techportal.pid
  Status: Listening on port 5050
```

### Managing Logs

#### View Recent Logs
```bash
# Show last 50 lines (default)
./techportal.sh logs

# Show last 100 lines
./techportal.sh logs 100
```

#### Follow Logs in Real-time
```bash
# Follow logs (Ctrl+C to stop)
./techportal.sh follow
```

### Stopping and Restarting

#### Graceful Stop
```bash
./techportal.sh stop
```

#### Restart
```bash
# Restart in same mode
./techportal.sh restart

# Restart in specific mode
./techportal.sh restart dev
```

## Configuration

### Environment Variables

The scripts respect the following environment variables:

- **`PORT`** - Port number for the application (default: 5050)

#### Setting Port (Linux/macOS)
```bash
export PORT=3000
./techportal.sh start
```

#### Setting Port (Windows)
```cmd
set PORT=3000
techportal.bat start
```

#### Setting Port (PowerShell)
```powershell
$env:PORT = "3000"
.\techportal.ps1 start
```

### Generated Files

The scripts create the following files during operation:

- **`techportal.pid`** - Contains the process ID of the running application
- **`techportal.log`** - Contains application logs

These files are automatically managed by the scripts and should not be manually edited.

## Troubleshooting

### Common Issues

#### "Command not found" (Linux/macOS)
Make sure the script is executable:
```bash
chmod +x techportal.sh
```

#### "Execution policy" error (Windows PowerShell)
You may need to allow script execution:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Port already in use
If you get a port conflict, either:
1. Stop the conflicting process
2. Change the port using the `PORT` environment variable

#### Application won't start
1. Check if dependencies are installed: `npm install`
2. Check the logs: `./techportal.sh logs`
3. Verify your `.env` file is properly configured

#### Process shows as running but port not listening
This usually indicates the application failed to start properly. Check the logs:
```bash
./techportal.sh logs
```

### Manual Cleanup

If the scripts get confused about the application state:

```bash
# Remove PID file
rm -f techportal.pid

# Check for any remaining processes
ps aux | grep node

# Kill any remaining processes manually
kill <PID>
```

## Integration with Development Workflow

### Recommended Development Workflow

1. **Initial Setup**
   ```bash
   # Run setup first
   npm install
   node setup.js
   ```

2. **Development**
   ```bash
   # Start in development mode
   ./techportal.sh dev
   
   # In another terminal, follow logs
   ./techportal.sh follow
   ```

3. **Testing Production Build**
   ```bash
   # Stop development server
   ./techportal.sh stop
   
   # Start in production mode
   ./techportal.sh start prod
   ```

4. **Deployment**
   ```bash
   # Build and start for production
   ./techportal.sh build
   ./techportal.sh start prod
   ```

### CI/CD Integration

The scripts can be used in CI/CD pipelines:

```bash
# Build and test
./techportal.sh build
./techportal.sh start prod
sleep 10  # Wait for startup
curl http://localhost:5050/health  # Health check
./techportal.sh stop
```

## Advanced Usage

### Custom Port Configuration

You can permanently set a custom port by modifying your `.env` file:

```bash
echo "PORT=3000" >> .env
```

### Running Multiple Instances

To run multiple instances on different ports:

```bash
# Terminal 1
PORT=3000 ./techportal.sh start

# Terminal 2  
PORT=3001 ./techportal.sh start
```

### Background Process Management

The scripts automatically run the application in the background. To run in foreground for debugging:

```bash
# Development mode in foreground
npm run dev

# Production mode in foreground
npm run build && npm start
```

## Support

For issues with the management scripts:

1. Check this documentation
2. Review the application logs: `./techportal.sh logs`
3. Verify your environment setup
4. Check the GitHub repository for known issues

## Script Features

### Cross-Platform Compatibility
- Identical command syntax across all platforms
- Platform-specific optimizations
- Colored output where supported
- Graceful error handling

### Process Management
- PID tracking for reliable process management
- Graceful shutdown with fallback to force kill
- Port conflict detection
- Automatic dependency installation

### Logging
- Centralized log file management
- Real-time log following
- Configurable log line display
- Error log highlighting

### Safety Features
- Prevents multiple instances
- Validates commands and parameters
- Automatic cleanup on exit
- Process state verification
