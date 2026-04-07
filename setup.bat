@echo off
setlocal EnableDelayedExpansion
title WebSphere Admin Dashboard – Setup

echo.
echo ============================================================
echo   WebSphere Admin Dashboard – One-time Setup
echo ============================================================
echo.

:: ─── Check Python ─────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 3.8+ is required but was not found in PATH.
    echo         Download from https://www.python.org/downloads/
    pause & exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo [OK] Python %PYVER% found.

:: ─── Check Node.js ────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js 18+ is required but was not found in PATH.
    echo         Download from https://nodejs.org/
    pause & exit /b 1
)
for /f "tokens=1" %%v in ('node --version') do set NODEVER=%%v
echo [OK] Node.js %NODEVER% found.

:: ─── Backend venv + packages ──────────────────────────────────
echo.
echo [1/4] Setting up Python virtual environment...
cd /d "%~dp0backend"
if not exist venv (
    python -m venv venv
    if errorlevel 1 ( echo [ERROR] Failed to create venv. & pause & exit /b 1 )
)
call venv\Scripts\activate.bat
python -m pip install --upgrade pip -q
pip install -r requirements.txt -q
if errorlevel 1 ( echo [ERROR] pip install failed. & pause & exit /b 1 )
call venv\Scripts\deactivate.bat
echo [OK] Python dependencies installed.

:: ─── .env file ────────────────────────────────────────────────
if not exist .env (
    copy .env.example .env >nul
    echo [INFO] Created backend\.env from template – PLEASE EDIT IT with real passwords.
) else (
    echo [OK] backend\.env already exists.
)
cd /d "%~dp0"

:: ─── Frontend npm install + build ─────────────────────────────
echo.
echo [2/4] Installing frontend dependencies (npm install)...
cd /d "%~dp0frontend"
npm install --loglevel=error
if errorlevel 1 ( echo [ERROR] npm install failed. & pause & exit /b 1 )
echo [OK] npm packages installed.

echo.
echo [3/4] Building frontend (npm run build)...
npm run build
if errorlevel 1 ( echo [ERROR] npm build failed. & pause & exit /b 1 )
echo [OK] Frontend built → frontend\dist\
cd /d "%~dp0"

echo.
echo [4/4] Setup complete!
echo.
echo ============================================================
echo   Next steps:
echo   1. Edit  config\environment.yml  with your server details
echo   2. Edit  backend\.env            with real passwords
echo   3. Run   start.bat               to launch the dashboard
echo ============================================================
echo.
pause
