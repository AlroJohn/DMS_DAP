@echo off
REM ========================================
REM  TEST PRINTER CLIENT CONNECTION
REM ========================================
REM This script helps test your printer client configuration

title DMS Printer Client - Configuration Test

echo.
echo ========================================
echo  PRINTER CLIENT CONFIGURATION TEST
echo ========================================
echo.

REM Check Node.js
echo [1/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ FAILED: Node.js is not installed
    echo    Download from: https://nodejs.org/
    goto END
) else (
    node --version
    echo ✅ PASSED: Node.js is installed
)
echo.

REM Check dependencies
echo [2/5] Checking dependencies...
if not exist "node_modules" (
    echo ❌ FAILED: Dependencies not installed
    echo    Run install.bat first
    goto END
) else (
    echo ✅ PASSED: Dependencies installed
)
echo.

REM Check .env file
echo [3/5] Checking configuration file...
if not exist ".env" (
    echo ⚠️  WARNING: .env file not found
    echo    Creating from .env.example...
    copy .env.example .env >nul
    echo    Please edit .env and run this test again
    notepad .env
    goto END
) else (
    echo ✅ PASSED: .env file exists
)
echo.

REM Parse and display config
echo [4/5] Reading configuration...
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="BACKEND_URL" (
        set BACKEND_URL=%%b
        echo    Backend URL: %%b
    )
    if "%%a"=="PRINTER_FILTER" (
        set PRINTER_FILTER=%%b
        echo    Printer Filter: %%b
    )
    if "%%a"=="DEBUG" (
        set DEBUG=%%b
        echo    Debug Mode: %%b
    )
)
echo.

REM Check if localhost
echo %BACKEND_URL% | findstr /i "localhost 127.0.0.1" >nul
if not errorlevel 1 (
    echo ⚠️  WARNING: BACKEND_URL is set to localhost
    echo    For cloud deployment, change to your AWS URL
    echo.
)

REM Check printer
echo [5/5] Checking for Brother printers...
powershell -Command "Get-Printer | Where-Object {$_.Name -like '*Brother*' -or $_.Name -like '*PT-P*'} | Select-Object -ExpandProperty Name" > temp_printers.txt
set /p FOUND_PRINTER=<temp_printers.txt
if "%FOUND_PRINTER%"=="" (
    echo ⚠️  WARNING: No Brother printer detected
    echo.
    echo Available printers:
    powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"
    echo.
    echo Make sure:
    echo - Printer is connected via USB
    echo - Printer is powered on
    echo - Printer driver is installed
) else (
    echo ✅ PASSED: Brother printer found: %FOUND_PRINTER%
)
del temp_printers.txt >nul 2>&1
echo.

echo ========================================
echo  TEST COMPLETE
echo ========================================
echo.
echo Summary:
echo - Node.js: ✅
echo - Dependencies: Check above
echo - Configuration: Check above
echo - Printer: Check above
echo.
echo Next steps:
echo 1. Fix any warnings or errors above
echo 2. Run start-printer-client.bat to start service
echo 3. Test print from DMS web application
echo.

:END
pause
