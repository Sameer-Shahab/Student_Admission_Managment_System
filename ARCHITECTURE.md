# Architecture

## Components
- Flask app (`server/app.py`)
  - Routes for login, admin dashboard, uploads, student detail
- Templates (`server/templates/`)
- Static assets (`server/static/`)
- SQLite (`server/database.db` by default)
- File storage (`server/student_documents/` by default)

## Data Flow (Upload)
1. Admin uploads required documents (domicile + marksheet) and optional docs
2. Files are scanned/processed and saved into a student folder under `UPLOAD_FOLDER`
3. Metadata is stored in SQLite (`students`, `student_documents`)
4. Admin dashboard and student detail pages read from DB (with fallback to legacy folder scan)

## Configuration (Environment Variables)
- `DATABASE` (default: `server/database.db`)
- `UPLOAD_FOLDER` (default: `server/student_documents`)
- `SECRET_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

