# IMES Document Management System - Backend

## Setup Instructions

### 1. Install Dependencies

```bash
cd "IMES FOLDER"
pip install -r requirements.txt
```

**Note:** Make sure you have Tesseract OCR installed on your system:
- Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
- Mac: `brew install tesseract`
- Linux: `sudo apt-get install tesseract-ocr`

### 2. Configuration

Copy the example environment file:
```bash
copy .env.example .env
```

Edit `.env` if needed to customize settings.

### 3. Run the Server

```bash
python app.py
```

The server will start on http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username/password
- `GET /api/auth/me` - Get current user info

### Document Management
- `POST /api/upload` - Upload and process a document
- `GET /api/students` - List all students (supports search and pagination)
- `GET /api/students/<id>` - Get specific student
- `DELETE /api/students/<id>` - Delete a student

### Export
- `GET /api/export/excel` - Export students to Excel

### Statistics
- `GET /api/stats` - Get dashboard statistics

## Default Credentials

- **Username:** admin
- **Password:** ned@admin123

## Features

- ✅ CORS enabled for frontend integration
- ✅ JWT-like token authentication
- ✅ OCR text extraction from images
- ✅ Document scanning with perspective correction
- ✅ Student information extraction
- ✅ Excel export functionality
- ✅ RESTful API design

## Database Schema

### students table
- id (PRIMARY KEY)
- student_id (UNIQUE)
- full_name
- email
- phone
- department
- program
- year_of_study
- document_type
- extracted_text
- original_image_path
- photo_path
- processed_image_path
- created_at
- updated_at
