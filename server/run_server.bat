@echo off
echo Starting IMES Backend Server...
if exist "..\\.venv\\Scripts\\python.exe" (
  "..\\.venv\\Scripts\\python.exe" app.py
) else (
  python app.py
)
pause
