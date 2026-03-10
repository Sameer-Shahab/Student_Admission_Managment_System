# IMES Document Scanner - Code Explanation

## 📋 Overview

This is a **Flask-based web application** designed for managing student admission documents. It allows users to upload images of documents (like photos taken from a phone), automatically processes them to look like scanned documents, and compiles them into a single PDF file per student.

---

## 🏗️ System Architecture

### Technology Stack
- **Backend Framework**: Flask (Python web framework)
- **Image Processing**: OpenCV (cv2) + PIL (Pillow)
- **PDF Generation**: PyPDF2
- **Database**: SQLite3
- **Frontend**: HTML5 + CSS3 (embedded in template)

### File Structure
```
IMES FOLDER/
├── app.py                      # Main Flask application
├── database.db                 # SQLite database
├── templates/
│   └── upload.html            # Frontend interface
├── static/
│   ├── university_logo.png    # Header logo
│   └── imes_lab_logo.png      # Footer logo
└── student_documents/         # Storage for generated PDFs
    └── {roll_number}/
        └── {roll_number}.pdf
```

---

## 🔍 Code Breakdown

### 1. **Imports and Configuration** (Lines 0-11)

```python
import os
import sqlite3
from flask import Flask, request, render_template
from datetime import datetime
import cv2
from PyPDF2 import PdfMerger
from PIL import Image
```

**Purpose**: Import necessary libraries for:
- File system operations (`os`)
- Database management (`sqlite3`)
- Web framework (`Flask`)
- Image processing (`cv2`, `PIL`)
- PDF manipulation (`PyPDF2`)

**Configuration Constants**:
- `UPLOAD_FOLDER = "student_documents"` - Where PDFs are stored
- `DATABASE = "database.db"` - SQLite database file

---

### 2. **Database Initialization** (Lines 17-31)

```python
def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            roll_number TEXT,
            filename TEXT,
            upload_date TEXT
        )
    """)
```

**Purpose**: Creates a SQLite database table to track uploaded documents.

**Table Schema**:
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Auto-incrementing primary key |
| `roll_number` | TEXT | Student's roll number |
| `filename` | TEXT | Name of the generated PDF |
| `upload_date` | TEXT | Timestamp of upload |

---

### 3. **Home Route** (Lines 37-39)

```python
@app.route('/')
def index():
    return render_template("upload.html")
```

**Purpose**: Serves the main upload page when users visit the root URL (`/`).

---

### 4. **Document Scanning Algorithm** (Lines 50-148)

This is the **core image processing function** that transforms regular photos into scanned-looking documents.

#### **Step-by-Step Process**:

##### **A. Image Loading** (Lines 52-62)
```python
pil_image = Image.open(image_path).convert("RGB")
image = np.array(pil_image)
image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
```
- Opens image using PIL (handles mobile photo formats better)
- Converts to NumPy array for OpenCV processing
- Converts RGB → BGR (OpenCV's color format)

##### **B. Image Preprocessing** (Lines 66-74)
```python
target_height = 1000
ratio = image.shape[0] / target_height
image = cv2.resize(image, (int(image.shape[1] / ratio), target_height))

gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
gray = cv2.GaussianBlur(gray, (5, 5), 0)
edged = cv2.Canny(gray, 50, 150)
```
- **Resizes** image to 1000px height for faster processing
- Converts to **grayscale**
- Applies **Gaussian blur** to reduce noise
- Uses **Canny edge detection** to find document boundaries

##### **C. Contour Detection** (Lines 76-98)
```python
contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
contours = sorted(contours, key=cv2.contourArea, reverse=True)

for contour in contours:
    peri = cv2.arcLength(contour, True)
    approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
    
    if len(approx) == 4:
        doc_contour = approx
        break
```
- Finds all contours (shapes) in the image
- Sorts by size (largest first)
- Looks for a **4-sided polygon** (document edge)
- Uses `approxPolyDP` to simplify contours

##### **D. Perspective Transformation** (Lines 100-130)
```python
pts = doc_contour.reshape(4, 2) * ratio

# Order points: top-left, top-right, bottom-right, bottom-left
rect = np.zeros((4, 2), dtype="float32")
s = pts.sum(axis=1)
rect[0] = pts[np.argmin(s)]  # Top-left (smallest sum)
rect[2] = pts[np.argmax(s)]  # Bottom-right (largest sum)

diff = np.diff(pts, axis=1)
rect[1] = pts[np.argmin(diff)]  # Top-right
rect[3] = pts[np.argmax(diff)]  # Bottom-left

# Calculate dimensions
widthA = np.linalg.norm(br - bl)
widthB = np.linalg.norm(tr - tl)
maxWidth = max(int(widthA), int(widthB))

M = cv2.getPerspectiveTransform(rect, dst)
warped = cv2.warpPerspective(orig, M, (maxWidth, maxHeight))
```
- Scales corner points back to original image size
- **Orders corners** correctly (TL, TR, BR, BL)
- Calculates target document dimensions
- Applies **perspective transform** to get bird's-eye view

##### **E. Scan Effect** (Lines 132-148)
```python
warped_gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)

scanned = cv2.adaptiveThreshold(
    warped_gray,
    255,
    cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv2.THRESH_BINARY,
    15,
    8
)

scanned_path = base + "_scanned.jpg"
cv2.imwrite(scanned_path, scanned)
```
- Converts to grayscale
- Applies **adaptive thresholding** for high-contrast black/white effect
- Saves as `{filename}_scanned.jpg`

---

### 5. **Upload Route** (Lines 155-217)

This handles the main document upload and PDF generation workflow.

#### **Workflow**:

##### **A. Receive Upload** (Lines 158-162)
```python
roll_number = request.form['roll_number']
files = request.files.getlist('files')
```
- Gets student roll number from form
- Retrieves multiple uploaded files

##### **B. Setup Student Folder** (Lines 164-168)
```python
student_folder = os.path.join(UPLOAD_FOLDER, roll_number)
os.makedirs(student_folder, exist_ok=True)

pdf_path = os.path.join(student_folder, f"{roll_number}.pdf")
```
- Creates folder: `student_documents/{roll_number}/`
- Sets PDF path: `student_documents/{roll_number}/{roll_number}.pdf`

##### **C. PDF Merging Logic** (Lines 169-196)
```python
merger = PdfMerger()

# If PDF already exists → append it first
if os.path.exists(pdf_path):
    merger.append(pdf_path)

for file in files:
    temp_image_path = os.path.join(student_folder, f"temp_{page_count}.jpg")
    file.save(temp_image_path)
    
    scanned_image_path = scan_document(temp_image_path)
    
    temp_pdf_path = os.path.join(student_folder, f"page_{page_count}.pdf")
    
    with Image.open(scanned_image_path) as img:
        img = img.convert("RGB")
        img.save(temp_pdf_path)
    
    merger.append(temp_pdf_path)
```

**Key Features**:
- **Appends to existing PDF** if student has previous uploads
- For each uploaded image:
  1. Saves as temporary image
  2. Applies scan effect
  3. Converts to PDF page
  4. Adds to merger

##### **D. Cleanup** (Lines 198-205)
```python
merger.write(pdf_path)
merger.close()

for path in temp_files:
    if os.path.exists(path):
        os.remove(path)
```
- Writes final combined PDF
- Deletes all temporary files (temp images, scanned images, page PDFs)

##### **E. Database Recording** (Lines 207-215)
```python
conn = sqlite3.connect(DATABASE)
cursor = conn.cursor()
cursor.execute(
    "INSERT INTO documents (roll_number, filename, upload_date) VALUES (?, ?, ?)",
    (roll_number, f"{roll_number}.pdf", datetime.now())
)
conn.commit()
conn.close()
```
- Records upload in database with timestamp

---

### 6. **Server Startup** (Lines 223-225)

```python
if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
```
- Initializes database on startup
- Runs Flask server accessible from any network interface
- Debug mode enabled for development

---

## 🎨 Frontend (upload.html)

### Features:
1. **Gradient Background**: Modern dark theme with purple/cyan colors
2. **Glassmorphism Card**: Frosted glass effect for the upload form
3. **Responsive Design**: Works on mobile and desktop
4. **Form Elements**:
   - Text input for roll number
   - File input accepting multiple images
   - Submit button with hover effects

### User Flow:
1. Enter student roll number
2. Select multiple document images
3. Click "Upload & Generate PDF"
4. System processes images and creates/updates PDF

---

## 🔧 How It Works - Complete Example

### Scenario: Student with roll number "2024001" uploads 3 photos

1. **User submits form** with roll number "2024001" and 3 images
2. **Server creates folder**: `student_documents/2024001/`
3. **For each image**:
   - Saves as `temp_1.jpg`, `temp_2.jpg`, `temp_3.jpg`
   - Runs scan algorithm → `temp_1_scanned.jpg`, etc.
   - Converts to PDF → `page_1.pdf`, `page_2.pdf`, `page_3.pdf`
4. **Merges all pages** into `2024001.pdf`
5. **Deletes temp files** (only keeps final PDF)
6. **Saves record** to database
7. **Returns success message**

### Next Time Same Student Uploads:
- Opens existing `2024001.pdf`
- Adds new pages to the end
- Overwrites with updated PDF

---

## 🎯 Key Features

### ✅ Automatic Document Detection
- Uses computer vision to find document edges
- Corrects perspective distortion
- Works even if photo is taken at an angle

### ✅ Scan-like Appearance
- Adaptive thresholding creates high-contrast B&W effect
- Makes photos look like professional scans

### ✅ Multi-page PDFs
- Combines multiple images into single PDF
- Preserves existing pages when adding more

### ✅ Student-centric Organization
- Each student has their own folder
- PDFs named by roll number
- Database tracks all uploads

### ✅ Mobile-friendly
- Handles various image formats from phones
- Properly converts color spaces

---

## 🐛 Error Handling

- **Image processing fails**: Returns original image path (skips scanning)
- **No 4-sided contour found**: Uses original image
- **File operations**: Uses `with` statements for proper cleanup

---

## 🚀 Use Cases

1. **Educational Institutions**: Digitizing admission documents
2. **Document Archival**: Converting physical papers to digital
3. **Record Management**: Organizing student files by ID
4. **Mobile Scanning**: Turn phone photos into clean scans

---

## 📝 Database Schema

```sql
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roll_number TEXT,
    filename TEXT,
    upload_date TEXT
);
```

**Example Data**:
| id | roll_number | filename | upload_date |
|----|-------------|----------|-------------|
| 1 | 2024001 | 2024001.pdf | 2026-02-21 23:01:38 |
| 2 | 2024002 | 2024002.pdf | 2026-02-21 23:05:12 |

---

## 🔐 Security Considerations

⚠️ **Current Limitations** (for production deployment):
- No file type validation (accepts any file marked as image)
- No file size limits
- No authentication/authorization
- Debug mode enabled
- No input sanitization for roll numbers

**Recommended Improvements**:
- Add file validation and size limits
- Implement user authentication
- Sanitize roll number input
- Disable debug in production
- Add HTTPS/SSL

---

## 🎓 Educational Value

This project demonstrates:
- **Computer Vision**: Edge detection, contour finding, perspective transformation
- **Web Development**: Flask routing, form handling, file uploads
- **Database Operations**: CRUD operations with SQLite
- **Image Processing**: Format conversion, threshold effects
- **PDF Manipulation**: Merging multiple PDFs
- **File Management**: Temporary file handling, cleanup

---

## 💡 Potential Enhancements

1. **OCR Integration**: Extract text from scanned documents using Tesseract
2. **Document Classification**: Auto-categorize documents (passport, ID, etc.)
3. **Cloud Storage**: Upload to S3/Google Drive instead of local storage
4. **Email Notifications**: Send PDF to student's email
5. **Preview Before Upload**: Show scanned preview in browser
6. **Batch Processing**: Upload for multiple students at once
7. **Download Portal**: Web interface to download PDFs
8. **Quality Metrics**: Detect blurry/low-quality images

---

## 📖 Dependencies

Install with:
```bash
pip install flask opencv-python pillow pypdf2 numpy
```

---

## 🏃 Running the Application

```bash
# Navigate to project folder
cd "IMES FOLDER"

# Activate virtual environment
.\venv\Scripts\activate

# Run the application
python app.py

# Access at: http://localhost:5000
```

---

## 👨‍💻 Developer Notes

- **Windows Compatibility**: Uses `with` statements for safe file closing
- **Color Space**: PIL uses RGB, OpenCV uses BGR - code handles conversion
- **Ratio Preservation**: Maintains aspect ratio during processing
- **Memory Management**: Temp files cleaned up after PDF generation
- **Incremental Updates**: Existing PDFs are extended, not replaced

---

## 📄 License & Credits

**Powered by**: IMES LAB  
**Purpose**: Admission Digital Management System  
**Framework**: Flask + OpenCV + PyPDF2
