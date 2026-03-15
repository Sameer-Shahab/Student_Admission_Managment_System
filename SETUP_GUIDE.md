# Setup Guide (Flask Only)

## Requirements
- Windows 10/11
- Python 3.12.x
- VS Code + Python extension
- (Optional for OCR) Tesseract OCR:
  - https://github.com/UB-Mannheim/tesseract/wiki

## Install
1. Open the repo folder in VS Code.
2. Run:
   - `scripts\setup.bat`

This creates `.venv/` and installs `requirements.txt`.

## Run
- Start backend:
  - `scripts\run_backend.bat`
- Open:
  - `http://localhost:5000/login`

## Tests
- Run:
  - `scripts\test.bat`

## Data (Local Only)
- SQLite DB default: `server/database.db`
- Uploads default: `server/student_documents/`

Both are ignored by git by default.

