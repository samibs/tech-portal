@echo off
echo.
echo ================================================
echo         Tech Portal Windows Setup Script
echo ================================================
echo.
echo This script will help you set up Tech Portal on your Windows system.
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1,2,3 delims=." %%a in ('node -v') do (
    set NODE_MAJOR=%%a
    set NODE_MINOR=%%b
    set NODE_PATCH=%%c
)

set NODE_MAJOR=%NODE_MAJOR:~1%

if %NODE_MAJOR% LSS 18 (
    echo WARNING: Node.js version is %NODE_MAJOR%.%NODE_MINOR%.%NODE_PATCH%, but v18+ is recommended.
    echo You may experience issues with older Node.js versions.
    echo.
    timeout /t 3
) else (
    echo Node.js v%NODE_MAJOR%.%NODE_MINOR%.%NODE_PATCH% detected.
)

REM Install dependencies
echo.
echo Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)
echo Dependencies installed successfully.
echo.

REM Run setup script
echo Running setup script...
call node setup.js
if %ERRORLEVEL% neq 0 (
    echo ERROR: Setup script failed.
    pause
    exit /b 1
)

echo.
echo ================================================
echo  Setup complete! You can now start Tech Portal.
echo ================================================
echo.
pause