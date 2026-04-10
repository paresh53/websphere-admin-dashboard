#!/bin/bash
# Build WebSphere Admin Dashboard as deployable WAR file
# Deploy to WebSphere, Tomcat, or any container that accepts WAR files
# No external dependencies required at deployment time
# Usage: bash BUILD_WAR.sh

set -e

echo ""
echo "========================================"
echo "WebSphere Admin Dashboard - WAR Builder"
echo "========================================"
echo ""

# Check for Maven
if ! command -v mvn &> /dev/null; then
    echo "ERROR: Maven is not installed"
    echo "Please install Maven from https://maven.apache.org/"
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Step 1: Building React frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build
cd ..

echo ""
echo "Step 2: Building WAR with Maven..."
cd java

# Build WAR file with all dependencies included
mvn clean package -Pwar

if [ $? -ne 0 ]; then
    echo "ERROR: Maven build failed"
    exit 1
fi

cd ..

echo ""
echo "========================================"
echo "SUCCESS! WAR file created at:"
echo "  java/target/was-dashboard.war"
echo ""
echo "Deployment Options:"
echo ""
echo "Option 1 - WebSphere Application Server:"
echo "  1. Open WebSphere Admin Console"
echo "  2. Go to Applications > Application Modules"
echo "  3. Click \"Install New Application\""
echo "  4. Select java/target/was-dashboard.war"
echo "  5. Click \"Next\" through all steps"
echo "  6. Save configuration"
echo ""
echo "Option 2 - Apache Tomcat:"
echo "  1. Copy java/target/was-dashboard.war to \$TOMCAT_HOME/webapps/"
echo "  2. Restart Tomcat: catalina.sh restart"
echo "  3. Access http://localhost:8080/was-dashboard"
echo ""
echo "Option 3 - Any Java Container:"
echo "  Place was-dashboard.war in the application deployment folder"
echo "  The WAR includes all dependencies and static files"
echo ""
echo "========================================"
