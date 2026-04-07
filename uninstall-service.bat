@echo off
setlocal EnableExtensions EnableDelayedExpansion

title Uninstall WAS Dashboard Windows Service

set SERVICE_NAME=WASDashboard
set INSTALL_DIR=%ProgramData%\WASDashboard
set WINSW_EXE=%INSTALL_DIR%\WASDashboardService.exe

echo.
echo ============================================================
echo   Uninstall WAS Dashboard Service
echo ============================================================
echo.

net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Run this script as Administrator.
    exit /b 1
)

if exist "%WINSW_EXE%" (
    "%WINSW_EXE%" stop >nul 2>&1
    "%WINSW_EXE%" uninstall >nul 2>&1
)

sc stop "%SERVICE_NAME%" >nul 2>&1
sc delete "%SERVICE_NAME%" >nul 2>&1

echo [INFO] Service removed. App files are still at:
echo        %INSTALL_DIR%
echo [INFO] Delete the folder manually if you want full cleanup.
echo.
exit /b 0
