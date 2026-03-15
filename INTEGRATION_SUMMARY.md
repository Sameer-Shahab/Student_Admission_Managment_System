# Integration Summary

This project is a single Flask app using server-rendered templates.

**Backend**
- Flask app: `server/app.py`
- Templates: `server/templates/`
- Static assets: `server/static/`
- Database: SQLite at `server/database.db` (default, env-overridable)
- Uploads: `server/student_documents/` (default, env-overridable)

**Important**
- Local data (database + uploads) is ignored by git by default.
- For OCR features, install Tesseract on the machine running the app.

