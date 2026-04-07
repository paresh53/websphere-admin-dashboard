@echo off
setlocal EnableExtensions EnableDelayedExpansion

title Package WAS Dashboard Service Bundle

set ROOT=%~dp0
set DIST_DIR=%ROOT%dist\was-dashboard
set OUT_DIR=%ROOT%release
set OUT_ZIP=%OUT_DIR%\was-dashboard-windows.zip

echo.
echo ============================================================
echo   Package Service Bundle (Portable)
echo ============================================================
echo.

if not exist "%DIST_DIR%\was-dashboard.exe" (
    echo [ERROR] %DIST_DIR%\was-dashboard.exe not found.
    echo         Build the EXE first with: build-app.bat
    exit /b 1
)

if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"
if exist "%OUT_ZIP%" del /f /q "%OUT_ZIP%"

echo [1/2] Creating zip: %OUT_ZIP%
powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path '%DIST_DIR%\*' -DestinationPath '%OUT_ZIP%' -Force"
if errorlevel 1 (
    echo [ERROR] Failed to create zip.
    exit /b 1
)

echo [2/2] Done.
echo.
echo [OK] Bundle ready: %OUT_ZIP%
echo      Upload this zip to GitHub Releases or internal artifact storage.
echo.
exit /b 0
