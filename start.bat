@echo off
setlocal EnableDelayedExpansion
title WebSphere Admin Dashboard

echo.
echo ============================================================
echo   WebSphere Admin Dashboard – Starting...
echo ============================================================
echo.

set ROOT=%~dp0

:: Load .env if present
if exist "%ROOT%backend\.env" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%ROOT%backend\.env") do (
        set line=%%A
        if not "!line:~0,1!"=="#" if not "%%A"=="" (
            set %%A=%%B
        )
    )
    echo [OK] Loaded backend\.env
)

:: Start backend
echo [1/2] Starting FastAPI backend on port 8000...
start "WAS Dashboard – Backend" /min cmd /c ^
    "cd /d %ROOT%backend && call venv\Scripts\activate.bat && python main.py"

:: Give backend a moment to start
timeout /t 3 /nobreak >nul

:: Open browser
echo [2/2] Opening dashboard in browser...
start "" "http://localhost:8000"

echo.
echo  Dashboard is running at http://localhost:8000
echo  Press Ctrl+C in the backend window to stop.
echo.
pause
