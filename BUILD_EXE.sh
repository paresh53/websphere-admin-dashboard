#!/bin/bash
# Build WebSphere Admin Dashboard as standalone executable (Linux/Mac)
# This includes all Python dependencies and React frontend bundled together
# Usage: bash BUILD_EXE.sh

set -e

echo ""
echo "========================================"
echo "WebSphere Admin Dashboard - EXE Builder"
echo "========================================"
echo ""

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.10+ from https://www.python.org/"
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Step 1: Installing Python dependencies..."
cd backend
pip3 install --upgrade pip setuptools wheel
pip3 install -r requirements.txt
pip3 install PyInstaller==6.1.0
cd ..

echo ""
echo "Step 2: Building React frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build
cd ..

echo ""
echo "Step 3: Creating standalone executable..."
cd backend

# Create spec file for PyInstaller
cat > was-dashboard.spec << 'EOF'
# -*- mode: python ; coding: utf-8 -*-
import sys
import os
from PyInstaller.utils.hooks import collect_submodules, collect_data_files

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('../config', 'config'),
        ('../frontend/dist', 'static'),
    ],
    hiddenimports=[
        'fastapi', 'uvicorn', 'pyyaml', 'paramiko', 'pywinrm',
        'starlette', 'pydantic', 'jinja2'
    ] + collect_submodules('fastapi') + collect_submodules('uvicorn'),
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludedimports=['pytest', 'setuptools'],
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='was-dashboard',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
)
EOF

echo "Building with PyInstaller..."
pyinstaller was-dashboard.spec --clean

if [ $? -ne 0 ]; then
    echo "ERROR: PyInstaller build failed"
    exit 1
fi

cd ..

echo ""
echo "========================================"
echo "SUCCESS! Executable created at:"
echo "  backend/dist/was-dashboard"
echo ""
echo "To run:"
echo "  ./backend/dist/was-dashboard"
echo ""
echo "The server will start on http://localhost:8000"
echo "Open in your browser to see the dashboard"
echo ""
echo "========================================"
