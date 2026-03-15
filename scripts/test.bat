@echo off
setlocal

cd /d "%~dp0\.."

if not exist ".venv\Scripts\python.exe" (
  echo Missing .venv. Run scripts\setup.bat first.
  pause
  exit /b 1
)

echo Installing dev dependencies (pytest)...
".venv\Scripts\python.exe" -m pip install -r requirements-dev.txt

echo.
echo Running tests...
".venv\Scripts\python.exe" -m pytest

