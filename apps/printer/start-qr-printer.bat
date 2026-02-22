@echo off
REM ========================================
REM  LEGACY FILE - USE start-printer-client.bat INSTEAD
REM ========================================

echo.
echo ⚠️  NOTICE: This file is deprecated
echo.
echo For cloud deployment with configuration management,
echo please use: start-printer-client.bat
echo.
echo Redirecting in 3 seconds...
timeout /t 3 >nul

call start-printer-client.bat
