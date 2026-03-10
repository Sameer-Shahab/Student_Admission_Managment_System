@echo off
echo ========================================
echo Starting IMES Backend Server
echo ========================================
echo.

REM Activate virtual environment and run server
call venv\Scripts\activate.bat
python app.py

pause
