# Render (Demo-Only) Deployment

This deployment has **no persistent disk**. Uploads and the SQLite DB will reset after restarts/redeploys.

## Render Service Settings

- Service type: `Web Service`
- Root Directory: `server`
- Environment: `Python 3`
- Build Command: `bash ./render-build.sh`
- Start Command:
  - `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120`

## Environment Variables

- `UPLOAD_FOLDER` = `/tmp/student_documents`
- `DATABASE` = `/tmp/database.db`
- `SECRET_KEY` = generate a long random string
- `ADMIN_USERNAME` = `admin`
- `ADMIN_PASSWORD` = set your password

