@echo off
setlocal
echo.
echo ============================================================
echo  WebSphere Admin Dashboard – Run from JAR (Java required)
echo ============================================================
echo.

set ROOT=%~dp0
set JAR=%ROOT%java\target\was-dashboard.jar
set CONFIG=%ROOT%config\environment.yml

if not exist "%JAR%" (
    echo [ERROR] JAR not found. Run build-jar.bat first.
    pause & exit /b 1
)

:: Load .env for passwords
if exist "%ROOT%backend\.env" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%ROOT%backend\.env") do (
        set line=%%A
        if not "!line:~0,1!"=="#" if not "%%A"=="" set %%A=%%B
    )
)

echo Starting dashboard on http://localhost:8000 ...
echo Config: %CONFIG%
echo.
java -Dwas.dashboard.config="%CONFIG%" -jar "%JAR%"
pause
