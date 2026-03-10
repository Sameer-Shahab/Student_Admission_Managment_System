# IMES Document Management System - Frontend

## Setup Instructions

### 1. Install Dependencies

```bash
cd client
npm install
```

### 2. Configuration

The `.env.local` file is already configured to connect to the backend at `http://localhost:5000`.

If you need to change the backend URL, edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Run the Development Server

```bash
npm run dev
```

The frontend will start on http://localhost:3000

## Available Pages

- `/login` - Admin login page
- `/` - Dashboard (home page)
- `/upload` - Upload student documents
- `/students` - View and manage student records

## Features

- ✅ Modern Next.js 15 with App Router
- ✅ TypeScript for type safety
- ✅ Tailwind CSS for styling
- ✅ Token-based authentication
- ✅ Document upload with camera support
- ✅ OCR processing integration
- ✅ Student search and filtering
- ✅ Excel export
- ✅ Responsive design
- ✅ Dark theme

## Default Login

- **Username:** admin
- **Password:** ned@admin123

## Development Notes

- The frontend expects the backend to be running on port 5000
- Authentication tokens are stored in localStorage
- CORS is configured on the backend to allow requests from localhost:3000
