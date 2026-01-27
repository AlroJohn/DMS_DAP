@echo off
echo ========================================
echo  QR CODE PRINTER SERVICE STARTER
echo ========================================
echo.

cd /d "%~dp0"

echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call pnpm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo Starting QR Code Printer Service...
echo Connect to: http://localhost:3001
echo.
echo Press Ctrl+C to stop
echo ========================================
echo.

node src\index.js

pause
