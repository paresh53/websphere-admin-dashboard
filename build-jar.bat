@echo off
setlocal
title Build – JAR
echo.
echo ============================================================
echo  WebSphere Admin Dashboard – Build Runnable JAR
echo  Output: java\target\was-dashboard.jar
echo ============================================================
echo.

set ROOT=%~dp0

:: ─── 1. Build React frontend ──────────────────────────────────
echo [1/2] Building React frontend...
cd /d "%ROOT%frontend"
call npm install --loglevel=error
if errorlevel 1 ( echo [ERROR] npm install failed. & exit /b 1 )
call npm run build
if errorlevel 1 ( echo [ERROR] npm build failed. & exit /b 1 )
echo [OK] React built → frontend\dist\

:: ─── 2. Build Spring Boot fat JAR ────────────────────────────
echo.
echo [2/2] Building Spring Boot JAR (mvn package -P jar)...
cd /d "%ROOT%java"
call mvn clean package -P jar -DskipTests --no-transfer-progress
if errorlevel 1 ( echo [ERROR] Maven build failed. & exit /b 1 )

echo.
echo ============================================================
echo  SUCCESS!
echo  Runnable JAR: java\target\was-dashboard.jar
echo.
echo  Usage:
echo    java -jar java\target\was-dashboard.jar
echo.
echo  Custom config path:
echo    java -Dwas.dashboard.config=C:\path\to\environment.yml ^
echo         -jar java\target\was-dashboard.jar
echo ============================================================
echo.
pause
