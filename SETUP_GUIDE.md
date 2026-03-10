# 🎓 IMES Document Management System - Complete Setup Guide

## Overview

This project consists of two parts:
1. **Backend** (Flask API) - in `IMES FOLDER/`
2. **Frontend** (Next.js) - in `client/`

---

## ⚙️ Backend Setup (Flask)

### 1. Navigate to Backend Folder

```bash
cd "IMES FOLDER"
```

### 2. Install Python Dependencies

**Important:** There's a numpy compatibility issue with the existing environment. You need to use the virtual environment already set up:

```bash
# Activate the virtual environment
venv\Scripts\activate

# OR install dependencies fresh (recommended)
pip install flask==3.1.2
pip install flask-cors==5.0.0
pip install numpy==1.26.4
pip install opencv-python==4.9.0.80
pip install PyPDF2==3.0.1
pip install Pillow==12.1.1
pip install pytesseract==0.3.13
pip install reportlab==4.4.10
pip install openpyxl==3.1.5
pip install python-dotenv==1.0.1
```

### 3. Install Tesseract OCR

**Windows:**
- Download from: https://github.com/UB-Mannheim/tesseract/wiki
- Install and add to PATH

**Mac:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr
```

### 4. Run the Backend Server

```bash
python app.py
```

The backend will start on **http://localhost:5000**

---

## 🎨 Frontend Setup (Next.js)

### 1. Navigate to Frontend Folder

```bash
cd client
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Verify Environment Configuration

The file `client/.env.local` should contain:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=University Document Management System
```

✅ This is already configured!

### 4. Run the Frontend

```bash
npm run dev
```

The frontend will start on **http://localhost:3000**

---

## 🚀 Quick Start (Both Servers)

### Terminal 1 - Backend
```bash
cd "IMES FOLDER"
venv\Scripts\activate
python app.py
```

### Terminal 2 - Frontend
```bash
cd client
npm run dev
```

---

## 🔑 Default Login Credentials

- **Username:** `admin`
- **Password:** `ned@admin123`

---

## 📋 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with credentials
- `GET /api/auth/me` - Get current user info

### Document Management
- `POST /api/upload` - Upload and process student document
- `GET /api/students` - List students (with search & pagination)
- `GET /api/students/<id>` - Get specific student
- `DELETE /api/students/<id>` - Delete student

### Export & Stats
- `GET /api/export/excel` - Export students to Excel
- `GET /api/stats` - Get dashboard statistics

---

## ✅ What Has Been Integrated

### Backend Changes:
1. ✅ Added Flask-CORS for cross-origin requests
2. ✅ Created complete REST API with authentication
3. ✅ Implemented JWT-like token authentication
4. ✅ Updated database schema with new `students` table
5. ✅ Added OCR text extraction from images
6. ✅ Added student information extraction using regex
7. ✅ Created Excel export functionality
8. ✅ Added statistics endpoint
9. ✅ Maintained backward compatibility with old upload route

### Frontend Changes:
1. ✅ Updated `.env.local` to point to port 5000 (Flask backend)
2. ✅ Frontend already has complete API client implementation
3. ✅ Authentication flow ready
4. ✅ Upload, students list, and search features ready

---

## 🎯 How to Use

1. **Start both servers** (backend on :5000, frontend on :3000)
2. **Open browser** to http://localhost:3000
3. **Login** with admin credentials
4. **Upload documents** via the upload page
5. **View students** in the students page
6. **Export to Excel** using the export button

---

## 🐛 Troubleshooting

### NumPy Compatibility Error
If you see `numpy.core.multiarray failed to import`:
```bash
pip uninstall numpy opencv-python
pip install numpy==1.26.4
pip install opencv-python==4.9.0.80
```

### Tesseract Not Found
Make sure Tesseract is installed and in your PATH. Test with:
```bash
tesseract --version
```

### CORS Errors
- Make sure backend is running on port 5000
- Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
- Restart both servers

### Port Already in Use
- Backend: Change port in `app.py` (last line)
- Frontend: Use `npm run dev -- -p 3001`

---

## 📁 Project Structure

```
.
├── IMES FOLDER/              # Backend (Flask)
│   ├── app.py               # Main Flask application with API
│   ├── database.db          # SQLite database
│   ├── student_documents/   # Uploaded files
│   ├── templates/           # HTML templates
│   ├── static/             # Static assets
│   ├── requirements.txt    # Python dependencies
│   └── venv/               # Python virtual environment
│
└── client/                  # Frontend (Next.js)
    ├── app/                # Next.js app directory
    │   ├── login/         # Login page
    │   ├── upload/        # Upload page
    │   ├── students/      # Students list page
    │   └── page.tsx       # Dashboard
    ├── components/         # React components
    ├── contexts/          # React contexts
    ├── lib/               # API client & auth
    ├── .env.local         # Environment variables ✅ CONFIGURED
    └── package.json       # Node dependencies
```

---

## 🎉 Success Indicators

When everything is working:

✅ Backend shows: "Server is ready! Press CTRL+C to stop"
✅ Frontend shows: "✓ Ready in Xms"
✅ You can login at http://localhost:3000/login
✅ Upload page works with OCR
✅ Students are displayed in the students page

---

## 📝 Notes

- The backend uses in-memory token storage (not production-ready)
- OCR requires clear, well-lit documents for best results
- Default database is SQLite (stored as `database.db`)
- File uploads are stored in `student_documents/` folder
