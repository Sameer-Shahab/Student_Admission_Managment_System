import { authService } from './auth';

// Use same-origin `/api/*` and rely on `next.config.ts` rewrites to reach the backend.

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = authService.getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export interface Student {
  id: number;
  student_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  department?: string;
  program?: string;
  year_of_study?: string;
  document_type?: string;
  extracted_text?: string;
  original_image_path?: string;
  photo_path?: string;
  processed_image_path?: string;
  created_at: string;
  updated_at: string;
}

export interface SearchResponse {
  total: number;
  page: number;
  page_size: number;
  students: Student[];
}

export interface UploadResponse {
  success: boolean;
  message: string;
  student?: Student;
  ocr_result?: {
    success: boolean;
    extracted_text?: string;
    student_data?: Record<string, any>;
    photo_extracted: boolean;
    error?: string;
  };
}

export interface Statistics {
  total_students: number;
  recent_uploads: number;
  departments: Array<{ name: string; count: number }>;
}

export const api = {
  async uploadDocument(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`/api/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  },

  async searchStudents(query?: string, page = 1, pageSize = 50): Promise<SearchResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    if (query) {
      params.append('query', query);
    }

    try {
      const response = await fetch(`/api/students?${params}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Cannot connect to backend server');
        return {
          total: 0,
          page: page,
          page_size: pageSize,
          students: [],
        };
      }
      throw error;
    }
  },

  async getStudent(id: number): Promise<Student> {
    const response = await fetch(`/api/students/${id}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch student');
    }

    return response.json();
  },

  async updateStudent(id: number, data: Partial<Student>): Promise<Student> {
    const response = await fetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update student');
    }

    return response.json();
  },

  async deleteStudent(id: number): Promise<void> {
    const response = await fetch(`/api/students/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete student');
    }
  },

  async exportToExcel(query?: string): Promise<Blob> {
    const params = new URLSearchParams();
    if (query) {
      params.append('query', query);
    }

    const response = await fetch(`/api/export/excel?${params}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to export data');
    }

    return response.blob();
  },

  async getStatistics(): Promise<Statistics> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`/api/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Statistics fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch statistics: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Cannot connect to backend server');
        console.error('Please start the backend server with: cd server && python app.py');
        // Return default values when backend is not available
        return {
          total_students: 0,
          recent_uploads: 0,
          departments: [],
        };
      }
      throw error;
    }
  },

  getFileUrl(studentId: string, filename: string): string {
    return `/api/files/${studentId}/${filename}`;
  },
};
