@echo off
REM ========================================
REM  CREATE DISTRIBUTION PACKAGE
REM ========================================
REM This script creates a ZIP file for distribution to end users
REM Only includes necessary files (no node_modules)

echo.
echo ========================================
echo  CREATING PRINTER CLIENT PACKAGE
echo ========================================
echo.

REM Check if PowerShell is available
powershell -Command "Write-Host 'PowerShell available'" >nul 2>&1
if errorlevel 1 (
    echo ERROR: PowerShell is required for creating ZIP files
    pause
    exit /b 1
)

REM Create package name with timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ("%TIME%") do (set mytime=%%a%%b)
set PACKAGE_NAME=DMS-Printer-Client_%mydate%_%mytime%.zip

echo Creating package: %PACKAGE_NAME%
echo.

REM Files to include
echo Including files:
echo - Configuration files (.env.example, config.js)
echo - Batch files (install.bat, start-printer-client.bat)
echo - Source code (src/)
echo - Documentation (README.md, QUICK_SETUP_GUIDE.md)
echo - Package definition (package.json)
echo.

REM Create ZIP using PowerShell
powershell -Command "$files = @('.env.example', 'config.js', 'install.bat', 'start-printer-client.bat', 'package.json', 'README.md', 'QUICK_SETUP_GUIDE.md'); $srcFolder = 'src'; if (Test-Path '%PACKAGE_NAME%') { Remove-Item '%PACKAGE_NAME%' }; $compress = @{ Path = $files + $srcFolder; DestinationPath = '%PACKAGE_NAME%'; CompressionLevel = 'Optimal' }; Compress-Archive @compress; Write-Host 'Package created successfully!'"

if errorlevel 1 (
    echo.
    echo ERROR: Failed to create package
    pause
    exit /b 1
)

echo.
echo ========================================
echo  PACKAGE CREATED SUCCESSFULLY!
echo ========================================
echo.
echo Package: %PACKAGE_NAME%
echo Location: %CD%
echo.
echo DISTRIBUTION INSTRUCTIONS:
echo 1. Copy this ZIP file to each PC with a printer
echo 2. Extract the ZIP file
echo 3. Follow instructions in QUICK_SETUP_GUIDE.md
echo.
echo NOTE: End users will need to run install.bat
echo       to download dependencies on their PCs.
echo ========================================
echo.

pause
