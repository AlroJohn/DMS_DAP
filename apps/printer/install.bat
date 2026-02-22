@echo off
REM ========================================
REM  DMS PRINTER CLIENT - INSTALLATION
REM ========================================
REM This script installs the printer client and its dependencies
REM Run this ONCE on each PC with a USB printer

echo.
echo ========================================
echo  DMS PRINTER CLIENT - INSTALLATION
echo ========================================
echo.

REM Check if Node.js is installed
echo [Step 1/4] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Download the LTS version and run the installer.
    echo.
    pause
    exit /b 1
)

node --version
echo ✓ Node.js is installed
echo.

REM Check npm
echo [Step 2/4] Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not available
    pause
    exit /b 1
)

npm --version
echo ✓ npm is available
echo.

REM Install dependencies
echo [Step 3/4] Installing printer client dependencies...
echo This may take a few minutes...
echo.

npm install
if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies
    echo Please check your internet connection and try again.
    echo.
    pause
    exit /b 1
)

echo.
echo ✓ Dependencies installed successfully
echo.

REM Create .env file if it doesn't exist
echo [Step 4/4] Setting up configuration...
if not exist ".env" (
    echo Creating .env configuration file...
    copy .env.example .env
    echo ✓ Configuration file created
    echo.
    echo IMPORTANT: Please edit .env file and set your AWS backend URL!
    echo Open .env in Notepad and change BACKEND_URL to your cloud URL.
    echo.
) else (
    echo ✓ Configuration file already exists
    echo.
)

echo.
echo ========================================
echo  INSTALLATION COMPLETE!
echo ========================================
echo.
echo IMPORTANT - CLOUD DEPLOYMENT:
echo 1. Open the .env file in this folder
echo 2. Change BACKEND_URL from localhost to your AWS backend URL
echo    Example: BACKEND_URL=https://your-app-domain.com
echo 3. Save the file
echo 4. Run "start-printer-client.bat" to start the printer service
echo.
echo PRINTER SETUP:
echo - Make sure your Brother printer is connected via USB
echo - Make sure printer drivers are installed
echo - Make sure printer is powered on
echo.
echo Once configured, run start-printer-client.bat to start printing!
echo ========================================
echo.
pause
