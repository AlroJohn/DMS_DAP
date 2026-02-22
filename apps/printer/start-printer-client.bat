@echo off
REM ========================================
REM  DMS PRINTER CLIENT - START SERVICE
REM ========================================

title DMS Printer Client

echo.
echo ========================================
echo  DMS PRINTER CLIENT
echo ========================================
echo.

REM Check if node_modules exists
if not exist node_modules (
    echo ERROR: Dependencies not installed!
    echo Please run install.bat first.
    echo.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo WARNING: Configuration file not found!
    if exist .env.example (
        echo Creating .env from example...
        copy .env.example .env
        echo.
    )
    echo IMPORTANT: Please edit .env file and set your AWS backend URL!
    echo Press any key to open the .env file in Notepad...
    pause >nul
    notepad .env
    echo.
    echo After saving your changes, run this script again.
    pause
    exit /b 0
)

echo Starting printer client service...
echo.
echo Keep this window open while printing.
echo Press Ctrl+C to stop the service.
echo.
echo ========================================
echo.

REM Start the printer client
node src\index.js

REM If the service stops, wait before closing
echo.
echo.
echo Printer service stopped.
pause
