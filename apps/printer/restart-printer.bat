@echo off
REM ========================================
REM  LEGACY FILE - USE start-printer-client.bat INSTEAD
REM ========================================

echo.
echo ⚠️  NOTICE: This file is deprecated
echo.
echo For cloud deployment, use: start-printer-client.bat
echo.
echo Do you want to:
echo   1. Run the new start-printer-client.bat
echo   2. Continue with old method (not recommended)
echo   3. Exit
echo.
choice /C 123 /M "Select option"

if errorlevel 3 exit /b 0
if errorlevel 2 goto OLD_METHOD
if errorlevel 1 goto NEW_METHOD

:NEW_METHOD
echo.
echo Launching new printer client...
call start-printer-client.bat
exit /b 0

:OLD_METHOD
echo.
echo Stopping all Node.js printer services...

REM Kill all node processes (this will stop the printer service)
taskkill /F /IM node.exe >nul 2>&1

echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo Starting printer service...
cd /d "%~dp0"
start "Brother Printer Service" cmd /k "node src/index.js"

echo Printer service started!
echo You can close this window.
pause
