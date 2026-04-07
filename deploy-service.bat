@echo off
setlocal EnableExtensions EnableDelayedExpansion

title Deploy WAS Dashboard Windows Service

:: Optional arg1: extracted app folder path or bundle URL
:: Examples:
::   deploy-service.bat "C:\Deploy\was-dashboard"
::   deploy-service.bat https://github.com/paresh53/websphere-admin-dashboard/releases/latest/download/was-dashboard-windows.zip

set SERVICE_NAME=WASDashboard
set INSTALL_DIR=%ProgramData%\WASDashboard
set TOOLS_DIR=%INSTALL_DIR%\tools
set APP_DIR=%INSTALL_DIR%\was-dashboard
set TMP_ZIP=%TEMP%\was-dashboard-windows.zip
set WINSW_EXE=%INSTALL_DIR%\WASDashboardService.exe
set WINSW_XML=%INSTALL_DIR%\WASDashboardService.xml

set DEFAULT_BUNDLE_URL=https://github.com/paresh53/websphere-admin-dashboard/releases/latest/download/was-dashboard-windows.zip
set SOURCE_ARG=%~1
set SOURCE_MODE=url
set SOURCE_DIR=
set BUNDLE_URL=%DEFAULT_BUNDLE_URL%
if not "%SOURCE_ARG%"=="" (
    if exist "%SOURCE_ARG%\" (
        set SOURCE_MODE=folder
        set SOURCE_DIR=%~f1
        set BUNDLE_URL=
    ) else (
        set BUNDLE_URL=%SOURCE_ARG%
    )
)
set WINSW_URL=https://github.com/winsw/winsw/releases/download/v3.0.0/WinSW-x64.exe

echo.
echo ============================================================
echo   Deploy WAS Dashboard as Windows Service
echo ============================================================
echo.
echo Service Name : %SERVICE_NAME%
echo Install Dir  : %INSTALL_DIR%
if /I "%SOURCE_MODE%"=="folder" (
    echo Source Type  : Local folder
    echo Source Path  : %SOURCE_DIR%
) else (
    echo Source Type  : Download URL
    echo Bundle URL   : %BUNDLE_URL%
)
echo.

net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Run this script as Administrator.
    exit /b 1
)

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%TOOLS_DIR%" mkdir "%TOOLS_DIR%"

echo [1/7] Stopping/removing old service if present...
if exist "%WINSW_EXE%" (
    "%WINSW_EXE%" stop >nul 2>&1
    "%WINSW_EXE%" uninstall >nul 2>&1
)
sc stop "%SERVICE_NAME%" >nul 2>&1
sc delete "%SERVICE_NAME%" >nul 2>&1

if exist "%APP_DIR%" rmdir /s /q "%APP_DIR%"
mkdir "%APP_DIR%"

echo [2/7] Preparing application files...
if /I "%SOURCE_MODE%"=="folder" (
    if not exist "%SOURCE_DIR%\was-dashboard.exe" (
        echo [ERROR] %SOURCE_DIR%\was-dashboard.exe not found.
        echo         Pass the extracted folder that contains was-dashboard.exe at its root.
        exit /b 1
    )

    robocopy "%SOURCE_DIR%" "%APP_DIR%" /E >nul
    if errorlevel 8 (
        echo [ERROR] Failed to copy application files from local folder.
        exit /b 1
    )
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%BUNDLE_URL%' -OutFile '%TMP_ZIP%'"
    if errorlevel 1 (
        echo [ERROR] Failed to download bundle from URL.
        exit /b 1
    )
)

echo [3/7] Expanding application bundle if needed...
if /I "%SOURCE_MODE%"=="folder" (
    echo         Local folder provided, skipping archive extraction.
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%TMP_ZIP%' -DestinationPath '%APP_DIR%' -Force"
    if errorlevel 1 (
        echo [ERROR] Failed to extract bundle.
        exit /b 1
    )
)

if exist "%TMP_ZIP%" del /f /q "%TMP_ZIP%"

echo [4/7] Downloading WinSW wrapper...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%WINSW_URL%' -OutFile '%WINSW_EXE%'"
if errorlevel 1 (
    echo [ERROR] Failed to download WinSW.
    exit /b 1
)

echo [5/7] Writing service configuration...
(
echo ^<service^>
echo   ^<id^>%SERVICE_NAME%^</id^>
echo   ^<name^>%SERVICE_NAME%^</name^>
echo   ^<description^>WebSphere Admin Dashboard^</description^>
echo   ^<executable^>%APP_DIR%\was-dashboard.exe^</executable^>
echo   ^<workingdirectory^>%APP_DIR%^</workingdirectory^>
echo   ^<startmode^>Automatic^</startmode^>
echo   ^<stoptimeout^>15sec^</stoptimeout^>
echo   ^<log mode="roll-by-size-time"^>
echo     ^<sizeThreshold^>10240^</sizeThreshold^>
echo     ^<pattern^>yyyyMMdd^</pattern^>
echo     ^<autoRollAtTime^>00:00:00^</autoRollAtTime^>
echo   ^</log^>
echo ^</service^>
) > "%WINSW_XML%"

if not exist "%APP_DIR%\was-dashboard.exe" (
    echo [ERROR] %APP_DIR%\was-dashboard.exe not found after extraction.
    echo         Ensure the zip contains was-dashboard.exe at root.
    exit /b 1
)

echo [6/7] Installing service...
"%WINSW_EXE%" install
if errorlevel 1 (
    echo [ERROR] Service install failed.
    exit /b 1
)

echo [7/7] Starting service...
"%WINSW_EXE%" start
if errorlevel 1 (
    echo [ERROR] Service start failed.
    exit /b 1
)

echo.
echo [OK] Service deployed and started.
echo     Open: http://localhost:8000
echo.
exit /b 0
