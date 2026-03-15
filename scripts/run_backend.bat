@echo off
setlocal

cd /d "%~dp0\.."

if not exist ".venv\Scripts\python.exe" (
  echo Missing .venv. Run scripts\setup.bat first.
  pause
  exit /b 1
)

echo Starting backend (Flask)...
".venv\Scripts\python.exe" server\app.py

