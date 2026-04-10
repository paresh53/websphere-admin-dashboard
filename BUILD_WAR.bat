@echo off
REM Build WebSphere Admin Dashboard as deployable WAR file
REM Deploy to WebSphere, Tomcat, or any container that accepts WAR files
REM No external dependencies required at deployment time
REM Usage: BUILD_WAR.bat

setlocal enabledelayedexpansion

echo.
echo ========================================  
echo WebSphere Admin Dashboard - WAR Builder
echo ========================================
echo.

REM Check for Maven
mvn --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Maven is not installed or not in PATH
    echo Please install Maven from https://maven.apache.org/
    exit /b 1
)

REM Check for Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

echo Step 1: Building React frontend...
cd frontend
if not exist node_modules (
    call npm install
)
call npm run build
if errorlevel 1 (
    echo ERROR: React build failed
    exit /b 1
)
cd ..

echo.
echo Step 2: Building WAR with Maven...
cd java

REM Build WAR file with all dependencies included
call mvn clean package -Pwar -DpackagingType=war

if errorlevel 1 (
    echo ERROR: Maven build failed
    exit /b 1
)

cd ..

echo.
echo ========================================
echo SUCCESS! WAR file created at:
echo   java/target/was-dashboard.war
echo.
echo Deployment Options:
echo.
echo Option 1 - WebSphere Application Server:
echo   1. Open WebSphere Admin Console
echo   2. Go to Applications ^> Application Modules
echo   3. Click "Install New Application"
echo   4. Select java/target/was-dashboard.war
echo   5. Click "Next" through all steps
echo   6. Save configuration
echo.
echo Option 2 - Apache Tomcat:
echo   1. Copy java/target/was-dashboard.war to TOMCAT_HOME\webapps\
echo   2. Restart Tomcat: catalina.bat restart
echo   3. Access http://localhost:8080/was-dashboard
echo.
echo Option 3 - Any Java Container:
echo   Place was-dashboard.war in the application deployment folder
echo   The WAR includes all dependencies and static files
echo.
echo ========================================
