@echo off
REM Build WebSphere Admin Dashboard as standalone Windows EXE
REM This includes all Python dependencies and React frontend bundled together
REM Usage: BUILD_EXE.bat

setlocal enabledelayedexpansion

echo.
echo ========================================
echo WebSphere Admin Dashboard - EXE Builder
echo ========================================
echo.

REM Check for Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.10+ from https://www.python.org/
    exit /b 1
)

REM Check for Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

echo Step 1: Installing Python dependencies...
cd backend
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
pip install PyInstaller==6.1.0
cd ..

echo.
echo Step 2: Building React frontend...
cd frontend
if not exist node_modules (
    call npm install
)
call npm run build
cd ..

echo.
echo Step 3: Creating standalone Python executable...
cd backend

REM Create spec file for PyInstaller
(
echo # -*- mode: python ; coding: utf-8 -*-
echo import sys
echo import os
echo from PyInstaller.utils.hooks import collect_submodules, collect_data_files
echo.
echo block_cipher = None
echo.
echo a = Analysis(
echo     ['main.py'],
echo     pathex=[],
echo     binaries=[],
echo     datas=[
echo         ('../config', 'config'),
echo         ('../frontend/dist', 'static'),
echo     ],
echo     hiddenimports=[
echo         'fastapi', 'uvicorn', 'pyyaml', 'paramiko', 'pywinrm',
echo         'starlette', 'pydantic', 'jinja2'
echo     ] + collect_submodules('fastapi') + collect_submodules('uvicorn'),
echo     hookspath=[],
echo     hooksconfig={},
echo     runtime_hooks=[],
echo     excludedimports=['pytest', 'setuptools'],
echo     win_no_prefer_redirects=False,
echo     win_private_assemblies=False,
echo     cipher=block_cipher,
echo     noarchive=False,
echo )
echo.
echo pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)
echo.
echo exe = EXE(
echo     pyz,
echo     a.scripts,
echo     a.binaries,
echo     a.zipfiles,
echo     a.datas,
echo     [],
echo     name='was-dashboard',
echo     debug=False,
echo     bootloader_ignore_signals=False,
echo     strip=False,
echo     upx=True,
echo     upx_exclude=[],
echo     runtime_tmpdir=None,
echo     console=True,
echo     distpath='dist',
echo     build_folder='build',
echo     target_arch=None,
echo     codesign_identity=None,
echo     entitlements_file=None,
echo     icon='..\\frontend\\public\\favicon.ico' if os.path.exists('..\\frontend\\public\\favicon.ico') else None,
echo )
) > was-dashboard.spec

echo Building with PyInstaller...
pyinstaller was-dashboard.spec --clean

if errorlevel 1 (
    echo ERROR: PyInstaller build failed
    exit /b 1
)

cd ..

echo.
echo ========================================
echo SUCCESS! Executable created at:
echo   backend\dist\was-dashboard.exe
echo.
echo To run:
echo   backend\dist\was-dashboard.exe
echo.
echo The server will start on http://localhost:8000
echo Open in your browser to see the dashboard
echo.
echo ========================================
