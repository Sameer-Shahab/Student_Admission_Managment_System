# 🏗️ System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                            │
│                     http://localhost:3000                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                           │
│                         Port: 3000                              │
├─────────────────────────────────────────────────────────────────┤
│  Pages:                                                         │
│    • /login          - Authentication                           │
│    • /               - Dashboard                                │
│    • /upload         - Document Upload                          │
│    • /students       - Student Management                       │
│                                                                 │
│  Libraries:                                                     │
│    • lib/auth.ts     - Authentication service                   │
│    • lib/api.ts      - API client                               │
│                                                                 │
│  Components:                                                    │
│    • AuthGuard       - Route protection                         │
│    • ThemeContext    - Dark theme support                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Bearer Token Auth
                              │ API Calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Flask)                              │
│                         Port: 5000                              │
├─────────────────────────────────────────────────────────────────┤
│  API Endpoints:                                                 │
│    POST   /api/auth/login       - Login                         │
│    GET    /api/auth/me          - Get user info                 │
│    POST   /api/upload           - Upload document               │
│    GET    /api/students         - List students                 │
│    GET    /api/students/<id>    - Get student                   │
│    DELETE /api/students/<id>    - Delete student                │
│    GET    /api/export/excel     - Export to Excel               │
│    GET    /api/stats            - Get statistics                │
│                                                                 │
│  Features:                                                      │
│    • Flask-CORS      - Cross-origin requests                    │
│    • Token Auth      - JWT-like authentication                  │
│    • OCR Processing  - Text extraction (Tesseract)              │
│    • Image Scanning  - Perspective correction (OpenCV)          │
│    • Data Extraction - Student info parsing (Regex)             │
│    • Excel Export    - Spreadsheet generation (openpyxl)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ SQL Queries
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (SQLite)                            │
│                      database.db                                │
├─────────────────────────────────────────────────────────────────┤
│  Tables:                                                        │
│    • students                                                   │
│      - id, student_id, full_name                                │
│      - email, phone, department, program                        │
│      - extracted_text, image paths                              │
│      - created_at, updated_at                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ File Storage
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FILE SYSTEM                                  │
├─────────────────────────────────────────────────────────────────┤
│  IMES FOLDER/student_documents/                                 │
│    • original_20250221_143022_document.jpg                      │
│    • original_20250221_143022_document_scanned.jpg              │
│    • ...                                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Request Flow Example: Document Upload

```
1. USER ACTION
   │
   ▼
[User uploads document via /upload page]
   │
   ▼
2. FRONTEND
   │
   ├─→ Validates file
   ├─→ Gets auth token from localStorage
   ├─→ Creates FormData with file
   │
   ▼
3. API REQUEST
   │
   POST http://localhost:5000/api/upload
   Headers: { Authorization: "Bearer <token>" }
   Body: FormData { file: <file> }
   │
   ▼
4. BACKEND PROCESSING
   │
   ├─→ Verify authentication token
   ├─→ Save original file to disk
   ├─→ Process image with OpenCV (scan_document)
   ├─→ Extract text with Tesseract OCR
   ├─→ Parse student info with regex
   ├─→ Save to database
   │
   ▼
5. DATABASE
   │
   INSERT INTO students (student_id, full_name, email, ...)
   VALUES (...)
   │
   ▼
6. BACKEND RESPONSE
   │
   {
     "success": true,
     "message": "Document processed successfully",
     "student": { ... },
     "ocr_result": { ... }
   }
   │
   ▼
7. FRONTEND
   │
   ├─→ Display success message
   ├─→ Show extracted student info
   └─→ Clear upload form
```

## Technology Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4.0
- **State:** React Hooks + Context API
- **HTTP Client:** Fetch API

### Backend
- **Framework:** Flask 3.1.2
- **Language:** Python
- **CORS:** Flask-CORS 5.0.0
- **OCR:** Tesseract (pytesseract)
- **Image Processing:** OpenCV (cv2)
- **PDF:** PyPDF2
- **Excel:** openpyxl

### Database
- **Type:** SQLite
- **File:** database.db
- **ORM:** Raw SQL (sqlite3)

### File Storage
- **Type:** Local filesystem
- **Location:** IMES FOLDER/student_documents/

## Security Model

```
┌──────────────┐
│  Login Page  │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────┐
│  POST /api/auth/login               │
│  { username, password }             │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Backend validates credentials      │
│  Generates random token             │
│  Stores in active_tokens dict       │
│  Returns: { access_token, ... }     │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Frontend stores token              │
│  localStorage.setItem('access_token')│
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  All subsequent requests include:   │
│  Authorization: Bearer <token>      │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Backend verifies token exists      │
│  and hasn't expired (24h)           │
└─────────────────────────────────────┘
```

## Data Flow

### Upload Flow
```
User → Upload Form → File Selection → API Call → 
Backend → Save File → OCR Processing → Data Extraction → 
Database Insert → Response → Frontend Update
```

### Search Flow
```
User → Search Input → Debounced Query → API Call → 
Backend → Database Query → Filter Results → 
Response → Frontend Display
```

### Export Flow
```
User → Export Button → API Call → Backend → 
Database Query → Excel Generation → 
Binary Response → Frontend Download
```

## Port Configuration

| Service  | Port | Protocol | URL                        |
|----------|------|----------|----------------------------|
| Frontend | 3000 | HTTP     | http://localhost:3000      |
| Backend  | 5000 | HTTP     | http://localhost:5000      |

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=University Document Management System
```

### Backend (.env)
```
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ned@admin123
UPLOAD_FOLDER=student_documents
DATABASE=database.db
```

## Deployment Considerations

### Development (Current Setup)
- ✅ CORS enabled for localhost:3000
- ✅ Debug mode enabled
- ✅ In-memory token storage
- ✅ SQLite database

### Production Recommendations
- 🔄 Change CORS to specific domain
- 🔄 Disable debug mode
- 🔄 Use Redis for token storage
- 🔄 Use PostgreSQL/MySQL
- 🔄 Add rate limiting
- 🔄 Use proper secret management
- 🔄 Add HTTPS
- 🔄 Deploy frontend to Vercel/Netlify
- 🔄 Deploy backend to AWS/Heroku
