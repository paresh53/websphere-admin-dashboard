@echo off
REM Windows Service installer for WebSphere Admin Dashboard
REM Installs as "WAS-Dashboard" service that starts on boot
REM Run as Administrator
REM Usage: INSTALL_SERVICE.bat [path-to-exe]

setlocal enabledelayedexpansion

echo.
echo ========================================
echo WAS Dashboard - Windows Service Installer
echo ========================================
echo.

REM Check for admin privileges
net session >nul 2>&1
if errorlevel 1 (
    echo ERROR: This script must be run as Administrator
    echo.
    echo Right-click on Command Prompt and select "Run as administrator"
    exit /b 1
)

REM Get EXE path
set EXE_PATH=%1
if not defined EXE_PATH (
    set EXE_PATH=%cd%\backend\dist\was-dashboard.exe
)

if not exist "%EXE_PATH%" (
    echo ERROR: Cannot find EXE at: %EXE_PATH%
    echo.
    echo Usage: INSTALL_SERVICE.bat [full-path-to-was-dashboard.exe]
    echo.
    echo Example:
    echo   INSTALL_SERVICE.bat "C:\Program Files\WAS-Dashboard\was-dashboard.exe"
    exit /b 1
)

echo Found EXE: %EXE_PATH%
echo.

REM Check if service already exists
sc query WAS-Dashboard >nul 2>&1
if errorlevel 1 (
    echo Installing service...
    
    REM Create NSSM wrapper (install NSSM first or use built-in SC)
    REM Alternative: Use native SC (Windows built-in)
    
    echo Creating Windows service "WAS-Dashboard"...
    sc create WAS-Dashboard ^
        binPath= "%EXE_PATH%" ^
        DisplayName= "WebSphere Admin Dashboard" ^
        start= auto
    
    if errorlevel 1 (
        echo ERROR: Failed to create service
        exit /b 1
    )
    
    echo Service created successfully!
) else (
    echo Service "WAS-Dashboard" already exists
    echo.
    echo To update: First run REMOVE_SERVICE.bat then INSTALL_SERVICE.bat
)

echo.
echo To start the service:
echo   net start WAS-Dashboard
echo.
echo To stop the service:
echo   net stop WAS-Dashboard
echo.
echo To remove the service:
echo   REMOVE_SERVICE.bat
echo.
echo Or use Services app:
echo   services.msc
echo.
echo ========================================
