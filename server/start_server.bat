@echo off
echo ========================================
echo Starting IMES Backend Server
echo ========================================
echo.

REM Prefer the root .venv if present (recommended).
if exist "..\\.venv\\Scripts\\python.exe" (
  "..\\.venv\\Scripts\\python.exe" app.py
) else (
  echo Missing root .venv. Run ..\\scripts\\setup.bat first.
  python app.py
)

pause
