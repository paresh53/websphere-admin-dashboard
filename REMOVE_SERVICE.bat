@echo off
REM Remove WebSphere Admin Dashboard from Windows services
REM Run as Administrator

echo.
echo ========================================
echo WAS Dashboard - Service Remover
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

REM Check if service exists
sc query WAS-Dashboard >nul 2>&1
if errorlevel 1 (
    echo Service "WAS-Dashboard" not found
    exit /b 0
)

REM Try to stop the service first
echo Stopping service...
net stop WAS-Dashboard >nul 2>&1

REM Remove the service
echo Removing service...
sc delete WAS-Dashboard
if errorlevel 1 (
    echo ERROR: Failed to delete service
    exit /b 1
)

echo.
echo Service "WAS-Dashboard" removed successfully
echo.
