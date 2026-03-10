@echo off
echo ============================================
echo Installing Backend Dependencies
echo ============================================
echo.

pip install flask==3.1.2
pip install flask-cors==5.0.0
pip install opencv-python==4.13.0.92
pip install PyPDF2==3.0.1
pip install Pillow==12.1.1
pip install pytesseract==0.3.13
pip install reportlab==4.4.10
pip install openpyxl==3.1.5
pip install python-dotenv==1.0.1

echo.
echo ============================================
echo Installation Complete!
echo ============================================
echo.
echo IMPORTANT: Make sure Tesseract OCR is installed!
echo Download from: https://github.com/UB-Mannheim/tesseract/wiki
echo.
pause
