import os
import re
import secrets
import shutil
import sqlite3
import threading
import hashlib
from datetime import datetime, timedelta
from io import BytesIO

import cv2
import numpy as np
import pandas as pd
import pytesseract
from PIL import Image
from openpyxl import Workbook
from flask import Flask, request, render_template, jsonify, send_file, redirect, url_for, session, abort
from flask_cors import CORS

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(
    __name__,
    static_folder=os.path.join(BASE_DIR, "static"),
    template_folder=os.path.join(BASE_DIR, "templates"),
)
CORS(app, resources={r"/api/*": {"origins": "*"}})

UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", os.path.join(BASE_DIR, "student_documents"))
DATABASE = os.getenv("DATABASE", os.path.join(BASE_DIR, "database.db"))
SECRET_KEY = os.getenv('SECRET_KEY', 'default-secret-key-change-in-production')
ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'ned@admin123')

app.secret_key = SECRET_KEY

# In-memory token storage (use Redis in production)
active_tokens = {}

_db_init_lock = threading.Lock()
_db_inited = False


def ensure_sqlite_db():
    """
    If DATABASE points to a non-SQLite file, move it aside and let init_db() recreate it.
    This prevents crashes like: sqlite3.DatabaseError: file is not a database
    """
    db_dir = os.path.dirname(DATABASE)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    if os.path.isdir(DATABASE):
        raise RuntimeError(f"DATABASE path points to a directory: {DATABASE}")

    if not os.path.exists(DATABASE):
        return

    try:
        with open(DATABASE, "rb") as f:
            header = f.read(16)
    except OSError:
        return

    # SQLite header: b"SQLite format 3\\x00"
    if header.startswith(b"SQLite format 3"):
        return

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{DATABASE}.corrupt_{ts}"
    try:
        os.replace(DATABASE, backup_path)
    except OSError:
        # If we can't rename, leave it; downstream will still error.
        pass


def ensure_db_initialized():
    global _db_inited
    if _db_inited:
        return
    with _db_init_lock:
        if _db_inited:
            return
        init_db()
        _db_inited = True


# -----------------------------
# Initialize Database
# -----------------------------
def init_db():
    ensure_sqlite_db()
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # Create new students table with all required fields
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            department TEXT,
            program TEXT,
            year_of_study TEXT,
            document_type TEXT,
            extracted_text TEXT,
            original_image_path TEXT,
            photo_path TEXT,
            processed_image_path TEXT,
            roll_number TEXT,
            batch TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Add missing columns to existing DBs (safe, best-effort).
    cursor.execute("PRAGMA table_info(students)")
    existing = {row[1] for row in cursor.fetchall()}

    # Keep this list aligned with the CREATE TABLE above.
    # We cannot reliably add NOT NULL constraints during ALTER TABLE, so migrations add columns as nullable.
    desired_columns = [
        ("student_id", "TEXT"),
        ("full_name", "TEXT"),
        ("email", "TEXT"),
        ("phone", "TEXT"),
        ("department", "TEXT"),
        ("program", "TEXT"),
        ("year_of_study", "TEXT"),
        ("document_type", "TEXT"),
        ("extracted_text", "TEXT"),
        ("original_image_path", "TEXT"),
        ("photo_path", "TEXT"),
        ("processed_image_path", "TEXT"),
        ("roll_number", "TEXT"),
        ("batch", "TEXT"),
        ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
        ("updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
    ]

    for col, col_ddl in desired_columns:
        if col in existing:
            continue
        try:
            cursor.execute(f"ALTER TABLE students ADD COLUMN {col} {col_ddl}")
        except sqlite3.OperationalError:
            # Older SQLite versions or odd schemas may fail; keep best-effort behavior.
            pass

    # Documents uploaded via the legacy admin form (/upload).
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS student_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_db_id INTEGER NOT NULL,
            roll_number TEXT NOT NULL,
            doc_type TEXT NOT NULL,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_db_id) REFERENCES students(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_number)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_docs_roll ON student_documents(roll_number)")

    conn.commit()
    conn.close()


def get_db_conn():
    ensure_db_initialized()
    ensure_sqlite_db()
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# -----------------------------
# Admin Helpers (Legacy HTML Dashboard)
# -----------------------------
def _try_parse_roll_folder_name(name: str):
    """
    Accepts roll formats seen in this repo, e.g.:
    - ME-23-082
    - ME-23082

    Returns (department, batch_year, roll) or (None, None, None).
    """
    m = re.match(r'^([A-Za-z]+)-(\d{2})-(\d+)$', name)
    if m:
        dept, yy, rest = m.group(1), m.group(2), m.group(3)
        return dept, f"20{yy}", name

    m = re.match(r'^([A-Za-z]+)-(\d{2})(\d+)$', name)
    if m:
        dept, yy, rest = m.group(1), m.group(2), m.group(3)
        return dept, f"20{yy}", name

    return None, None, None

def resolve_student_folder(roll: str):
    """
    Finds the student's folder on disk for both legacy structures:
    - student_documents/<year>/<dept>/<roll>/
    - student_documents/<roll>/
    """
    if not roll:
        return None

    # Structure A: year/department/roll
    parts = roll.split('-')
    if len(parts) == 3:
        dept, batch_code, _ = parts
        year = f"20{batch_code}"
        candidate = os.path.join(UPLOAD_FOLDER, year, dept, roll)
        if os.path.isdir(candidate):
            return candidate

    # Structure B: roll folder directly under UPLOAD_FOLDER
    candidate = os.path.join(UPLOAD_FOLDER, roll)
    if os.path.isdir(candidate):
        return candidate

    return None

def list_legacy_students_from_folders():
    """
    Builds the student list for server/templates/admin.html.
    Keeps compatibility with both folder layouts (see resolve_student_folder).
    """
    students = []
    if not os.path.isdir(UPLOAD_FOLDER):
        return students

    for entry in os.listdir(UPLOAD_FOLDER):
        entry_path = os.path.join(UPLOAD_FOLDER, entry)
        if not os.path.isdir(entry_path):
            continue

        # Layout A: student_documents/<year>/<dept>/<roll>/...
        if re.match(r'^\d{4}$', entry):
            year = entry
            for dept in os.listdir(entry_path):
                dept_path = os.path.join(entry_path, dept)
                if not os.path.isdir(dept_path):
                    continue
                for roll in os.listdir(dept_path):
                    roll_path = os.path.join(dept_path, roll)
                    if not os.path.isdir(roll_path):
                        continue
                    students.append({"batch": year, "department": dept, "roll": roll})
            continue

        # Layout B: student_documents/<roll>/...
        dept, year, roll = _try_parse_roll_folder_name(entry)
        if roll:
            students.append({"batch": year, "department": dept, "roll": roll})

    return students

# -----------------------------
# Authentication Helper Functions
# -----------------------------
def generate_token():
    return secrets.token_urlsafe(32)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_token(token):
    if token in active_tokens:
        if datetime.now() < active_tokens[token]['expires']:
            return True
        else:
            del active_tokens[token]
    return False


# -----------------------------
# OCR and Text Extraction
# -----------------------------
def extract_text_from_image(image_path):
    """Extract text from image using OCR"""
    try:
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image)
        return text
    except Exception as e:
        print(f"OCR Error: {e}")
        return ""

def extract_student_info(text):
    """Extract student information from OCR text"""
    student_data = {}
    
    # Extract student ID (various patterns)
    id_patterns = [
        r'(?:Student\s*ID|Roll\s*No|ID|Registration)[:\s]*([A-Z0-9\-]+)',
        r'\b([A-Z]{2,4}[-/]?\d{2,4}[-/]?\d{2,4})\b',
        r'\b(\d{4}-[A-Z]+-\d+)\b'
    ]
    for pattern in id_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            student_data['student_id'] = match.group(1).strip()
            break
    
    # Extract name
    name_pattern = r'(?:Name|Student\s*Name)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)'
    match = re.search(name_pattern, text, re.IGNORECASE)
    if match:
        student_data['full_name'] = match.group(1).strip()
    
    # Extract email
    email_pattern = r'[\w\.-]+@[\w\.-]+\.\w+'
    match = re.search(email_pattern, text)
    if match:
        student_data['email'] = match.group(0)
    
    # Extract phone
    phone_pattern = r'(?:Phone|Mobile|Contact)[:\s]*(\+?\d[\d\s\-]{8,})'
    match = re.search(phone_pattern, text, re.IGNORECASE)
    if match:
        student_data['phone'] = match.group(1).strip()
    
    # Extract department
    dept_pattern = r'(?:Department|Dept)[:\s]*([A-Za-z\s&]+?)(?:\n|$)'
    match = re.search(dept_pattern, text, re.IGNORECASE)
    if match:
        student_data['department'] = match.group(1).strip()
    
    # Extract program
    program_pattern = r'(?:Program|Degree|Course)[:\s]*([A-Za-z\s\.]+?)(?:\n|$)'
    match = re.search(program_pattern, text, re.IGNORECASE)
    if match:
        student_data['program'] = match.group(1).strip()
    
    return student_data


# -----------------------------
# API Authentication Routes
# -----------------------------
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        token = generate_token()
        expires = datetime.now() + timedelta(hours=24)
        active_tokens[token] = {
            'username': username,
            'expires': expires
        }
        
        return jsonify({
            'access_token': token,
            'token_type': 'Bearer',
            'expires_in': 86400  # 24 hours in seconds
        })
    
    return jsonify({'detail': 'Invalid credentials'}), 401

@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'detail': 'Not authenticated'}), 401
    
    token = auth_header.split(' ')[1]
    if not verify_token(token):
        return jsonify({'detail': 'Invalid or expired token'}), 401
    
    return jsonify({
        'username': active_tokens[token]['username'],
        'role': 'admin'
    })



# -----------------------------
# Home Route
# -----------------------------
@app.route('/')
def index():
    # Official Flask setup: land on login first (works with ngrok root URL).
    return redirect('/login')


# -----------------------------
# Document Scanner (CLEAN VERSION)
# -----------------------------


def order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")

    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]

    return rect


def enhance_image(image, image_path):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    enhanced = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        21,
        10
    )

    base = os.path.splitext(image_path)[0]
    scanned_path = base + "_scanned.jpg"

    cv2.imwrite(scanned_path, enhanced)

    return scanned_path


def scan_document(image_path):

    try:
        pil_image = Image.open(image_path).convert("RGB")
        image = np.array(pil_image)
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    except Exception as e:
        print("Image read failed:", e)
        return image_path

    original = image.copy()

    # Resize safely
    target_height = 1000
    ratio = image.shape[0] / target_height
    resized = cv2.resize(image, (int(image.shape[1] / ratio), target_height))

    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)

    edged = cv2.Canny(gray, 75, 200)

    contours, _ = cv2.findContours(
        edged,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    if not contours:
        return enhance_image(original, image_path)

    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    image_area = resized.shape[0] * resized.shape[1]
    document_contour = None

    for contour in contours:
        area = cv2.contourArea(contour)

        # Ignore small rectangles
        if area < image_area * 0.6:
            continue

        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)

        if len(approx) == 4:
            document_contour = approx
            break

    if document_contour is None:
        return enhance_image(original, image_path)

    pts = document_contour.reshape(4, 2) * ratio
    rect = order_points(pts)

    (tl, tr, br, bl) = rect

    widthA = np.linalg.norm(br - bl)
    widthB = np.linalg.norm(tr - tl)
    maxWidth = max(int(widthA), int(widthB))

    heightA = np.linalg.norm(tr - br)
    heightB = np.linalg.norm(tl - bl)
    maxHeight = max(int(heightA), int(heightB))

    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(original, M, (maxWidth, maxHeight))

    return enhance_image(warped, image_path)

    
# -----------------------------
# API Upload Route (NEW)
# -----------------------------
@app.route('/api/upload', methods=['POST'])
def api_upload():
    # Verify token
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'detail': 'Not authenticated'}), 401
    
    token = auth_header.split(' ')[1]
    if not verify_token(token):
        return jsonify({'detail': 'Invalid or expired token'}), 401
    
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400
    
    try:
        # Create upload folder if doesn't exist
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        original_filename = f"original_{timestamp}_{file.filename}"
        original_path = os.path.join(UPLOAD_FOLDER, original_filename)
        
        # Save original file
        file.save(original_path)
        
        # Process image (scan if it's an image)
        processed_path = original_path
        if file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff')):
            processed_path = scan_document(original_path)
        
        # Extract text using OCR
        extracted_text = extract_text_from_image(processed_path)
        student_data = extract_student_info(extracted_text)
        
        # Generate student ID if not found
        if 'student_id' not in student_data:
            student_data['student_id'] = f"STU-{timestamp}"
        
        # Use filename as name if not found
        if 'full_name' not in student_data:
            student_data['full_name'] = f"Student {student_data['student_id']}"
        
        # Save to database
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO students 
                (student_id, full_name, email, phone, department, program, 
                 extracted_text, original_image_path, processed_image_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                student_data.get('student_id'),
                student_data.get('full_name'),
                student_data.get('email'),
                student_data.get('phone'),
                student_data.get('department'),
                student_data.get('program'),
                extracted_text,
                original_path,
                processed_path
            ))
            conn.commit()
            student_id = cursor.lastrowid
            
            # Get the created student
            cursor.execute("SELECT * FROM students WHERE id = ?", (student_id,))
            row = cursor.fetchone()
            columns = [description[0] for description in cursor.description]
            student = dict(zip(columns, row))
            
        except sqlite3.IntegrityError:
            # Student ID already exists, update instead
            cursor.execute("""
                UPDATE students 
                SET full_name=?, email=?, phone=?, department=?, program=?,
                    extracted_text=?, original_image_path=?, processed_image_path=?,
                    updated_at=CURRENT_TIMESTAMP
                WHERE student_id=?
            """, (
                student_data.get('full_name'),
                student_data.get('email'),
                student_data.get('phone'),
                student_data.get('department'),
                student_data.get('program'),
                extracted_text,
                original_path,
                processed_path,
                student_data.get('student_id')
            ))
            conn.commit()
            
            cursor.execute("SELECT * FROM students WHERE student_id = ?", 
                         (student_data.get('student_id'),))
            row = cursor.fetchone()
            columns = [description[0] for description in cursor.description]
            student = dict(zip(columns, row))
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Document processed successfully',
            'student': student,
            'ocr_result': {
                'success': True,
                'extracted_text': extracted_text,
                'student_data': student_data,
                'photo_extracted': False
            }
        })
        
    except Exception as e:
        print(f"Upload error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Upload failed: {str(e)}'
        }), 500


# -----------------------------
# API Students Routes
# -----------------------------
@app.route('/api/students', methods=['GET'])
def get_students():
    # Verify token
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'detail': 'Not authenticated'}), 401
    
    token = auth_header.split(' ')[1]
    if not verify_token(token):
        return jsonify({'detail': 'Invalid or expired token'}), 401
    
    query = request.args.get('query', '')
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('page_size', 50))
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Build query
    if query:
        sql = """
            SELECT * FROM students 
            WHERE student_id LIKE ? OR full_name LIKE ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        """
        cursor.execute(sql, (f'%{query}%', f'%{query}%', page_size, (page - 1) * page_size))
        
        count_sql = "SELECT COUNT(*) FROM students WHERE student_id LIKE ? OR full_name LIKE ?"
        cursor.execute(count_sql, (f'%{query}%', f'%{query}%'))
    else:
        sql = "SELECT * FROM students ORDER BY created_at DESC LIMIT ? OFFSET ?"
        cursor.execute(sql, (page_size, (page - 1) * page_size))
        
        count_sql = "SELECT COUNT(*) FROM students"
        cursor.execute(count_sql)
    
    rows = cursor.fetchall()
    columns = [description[0] for description in cursor.description]
    students = [dict(zip(columns, row)) for row in rows]
    
    # Get total count
    cursor.execute(count_sql if not query else count_sql, 
                  () if not query else (f'%{query}%', f'%{query}%'))
    total = cursor.fetchone()[0]
    
    conn.close()
    
    return jsonify({
        'total': total,
        'page': page,
        'page_size': page_size,
        'students': students
    })


@app.route('/api/students/<int:student_id>', methods=['GET'])
def get_student(student_id):
    # Verify token
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'detail': 'Not authenticated'}), 401
    
    token = auth_header.split(' ')[1]
    if not verify_token(token):
        return jsonify({'detail': 'Invalid or expired token'}), 401
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students WHERE id = ?", (student_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return jsonify({'detail': 'Student not found'}), 404
    
    columns = [description[0] for description in cursor.description]
    student = dict(zip(columns, row))
    
    return jsonify(student)

@app.route('/api/students/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    # Verify token
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'detail': 'Not authenticated'}), 401
    
    token = auth_header.split(' ')[1]
    if not verify_token(token):
        return jsonify({'detail': 'Invalid or expired token'}), 401
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM students WHERE id = ?", (student_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})


# -----------------------------
# API Export Route
# -----------------------------
@app.route('/api/export/excel', methods=['GET'])
def export_excel():
    # Verify token
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'detail': 'Not authenticated'}), 401
    
    token = auth_header.split(' ')[1]
    if not verify_token(token):
        return jsonify({'detail': 'Invalid or expired token'}), 401
    
    query = request.args.get('query', '')
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    if query:
        cursor.execute(
            "SELECT * FROM students WHERE student_id LIKE ? OR full_name LIKE ?",
            (f'%{query}%', f'%{query}%')
        )
    else:
        cursor.execute("SELECT * FROM students")
    
    rows = cursor.fetchall()
    columns = [description[0] for description in cursor.description]
    conn.close()
    
    # Create Excel file
    wb = Workbook()
    ws = wb.active
    ws.title = "Students"
    
    # Add headers
    ws.append(columns)
    
    # Add data
    for row in rows:
        ws.append(row)
    
    # Save to BytesIO
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f'students_{datetime.now().strftime("%Y%m%d")}.xlsx'
    )


# -----------------------------
# API Statistics Route
# -----------------------------
@app.route('/api/stats', methods=['GET'])
def get_stats():
    # Verify token
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'detail': 'Not authenticated'}), 401
    
    token = auth_header.split(' ')[1]
    if not verify_token(token):
        return jsonify({'detail': 'Invalid or expired token'}), 401
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Total students
    cursor.execute("SELECT COUNT(*) FROM students")
    total_students = cursor.fetchone()[0]
    
    # Recent uploads (last 7 days)
    cursor.execute("""
        SELECT COUNT(*) FROM students 
        WHERE created_at >= datetime('now', '-7 days')
    """)
    recent_uploads = cursor.fetchone()[0]
    
    # Departments
    cursor.execute("""
        SELECT department, COUNT(*) as count 
        FROM students 
        WHERE department IS NOT NULL 
        GROUP BY department
    """)
    departments = [{'name': row[0], 'count': row[1]} for row in cursor.fetchall()]
    
    conn.close()
    
    return jsonify({
        'total_students': total_students,
        'recent_uploads': recent_uploads,
        'departments': departments
    })


# -----------------------------
# Legacy Upload Route (for HTML form)
# -----------------------------
@app.route('/upload', methods=['POST'])
def upload():

    roll_number = request.form.get('full_roll')

    if not roll_number:
        return "Roll number not generated properly."

    domicile_files = request.files.getlist('domicile_files')
    marksheet_files = request.files.getlist('marksheet_files')
    optional_files = request.files.getlist('optional_files')

    if not domicile_files or domicile_files[0].filename == '':
        return "Domicile files are required.", 400

    if not marksheet_files or marksheet_files[0].filename == '':
        return "Mark sheet files are required.", 400

    # ---- Extract department & batch ----
    parts = roll_number.split('-')

    if len(parts) != 3:
        return "Invalid roll number format."

    department = parts[0]
    batch_code = parts[1]
    full_year = "20" + batch_code

    # ---- Create structured folders ----
    batch_folder = os.path.join(UPLOAD_FOLDER, full_year)
    department_folder = os.path.join(batch_folder, department)
    student_folder = os.path.join(department_folder, roll_number)

    os.makedirs(student_folder, exist_ok=True)

    temp_files = []

    def _files_to_pdf(file_list, out_name):
        images = []
        page_idx = 1

        for f in file_list:
            if not f or not f.filename:
                continue

            temp_image_path = os.path.join(student_folder, f"temp_{out_name}_{page_idx}.jpg")
            f.save(temp_image_path)

            scanned_image_path = scan_document(temp_image_path)
            temp_files.extend([temp_image_path, scanned_image_path])

            try:
                img = Image.open(scanned_image_path).convert("RGB")
                images.append(img.copy())
                img.close()
            except Exception:
                continue

            page_idx += 1

        if not images:
            return False

        pdf_path = os.path.join(student_folder, f"{roll_number}_{out_name}.pdf")
        first, rest = images[0], images[1:]
        first.save(pdf_path, save_all=True, append_images=rest)
        return True

    domicile_ok = _files_to_pdf(domicile_files, "domicile")
    marksheet_ok = _files_to_pdf(marksheet_files, "marksheet")

    if not domicile_ok:
        return "Failed to process domicile files.", 400
    if not marksheet_ok:
        return "Failed to process mark sheet files.", 400

    # Optional docs: each optional file becomes its own PDF.
    opt_idx = 1
    for f in optional_files:
        if not f or not f.filename:
            continue

        temp_image_path = os.path.join(student_folder, f"temp_optional_{opt_idx}.jpg")
        f.save(temp_image_path)
        scanned_image_path = scan_document(temp_image_path)
        temp_files.extend([temp_image_path, scanned_image_path])

        final_pdf_path = os.path.join(student_folder, f"{roll_number}_optional_{opt_idx}.pdf")
        try:
            with Image.open(scanned_image_path) as img:
                img = img.convert("RGB")
                img.save(final_pdf_path)
        except Exception:
            pass

        opt_idx += 1

    # ---- Persist to database (student + document records) ----
    conn = get_db_conn()
    cursor = conn.cursor()

    # Make sure student exists (we re-use students table for both OCR/API and legacy form).
    cursor.execute("SELECT id FROM students WHERE roll_number = ?", (roll_number,))
    row = cursor.fetchone()
    if row:
        student_db_id = row["id"]
        cursor.execute(
            "UPDATE students SET department=?, batch=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
            (department, full_year, student_db_id),
        )
    else:
        # For legacy form we use roll_number as student_id (unique, stable).
        cursor.execute(
            """
            INSERT INTO students (student_id, full_name, department, roll_number, batch)
            VALUES (?, ?, ?, ?, ?)
            """,
            (roll_number, f"Student {roll_number}", department, roll_number, full_year),
        )
        student_db_id = cursor.lastrowid

    def _upsert_doc(doc_type: str, filename: str, path: str):
        cursor.execute(
            """
            DELETE FROM student_documents
            WHERE roll_number = ? AND doc_type = ?
            """,
            (roll_number, doc_type),
        )
        cursor.execute(
            """
            INSERT INTO student_documents (student_db_id, roll_number, doc_type, filename, file_path)
            VALUES (?, ?, ?, ?, ?)
            """,
            (student_db_id, roll_number, doc_type, filename, path),
        )

    domicile_pdf = os.path.join(student_folder, f"{roll_number}_domicile.pdf")
    marksheet_pdf = os.path.join(student_folder, f"{roll_number}_marksheet.pdf")
    if os.path.isfile(domicile_pdf):
        _upsert_doc("domicile", os.path.basename(domicile_pdf), domicile_pdf)
    if os.path.isfile(marksheet_pdf):
        _upsert_doc("marksheet", os.path.basename(marksheet_pdf), marksheet_pdf)

    # Optional docs are additive.
    for i in range(1, opt_idx):
        optional_pdf = os.path.join(student_folder, f"{roll_number}_optional_{i}.pdf")
        if os.path.isfile(optional_pdf):
            cursor.execute(
                """
                INSERT INTO student_documents (student_db_id, roll_number, doc_type, filename, file_path)
                VALUES (?, ?, ?, ?, ?)
                """,
                (student_db_id, roll_number, f"optional_{i}", os.path.basename(optional_pdf), optional_pdf),
            )

    conn.commit()
    conn.close()

    # ---- Clean temp files ----
    for path in temp_files:
        if os.path.exists(path):
            os.remove(path)

    optional_count = max(0, opt_idx - 1)
    msg = f"Saved for {roll_number}: Domicile + Mark Sheet."
    if optional_count:
        msg += f" Optional PDFs: {optional_count}."
    msg += " You can open the record from Dashboard -> View."
    return msg

# -----------------------------
# Admin Route 
# -----------------------------
@app.route('/admin')
def admin_dashboard():
    if not session.get('admin'):
        return redirect('/login')

    # Prefer DB-backed students (created via /upload). Fallback to folder scan for legacy data.
    conn = get_db_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT roll_number, department, batch
            FROM students
            WHERE roll_number IS NOT NULL
            ORDER BY created_at DESC
            """
        )
        rows = cursor.fetchall()
    except sqlite3.OperationalError:
        rows = []
    finally:
        conn.close()

    if rows:
        data = [{"roll": r["roll_number"], "department": r["department"], "batch": r["batch"]} for r in rows]
    else:
        data = list_legacy_students_from_folders()

    return render_template("admin.html", students=data)


# -----------------------------
# Remove button 
# -----------------------------
@app.route('/delete_student/<roll>', methods=['POST'])
def delete_student_api(roll):
    if not session.get('admin'):
        return redirect('/login')

    student_folder = resolve_student_folder(roll)

    if student_folder and os.path.exists(student_folder):
        shutil.rmtree(student_folder)

    # Remove DB records (best-effort).
    conn = get_db_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM student_documents WHERE roll_number = ?", (roll,))
        cursor.execute("DELETE FROM students WHERE roll_number = ?", (roll,))
        conn.commit()
    except sqlite3.OperationalError:
        pass
    finally:
        conn.close()

    return redirect(url_for('admin_dashboard'))

# -----------------------------
# login page route 
# -----------------------------
@app.route('/login', methods=['GET','POST'])
def admin_login():
    if session.get('admin'):
        return redirect('/admin')

    error = None

    if request.method == 'POST':
        username = (request.form.get('username') or '').strip()
        password = request.form.get('password') or ''

        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session['admin'] = True
            return redirect('/admin')

        error = "Invalid username or password."

    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')

# -----------------------------
# Export to excel 
# -----------------------------
@app.route('/export')
def export():
    if not session.get('admin'):
        return redirect('/login')

    conn = sqlite3.connect('database.db')
    df = pd.read_sql_query("SELECT * FROM students", conn)
    conn.close()

    file_path = "students.xlsx"
    df.to_excel(file_path, index=False)

    return send_file(file_path, as_attachment=True)


# -----------------------------
# Student Detail Page
# -----------------------------
@app.route('/student/<roll>')
def student_detail(roll):
    if not session.get('admin'):
        return redirect('/login')

    student_folder = resolve_student_folder(roll)

    # Prefer DB document list.
    docs = []
    conn = get_db_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT doc_type, filename
            FROM student_documents
            WHERE roll_number = ?
            ORDER BY created_at DESC
            """,
            (roll,),
        )
        docs = [{"doc_type": r["doc_type"], "filename": r["filename"]} for r in cursor.fetchall()]
    except sqlite3.OperationalError:
        docs = []
    finally:
        conn.close()

    # Fallback to folder listing if DB has nothing.
    files = []
    if student_folder and os.path.isdir(student_folder):
        try:
            for name in sorted(os.listdir(student_folder)):
                path = os.path.join(student_folder, name)
                if os.path.isfile(path):
                    files.append(name)
        except OSError:
            files = []

    if not docs and not files:
        abort(404)

    return render_template("student_detail.html", roll=roll, docs=docs, files=files)

@app.route('/student/<roll>/download/<path:filename>')
def student_download(roll, filename):
    if not session.get('admin'):
        return redirect('/login')

    student_folder = resolve_student_folder(roll)
    if not student_folder:
        abort(404)

    safe_path = os.path.abspath(os.path.join(student_folder, filename))
    if not safe_path.startswith(os.path.abspath(student_folder) + os.sep):
        abort(400)

    if not os.path.isfile(safe_path):
        abort(404)

    return send_file(safe_path, as_attachment=True)

# -----------------------------
# Analytics API Route
# -----------------------------
@app.route('/api/analytics')
def analytics_data():
    # Prefer DB analytics; fallback to folder scan if DB is empty or unavailable.
    counts = {}
    conn = get_db_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT batch, COUNT(*)
            FROM students
            WHERE roll_number IS NOT NULL AND batch IS NOT NULL
            GROUP BY batch
            """
        )
        for b, c in cursor.fetchall():
            counts[b] = c
    except sqlite3.OperationalError:
        counts = {}
    finally:
        conn.close()

    if not counts:
        students = list_legacy_students_from_folders()
        for s in students:
            b = s.get("batch") or "Unknown"
            counts[b] = counts.get(b, 0) + 1

    labels = sorted(counts.keys())
    values = [counts[k] for k in labels]
    return jsonify({"labels": labels, "values": values})

# -----------------------------
# Run Server
# -----------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Starting IMES Document Management Backend Server")
    print("=" * 60)
    print(f"📁 Upload folder: {UPLOAD_FOLDER}")
    print(f"💾 Database: {DATABASE}")
    print(f"🌐 Server: http://0.0.0.0:5000")
    print(f"🔑 Admin credentials: {ADMIN_USERNAME} / {ADMIN_PASSWORD}")
    print("=" * 60)
    print("\n📋 Available API Endpoints:")
    print("  POST   /api/auth/login      - Login")
    print("  GET    /api/auth/me         - Get current user")
    print("  POST   /api/upload          - Upload document")
    print("  GET    /api/students        - List students")
    print("  GET    /api/students/<id>   - Get student")
    print("  DELETE /api/students/<id>   - Delete student")
    print("  GET    /api/export/excel    - Export to Excel")
    print("  GET    /api/stats           - Get statistics")
    print("\n🎯 Frontend URL: http://localhost:3000")
    print("=" * 60)
    print("\n✅ Initializing database...")
    init_db()
    print("✅ Database initialized!")
    print("\n🎉 Server is ready! Press CTRL+C to stop.\n")
    app.run(host="0.0.0.0", port=5000, debug=True)
