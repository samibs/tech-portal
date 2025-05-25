@echo off
setlocal enabledelayedexpansion

REM Tech Portal Management Script for Windows
REM Usage: techportal.bat [start|stop|restart|status|dev|build] [options]

set APP_NAME=TechPortal
set PID_FILE=techportal.pid
set LOG_FILE=techportal.log
if "%PORT%"=="" set PORT=5050

REM Function to print colored output (Windows doesn't support colors easily, so we'll use prefixes)
goto :main

:print_status
echo [INFO] %~1
goto :eof

:print_success
echo [SUCCESS] %~1
goto :eof

:print_error
echo [ERROR] %~1
goto :eof

:print_warning
echo [WARNING] %~1
goto :eof

:is_running
if not exist "%PID_FILE%" (
    exit /b 1
)

set /p pid=<"%PID_FILE%"
tasklist /FI "PID eq %pid%" 2>nul | find /i "%pid%" >nul
if errorlevel 1 (
    del "%PID_FILE%" 2>nul
    exit /b 1
)
exit /b 0

:get_status
call :is_running
if errorlevel 1 (
    echo ● %APP_NAME% is not running
) else (
    set /p pid=<"%PID_FILE%"
    echo ● %APP_NAME% is running ^(PID: !pid!^)
    echo   Port: %PORT%
    echo   Log file: %LOG_FILE%
    echo   PID file: %PID_FILE%
    
    REM Check if port is listening
    netstat -an | find ":%PORT% " >nul 2>&1
    if not errorlevel 1 (
        echo   Status: Listening on port %PORT%
    ) else (
        echo   Status: Process running but not listening on port %PORT%
    )
)
goto :eof

:start_app
set mode=%~1
if "%mode%"=="" set mode=production

call :is_running
if not errorlevel 1 (
    call :print_warning "%APP_NAME% is already running"
    call :get_status
    exit /b 1
)

call :print_status "Starting %APP_NAME% in %mode% mode..."

REM Check if dependencies are installed
if not exist "node_modules" (
    call :print_status "Installing dependencies..."
    call npm install
    if errorlevel 1 (
        call :print_error "Failed to install dependencies"
        exit /b 1
    )
)

REM Start based on mode
if /i "%mode%"=="development" goto :start_dev
if /i "%mode%"=="dev" goto :start_dev
if /i "%mode%"=="production" goto :start_prod
if /i "%mode%"=="prod" goto :start_prod

call :print_error "Invalid mode: %mode%. Use 'dev' or 'prod'"
exit /b 1

:start_dev
call :print_status "Starting in development mode..."
start /b cmd /c "npm run dev > %LOG_FILE% 2>&1"
goto :start_finish

:start_prod
call :print_status "Building application..."
call npm run build
if errorlevel 1 (
    call :print_error "Build failed"
    exit /b 1
)
call :print_status "Starting in production mode..."
start /b cmd /c "npm start > %LOG_FILE% 2>&1"
goto :start_finish

:start_finish
REM Get the PID of the started process (this is tricky in Windows batch)
timeout /t 2 /nobreak >nul

REM Find the node process running our app
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq node.exe" /FO CSV ^| find "node.exe"') do (
    set "temp_pid=%%i"
    set "temp_pid=!temp_pid:"=!"
    echo !temp_pid! > "%PID_FILE%"
    goto :pid_found
)

:pid_found
timeout /t 3 /nobreak >nul
call :is_running
if not errorlevel 1 (
    set /p pid=<"%PID_FILE%"
    call :print_success "%APP_NAME% started successfully"
    echo   PID: !pid!
    echo   Mode: %mode%
    echo   URL: http://localhost:%PORT%
    echo   Logs: type %LOG_FILE%
) else (
    call :print_error "Failed to start %APP_NAME%"
    if exist "%LOG_FILE%" (
        echo Last few lines from log:
        powershell -command "Get-Content '%LOG_FILE%' | Select-Object -Last 10"
    )
    exit /b 1
)
goto :eof

:stop_app
call :is_running
if errorlevel 1 (
    call :print_warning "%APP_NAME% is not running"
    exit /b 1
)

set /p pid=<"%PID_FILE%"
call :print_status "Stopping %APP_NAME% (PID: %pid%)..."

REM Try to kill the process
taskkill /PID %pid% /T /F >nul 2>&1

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Clean up
del "%PID_FILE%" 2>nul

REM Check if process is still running
tasklist /FI "PID eq %pid%" 2>nul | find /i "%pid%" >nul
if not errorlevel 1 (
    call :print_error "Failed to stop %APP_NAME%"
    exit /b 1
) else (
    call :print_success "%APP_NAME% stopped successfully"
)
goto :eof

:restart_app
set mode=%~1
if "%mode%"=="" set mode=production

call :print_status "Restarting %APP_NAME%..."

call :is_running
if not errorlevel 1 (
    call :stop_app
    timeout /t 2 /nobreak >nul
)

call :start_app "%mode%"
goto :eof

:show_logs
set lines=%~1
if "%lines%"=="" set lines=50

if exist "%LOG_FILE%" (
    echo Last %lines% lines from %LOG_FILE%:
    echo ----------------------------------------
    powershell -command "Get-Content '%LOG_FILE%' | Select-Object -Last %lines%"
) else (
    call :print_warning "Log file not found: %LOG_FILE%"
)
goto :eof

:follow_logs
if exist "%LOG_FILE%" (
    echo Following logs from %LOG_FILE% ^(Ctrl+C to stop^):
    echo ----------------------------------------
    powershell -command "Get-Content '%LOG_FILE%' -Wait"
) else (
    call :print_warning "Log file not found: %LOG_FILE%"
)
goto :eof

:build_app
call :print_status "Building %APP_NAME%..."
call npm run build
goto :eof

:show_help
echo %APP_NAME% Management Script
echo.
echo Usage: %~nx0 [COMMAND] [OPTIONS]
echo.
echo Commands:
echo   start [dev^|prod]    Start the application ^(default: prod^)
echo   stop                Stop the application
echo   restart [dev^|prod]  Restart the application ^(default: prod^)
echo   status              Show application status
echo   logs [lines]        Show last N lines of logs ^(default: 50^)
echo   follow              Follow logs in real-time
echo   build               Build the application
echo   dev                 Start in development mode ^(alias for 'start dev'^)
echo   help                Show this help message
echo.
echo Examples:
echo   %~nx0 start            # Start in production mode
echo   %~nx0 start dev        # Start in development mode
echo   %~nx0 dev              # Start in development mode
echo   %~nx0 restart prod     # Restart in production mode
echo   %~nx0 logs 100         # Show last 100 log lines
echo   %~nx0 follow           # Follow logs in real-time
goto :eof

:main
set command=%~1
if "%command%"=="" set command=help

if /i "%command%"=="start" (
    call :start_app "%~2"
) else if /i "%command%"=="stop" (
    call :stop_app
) else if /i "%command%"=="restart" (
    call :restart_app "%~2"
) else if /i "%command%"=="status" (
    call :get_status
) else if /i "%command%"=="logs" (
    call :show_logs "%~2"
) else if /i "%command%"=="follow" (
    call :follow_logs
) else if /i "%command%"=="build" (
    call :build_app
) else if /i "%command%"=="dev" (
    call :start_app "development"
) else if /i "%command%"=="help" (
    call :show_help
) else if /i "%command%"=="--help" (
    call :show_help
) else if /i "%command%"=="-h" (
    call :show_help
) else (
    call :print_error "Unknown command: %command%"
    echo.
    call :show_help
    exit /b 1
)
