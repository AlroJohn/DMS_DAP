@echo off
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
