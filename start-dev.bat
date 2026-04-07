@echo off
echo [INFO] Starting frontend in dev mode (Vite hot-reload)...
echo [INFO] Backend must already be running on port 8000.
echo.
cd /d "%~dp0frontend"
npm run dev
