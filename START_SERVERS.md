# 🚀 Quick Start - Run Both Servers

## Step 1: Start Backend (Terminal 1)

```bash
cd "IMES FOLDER"
python app.py
```

✅ Backend should start on **http://localhost:5000**

---

## Step 2: Start Frontend (Terminal 2)

```bash
cd client
npm run dev
```

✅ Frontend should start on **http://localhost:3000**

---

## Step 3: Access the Application

Open your browser and go to:
### 🌐 http://localhost:3000

---

## 🔑 Login Credentials

- **Username:** `admin`
- **Password:** `ned@admin123`

---

## ⚠️ First Time Setup?

If this is your first time, you need to install dependencies:

### Backend Dependencies
```bash
cd "IMES FOLDER"
python -m pip install -r requirements.txt
```

**Note:** You also need Tesseract OCR installed on your system.
See `SETUP_GUIDE.md` for detailed instructions.

### Frontend Dependencies
```bash
cd client
npm install
```

---

## ✅ Verification

When both servers are running successfully:

1. ✅ Backend terminal shows: "Server is ready! Press CTRL+C to stop"
2. ✅ Frontend terminal shows: "✓ Ready in Xms"
3. ✅ You can access http://localhost:3000
4. ✅ Login page appears
5. ✅ You can login with admin credentials

---

## 🎯 Next Steps After Login

1. **Dashboard** - View statistics and recent uploads
2. **Upload** - Upload student documents (supports camera and file upload)
3. **Students** - View, search, and manage student records
4. **Export** - Download student data as Excel

---

## 🛑 Stop Servers

Press **Ctrl + C** in both terminal windows to stop the servers.
