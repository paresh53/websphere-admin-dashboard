@echo off
setlocal
title Build – WAR
echo.
echo ============================================================
echo  WebSphere Admin Dashboard – Build WAR for WebSphere/Tomcat
echo  Output: java\target\was-dashboard.war
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

:: ─── 2. Build WAR ─────────────────────────────────────────────
echo.
echo [2/2] Building WAR (mvn package -P war)...
cd /d "%ROOT%java"
call mvn clean package -P war -DskipTests --no-transfer-progress
if errorlevel 1 ( echo [ERROR] Maven build failed. & exit /b 1 )

echo.
echo ============================================================
echo  SUCCESS!
echo  WAR file: java\target\was-dashboard.war
echo.
echo  Deploy to WebSphere:
echo    1. Open WebSphere Admin Console
echo    2. Applications > New Application > New Enterprise Application
echo    3. Upload was-dashboard.war
echo    4. Set context root to  /  (or custom path)
echo    5. Set JVM property:
echo         -Dwas.dashboard.config=/path/to/config/environment.yml
echo.
echo  Deploy to Tomcat:
echo    1. Copy was-dashboard.war to TOMCAT_HOME\webapps\ROOT.war
echo    2. Set JVM property in catalina.bat:
echo         JAVA_OPTS=-Dwas.dashboard.config=C:\path\to\environment.yml
echo ============================================================
echo.
pause
