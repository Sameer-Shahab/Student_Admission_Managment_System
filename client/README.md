# Frontend - University Document Management System

Next.js 14+ frontend with TypeScript and Tailwind CSS.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your API URL

# Run development server
npm run dev
```

Open http://localhost:3000

## Features

### Dashboard (/)
- System statistics
- Quick action cards
- Department breakdown
- Recent uploads counter

### Upload Page (/upload)
- File upload with drag & drop
- Camera capture
- Real-time preview
- OCR result display

### Students Page (/students)
- Search by ID/name
- Pagination
- Student details modal
- Delete functionality
- Excel export

## API Client

The `lib/api.ts` file provides typed API methods:

```typescript
import { api } from '@/lib/api';

// Upload document
const result = await api.uploadDocument(file);

// Search students
const students = await api.searchStudents('john', 1, 50);

// Export to Excel
const blob = await api.exportToExcel();
```

## Vercel Deployment

```bash
npm run build  # Test build locally
vercel         # Deploy to Vercel
```

Set environment variable in Vercel:
- `NEXT_PUBLIC_API_URL` - Backend API URL

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm start        # Start production server
npm run lint     # Run ESLint
```
