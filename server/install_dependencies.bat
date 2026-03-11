@echo off
setlocal
echo ============================================
echo Installing Backend Dependencies
echo ============================================
echo.

cd /d "%~dp0"
python -m pip install -r requirements.txt

echo.
echo ============================================
echo Installation Complete!
echo ============================================
echo.
echo IMPORTANT: Make sure Tesseract OCR is installed!
echo Download from: https://github.com/UB-Mannheim/tesseract/wiki
echo.
pause
