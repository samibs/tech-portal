# Tech Portal Management Script for Windows PowerShell
# Usage: .\techportal.ps1 [start|stop|restart|status|dev|build] [options]

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    
    [Parameter(Position=1)]
    [string]$Mode = "production"
)

# Configuration
$APP_NAME = "TechPortal"
$PID_FILE = "techportal.pid"
$LOG_FILE = "techportal.log"
$PORT = if ($env:PORT) { $env:PORT } else { "5050" }

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

# Function to check if process is running
function Test-Running {
    if (-not (Test-Path $PID_FILE)) {
        return $false
    }
    
    $pid = Get-Content $PID_FILE -ErrorAction SilentlyContinue
    if (-not $pid) {
        Remove-Item $PID_FILE -ErrorAction SilentlyContinue
        return $false
    }
    
    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
    if (-not $process) {
        Remove-Item $PID_FILE -ErrorAction SilentlyContinue
        return $false
    }
    
    return $true
}

# Function to get process status
function Get-AppStatus {
    if (Test-Running) {
        $pid = Get-Content $PID_FILE
        Write-Host "● $APP_NAME is running" -ForegroundColor Green -NoNewline
        Write-Host " (PID: $pid)"
        Write-Host "  Port: $PORT"
        Write-Host "  Log file: $LOG_FILE"
        Write-Host "  PID file: $PID_FILE"
        
        # Check if port is listening
        $listening = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue
        if ($listening) {
            Write-Host "  Status: " -NoNewline
            Write-Host "Listening on port $PORT" -ForegroundColor Green
        } else {
            Write-Host "  Status: " -NoNewline
            Write-Host "Process running but not listening on port $PORT" -ForegroundColor Yellow
        }
    } else {
        Write-Host "● $APP_NAME is not running" -ForegroundColor Red
    }
}

# Function to start the application
function Start-App {
    param([string]$StartMode = "production")
    
    if (Test-Running) {
        Write-Warning "$APP_NAME is already running"
        Get-AppStatus
        return $false
    }
    
    Write-Status "Starting $APP_NAME in $StartMode mode..."
    
    # Check if dependencies are installed
    if (-not (Test-Path "node_modules")) {
        Write-Status "Installing dependencies..."
        $result = Start-Process -FilePath "npm" -ArgumentList "install" -Wait -PassThru -NoNewWindow
        if ($result.ExitCode -ne 0) {
            Write-Error "Failed to install dependencies"
            return $false
        }
    }
    
    # Start based on mode
    switch ($StartMode.ToLower()) {
        { $_ -in @("development", "dev") } {
            Write-Status "Starting in development mode..."
            $process = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -RedirectStandardOutput $LOG_FILE -RedirectStandardError $LOG_FILE
        }
        { $_ -in @("production", "prod") } {
            Write-Status "Building application..."
            $buildResult = Start-Process -FilePath "npm" -ArgumentList "run", "build" -Wait -PassThru -NoNewWindow
            if ($buildResult.ExitCode -ne 0) {
                Write-Error "Build failed"
                return $false
            }
            Write-Status "Starting in production mode..."
            $process = Start-Process -FilePath "npm" -ArgumentList "start" -PassThru -RedirectStandardOutput $LOG_FILE -RedirectStandardError $LOG_FILE
        }
        default {
            Write-Error "Invalid mode: $StartMode. Use 'dev' or 'prod'"
            return $false
        }
    }
    
    # Save PID
    $process.Id | Out-File -FilePath $PID_FILE -Encoding ASCII
    
    # Wait and check if it started successfully
    Start-Sleep -Seconds 3
    if (Test-Running) {
        Write-Success "$APP_NAME started successfully"
        Write-Host "  PID: $($process.Id)"
        Write-Host "  Mode: $StartMode"
        Write-Host "  URL: http://localhost:$PORT"
        Write-Host "  Logs: Get-Content $LOG_FILE -Tail 50"
        return $true
    } else {
        Write-Error "Failed to start $APP_NAME"
        if (Test-Path $LOG_FILE) {
            Write-Host "Last few lines from log:"
            Get-Content $LOG_FILE -Tail 10
        }
        return $false
    }
}

# Function to stop the application
function Stop-App {
    if (-not (Test-Running)) {
        Write-Warning "$APP_NAME is not running"
        return $false
    }
    
    $pid = Get-Content $PID_FILE
    Write-Status "Stopping $APP_NAME (PID: $pid)..."
    
    try {
        # Try graceful shutdown first
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            $process.CloseMainWindow() | Out-Null
            
            # Wait for graceful shutdown
            $count = 0
            while ($count -lt 10 -and -not $process.HasExited) {
                Start-Sleep -Seconds 1
                $count++
            }
            
            # Force kill if still running
            if (-not $process.HasExited) {
                Write-Warning "Graceful shutdown failed, forcing termination..."
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
            }
        }
        
        # Clean up
        Remove-Item $PID_FILE -ErrorAction SilentlyContinue
        
        # Check if process is still running
        $stillRunning = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($stillRunning) {
            Write-Error "Failed to stop $APP_NAME"
            return $false
        } else {
            Write-Success "$APP_NAME stopped successfully"
            return $true
        }
    } catch {
        Write-Error "Error stopping $APP_NAME: $($_.Exception.Message)"
        return $false
    }
}

# Function to restart the application
function Restart-App {
    param([string]$RestartMode = "production")
    
    Write-Status "Restarting $APP_NAME..."
    
    if (Test-Running) {
        Stop-App | Out-Null
        Start-Sleep -Seconds 2
    }
    
    Start-App -StartMode $RestartMode
}

# Function to show logs
function Show-Logs {
    param([int]$Lines = 50)
    
    if (Test-Path $LOG_FILE) {
        Write-Host "Last $Lines lines from $LOG_FILE:" -ForegroundColor Cyan
        Write-Host "----------------------------------------"
        Get-Content $LOG_FILE -Tail $Lines
    } else {
        Write-Warning "Log file not found: $LOG_FILE"
    }
}

# Function to follow logs
function Follow-Logs {
    if (Test-Path $LOG_FILE) {
        Write-Host "Following logs from $LOG_FILE (Ctrl+C to stop):" -ForegroundColor Cyan
        Write-Host "----------------------------------------"
        Get-Content $LOG_FILE -Wait
    } else {
        Write-Warning "Log file not found: $LOG_FILE"
    }
}

# Function to build the application
function Build-App {
    Write-Status "Building $APP_NAME..."
    $result = Start-Process -FilePath "npm" -ArgumentList "run", "build" -Wait -PassThru -NoNewWindow
    return $result.ExitCode -eq 0
}

# Function to show help
function Show-Help {
    Write-Host "$APP_NAME Management Script" -ForegroundColor White
    Write-Host ""
    Write-Host "Usage: .\techportal.ps1 [COMMAND] [OPTIONS]"
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor White
    Write-Host "  start [dev|prod]    Start the application (default: prod)"
    Write-Host "  stop                Stop the application"
    Write-Host "  restart [dev|prod]  Restart the application (default: prod)"
    Write-Host "  status              Show application status"
    Write-Host "  logs [lines]        Show last N lines of logs (default: 50)"
    Write-Host "  follow              Follow logs in real-time"
    Write-Host "  build               Build the application"
    Write-Host "  dev                 Start in development mode (alias for 'start dev')"
    Write-Host "  help                Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor White
    Write-Host "  .\techportal.ps1 start            # Start in production mode"
    Write-Host "  .\techportal.ps1 start dev        # Start in development mode"
    Write-Host "  .\techportal.ps1 dev              # Start in development mode"
    Write-Host "  .\techportal.ps1 restart prod     # Restart in production mode"
    Write-Host "  .\techportal.ps1 logs 100         # Show last 100 log lines"
    Write-Host "  .\techportal.ps1 follow           # Follow logs in real-time"
}

# Main script logic
switch ($Command.ToLower()) {
    "start" {
        Start-App -StartMode $Mode | Out-Null
    }
    "stop" {
        Stop-App | Out-Null
    }
    "restart" {
        Restart-App -RestartMode $Mode | Out-Null
    }
    "status" {
        Get-AppStatus
    }
    "logs" {
        $lines = if ($Mode -match '^\d+$') { [int]$Mode } else { 50 }
        Show-Logs -Lines $lines
    }
    "follow" {
        Follow-Logs
    }
    "build" {
        Build-App | Out-Null
    }
    "dev" {
        Start-App -StartMode "development" | Out-Null
    }
    { $_ -in @("help", "--help", "-h") } {
        Show-Help
    }
    default {
        Write-Error "Unknown command: $Command"
        Write-Host ""
        Show-Help
        exit 1
    }
}
