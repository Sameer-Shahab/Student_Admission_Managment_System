@echo off
echo ========================================
echo NED-SAMS (Flask)
echo Starting Backend Server
echo ========================================
echo.

REM Start Backend Server (Flask templates)
echo Starting Backend Server (Flask templates)...
start "NED-SAMS Backend" cmd /k "cd /d \"%~dp0\" && .venv\\Scripts\\python.exe server\\app.py"

echo.
echo ========================================
echo Backend is starting...
echo Open: http://localhost:5000/login
echo ========================================
echo.
echo Press any key to exit (server will continue running)...
pause > nul
