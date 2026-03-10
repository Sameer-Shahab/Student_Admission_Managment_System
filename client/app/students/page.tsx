'use client';

import { useState, useEffect } from 'react';
import { api, Student, SearchResponse } from '@/lib/api';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';

export default function StudentsPage() {
  const { theme } = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(50);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    loadStudents();
  }, [page, searchQuery]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const response = await api.searchStudents(searchQuery || undefined, page, pageSize);
      setStudents(response.students);
      setTotal(response.total);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student record?')) {
      return;
    }

    try {
      await api.deleteStudent(id);
      loadStudents();
      setSelectedStudent(null);
    } catch (error) {
      alert('Failed to delete student');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportToExcel(searchQuery || undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students_export_${new Date().getTime()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Export failed');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3">
        <h1 className={`text-2xl md:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Student Records</h1>
        <button
          onClick={handleExport}
          className="bg-[#f9a470] text-white px-4 py-2 rounded-lg hover:bg-[#bc556f] transition flex items-center space-x-2"
        >
          <span>📊</span>
          <span>Export to Excel</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className={`rounded-lg shadow-md p-4 mb-4 md:mb-6 border ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex space-x-3">
          <input
            type="text"
            placeholder="Search by Student ID or Name..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => handleSearch('')}
            className="px-3 md:px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition text-sm md:text-base"
          >
            Clear
          </button>
        </div>
        <div className="mt-2 text-xs md:text-sm text-gray-400">
          Found {total} student{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Students List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-300 mt-4">Loading students...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-md p-8 md:p-12 text-center">
          <div className="text-5xl md:text-6xl mb-4">📭</div>
          <h3 className="text-lg md:text-xl font-semibold text-white mb-2">No Students Found</h3>
          <p className="text-gray-400 mb-6 text-sm md:text-base">
            {searchQuery
              ? 'Try a different search query'
              : 'Upload documents to get started'}
          </p>
          <Link
            href="/upload"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Upload Document
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 mb-6">
            {students.map((student) => (
              <div
                key={student.id}
                className="bg-gray-800 border border-gray-700 rounded-lg shadow-md p-4 hover:shadow-lg hover:border-[#f9a470] transition cursor-pointer"
                onClick={() => setSelectedStudent(student)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-base md:text-lg font-semibold text-white">
                        {student.full_name}
                      </h3>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {student.student_id}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs md:text-sm text-gray-400">
                      {student.email && (
                        <div>📧 {student.email}</div>
                      )}
                      {student.phone && (
                        <div>📱 {student.phone}</div>
                      )}
                      {student.department && (
                        <div>🏢 {student.department}</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(student.id);
                    }}
                    className="ml-4 text-red-600 hover:text-red-800 transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-gray-300">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-700">
                <h2 className="text-xl md:text-2xl font-bold text-white">Student Details</h2>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-gray-400 hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs md:text-sm font-semibold text-gray-400">Student ID</label>
                    <p className="text-gray-200">{selectedStudent.student_id}</p>
                  </div>
                  <div>
                    <label className="text-xs md:text-sm font-semibold text-gray-400">Full Name</label>
                    <p className="text-gray-200">{selectedStudent.full_name}</p>
                  </div>
                  {selectedStudent.email && (
                    <div>
                      <label className="text-xs md:text-sm font-semibold text-gray-400">Email</label>
                      <p className="text-gray-200">{selectedStudent.email}</p>
                    </div>
                  )}
                  {selectedStudent.phone && (
                    <div>
                      <label className="text-xs md:text-sm font-semibold text-gray-400">Phone</label>
                      <p className="text-gray-200">{selectedStudent.phone}</p>
                    </div>
                  )}
                  {selectedStudent.department && (
                    <div>
                      <label className="text-xs md:text-sm font-semibold text-gray-400">Department</label>
                      <p className="text-gray-200">{selectedStudent.department}</p>
                    </div>
                  )}
                  {selectedStudent.program && (
                    <div>
                      <label className="text-xs md:text-sm font-semibold text-gray-400">Program</label>
                      <p className="text-gray-200">{selectedStudent.program}</p>
                    </div>
                  )}
                  {selectedStudent.year_of_study && (
                    <div>
                      <label className="text-xs md:text-sm font-semibold text-gray-400">Year of Study</label>
                      <p className="text-gray-200">{selectedStudent.year_of_study}</p>
                    </div>
                  )}
                </div>

                {selectedStudent.extracted_text && (
                  <div>
                    <label className="text-xs md:text-sm font-semibold text-gray-400">Extracted Text</label>
                    <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200 text-sm">
                      {selectedStudent.extracted_text}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  <p>Created: {new Date(selectedStudent.created_at).toLocaleString()}</p>
                  <p>Updated: {new Date(selectedStudent.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
