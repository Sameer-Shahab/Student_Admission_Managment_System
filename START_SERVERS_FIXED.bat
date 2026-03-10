@echo off
echo ========================================
echo IMES Document Management System
echo Starting Both Servers
echo ========================================
echo.

REM Start Backend Server
echo Starting Backend Server...
start "IMES Backend" cmd /k "cd server && venv\Scripts\activate.bat && python app.py"

REM Wait a bit for backend to initialize
timeout /t 3 /nobreak > nul

REM Start Frontend Server
echo Starting Frontend Server...
start "IMES Frontend" cmd /k "cd client && npm run dev"

echo.
echo ========================================
echo Both servers are starting!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo ========================================
echo.
echo Press any key to exit (servers will continue running)...
pause > nul
