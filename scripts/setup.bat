@echo off
setlocal

cd /d "%~dp0\.."

echo ========================================
echo Setup (Windows)
echo ========================================
echo.

if exist ".venv\Scripts\python.exe" (
  echo Using existing virtual environment: .venv
) else (
  echo Creating virtual environment: .venv
  python -m venv .venv
)

echo.
echo Installing dependencies...
".venv\Scripts\python.exe" -m pip install -r requirements.txt

echo.
echo Optional (recommended for development): install dev dependencies
echo   ".venv\Scripts\python.exe" -m pip install -r requirements-dev.txt

echo.
echo IMPORTANT: OCR needs Tesseract installed (Windows):
echo   https://github.com/UB-Mannheim/tesseract/wiki
echo.
echo Done.
pause

