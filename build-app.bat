@echo off
setlocal
title Build – Standalone APP (.exe)
echo.
echo ============================================================
echo  WebSphere Admin Dashboard – Build Standalone Windows App
echo  Using PyInstaller to create a single-file executable
echo  Output: dist\was-dashboard.exe
echo ============================================================
echo.

set ROOT=%~dp0

:: ─── Check tools ──────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 ( echo [ERROR] Python not found. & exit /b 1 )

node --version >nul 2>&1
if errorlevel 1 ( echo [ERROR] Node.js not found. & exit /b 1 )

:: ─── 1. Build React frontend ──────────────────────────────────
echo [1/3] Building React frontend...
cd /d "%ROOT%frontend"
call npm install --loglevel=error
if errorlevel 1 ( echo [ERROR] npm install failed. & exit /b 1 )
call npm run build
if errorlevel 1 ( echo [ERROR] npm build failed. & exit /b 1 )
echo [OK] React built → frontend\dist\

:: ─── 2. Install PyInstaller ───────────────────────────────────
echo.
echo [2/3] Installing PyInstaller in backend venv...
if not exist "%ROOT%backend\venv" (
    python -m venv "%ROOT%backend\venv"
)
call "%ROOT%backend\venv\Scripts\activate.bat"
pip install pyinstaller --quiet
pip install -r "%ROOT%backend\requirements.txt" --only-binary :all: --quiet
call deactivate

:: ─── 3. Run PyInstaller ───────────────────────────────────────
echo.
echo [3/3] Bundling with PyInstaller...
cd /d "%ROOT%"
call "%ROOT%backend\venv\Scripts\pyinstaller.exe" was-dashboard.spec --noconfirm
if errorlevel 1 ( echo [ERROR] PyInstaller failed. & exit /b 1 )

echo.
echo ============================================================
echo  SUCCESS!
echo  Executable: dist\was-dashboard\was-dashboard.exe
echo.
echo  To run:
echo    1. Copy the entire  dist\was-dashboard\  folder
echo    2. Edit  config\environment.yml  inside that folder
echo    3. Set env vars for passwords, then run was-dashboard.exe
echo ============================================================
echo.
pause
