# NED-SAMS (Student Admission Management System)

Flask app (server-rendered templates) for managing student document uploads and an admin dashboard.

**Main URLs**
- `http://localhost:5000/login` (login)
- `http://localhost:5000/admin` (dashboard)

## Project Structure (What Matters)
- `server/app.py`: Flask backend (routes, DB init, uploads)
- `server/templates/`: UI (Flask templates)
- `server/static/`: CSS, JS, images
- `tests/`: smoke tests + upload tests + DB migration tests
- `scripts/`: Windows helper scripts (setup, run, test)

Notes:
- Local data like `server/database.db` and uploaded PDFs are ignored by git by default.
- There is a `client/` Next.js app in this repo, but the official UI for this project is the Flask templates in `server/templates/`.

## Quick Start (Windows / VS Code)
1. Run setup (creates `.venv` and installs dependencies):
   - `scripts\\setup.bat`
2. Start the backend:
   - `scripts\\run_backend.bat`
3. Open:
   - `http://localhost:5000/login`

## Tests
- Install dev dependencies + run tests:
  - `scripts\\test.bat`

## Moving This Project To Another PC (VS Code)
1. Push your latest code to GitHub.
2. On the new PC:
   1. Install Python 3.12.x
   2. Install VS Code + Python extension
   3. Clone your repo
   4. Run `scripts\\setup.bat`
   5. Run `scripts\\run_backend.bat`
3. If you want to move your local data too (optional):
   - Copy `server\\database.db` and `server\\student_documents\\` from the old PC to the same paths on the new PC.

OCR note:
- If you use OCR features, install Tesseract for Windows:
  - `https://github.com/UB-Mannheim/tesseract/wiki`
