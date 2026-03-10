'use client';

import { useEffect, useState } from 'react';
import { api, Statistics } from '@/lib/api';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';

export default function Home() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Check if user is authenticated before fetching stats
      const token = localStorage.getItem('access_token');
      if (!token) {
        // If not authenticated, just stop loading - no error
        setLoading(false);
        return;
      }

      const data = await api.getStatistics();
      setStats(data);
      setLoading(false);
    } catch (error: any) {
      // Silently handle authentication errors
      if (error.message?.includes('Not authenticated') || error.message?.includes('401')) {
        console.log('User not authenticated - statistics unavailable');
      } else {
        console.error('Error loading statistics:', error);
      }
      setStats(null);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Welcome Header */}
      <div className="mb-6 md:mb-8 bg-gradient-to-r from-[#f9a470] to-[#bc556f] rounded-xl md:rounded-2xl p-6 md:p-8 text-white shadow-lg">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 md:mb-3">
          Welcome to NED University
        </h1>
        <p className="text-white/90 text-base md:text-lg">
          Document Management System - Secure, Fast & Efficient
        </p>
        <p className="text-white/80 text-xs md:text-sm mt-2">
          Manage student documents with automated OCR extraction and photo detection
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <Link href="/upload">
          <div className={`group rounded-xl shadow-md p-5 md:p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 transform hover:-translate-y-1 ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700 hover:border-[#f9a470]' 
              : 'bg-white border-gray-200 hover:border-[#f9a470]'
          }`}>
            <div className={`bg-gradient-to-br rounded-lg p-3 md:p-4 w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform ${
              theme === 'dark' ? 'from-[#f9a470]/20 to-[#bc556f]/20' : 'from-[#f9a470]/10 to-[#f9a470]/20'
            }`}>
              <svg className={`w-7 h-7 md:w-8 md:h-8 ${theme === 'dark' ? 'text-[#f9a470]' : 'text-[#f9a470]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className={`text-lg md:text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Upload Documents</h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Upload student ID cards and forms with OCR</p>
          </div>
        </Link>

        <Link href="/students">
          <div className={`group rounded-xl shadow-md p-5 md:p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 transform hover:-translate-y-1 ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700 hover:border-blue-500' 
              : 'bg-white border-gray-200 hover:border-blue-500'
          }`}>
            <div className={`bg-gradient-to-br rounded-lg p-3 md:p-4 w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform ${
              theme === 'dark' ? 'from-blue-600/20 to-indigo-600/20' : 'from-blue-50 to-indigo-50'
            }`}>
              <svg className={`w-7 h-7 md:w-8 md:h-8 ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className={`text-lg md:text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>View Students</h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Search and manage student records</p>
          </div>
        </Link>

        <div
          onClick={async () => {
            try {
              const blob = await api.exportToExcel();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `ned_students_${new Date().getTime()}.xlsx`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            } catch (error) {
              alert('Error exporting data');
            }
          }}
          className={`group rounded-xl shadow-md p-5 md:p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 transform hover:-translate-y-1 ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700 hover:border-orange-600' 
              : 'bg-white border-gray-200 hover:border-orange-500'
          }`}
        >
          <div className={`bg-gradient-to-br rounded-lg p-3 md:p-4 w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform ${
            theme === 'dark' ? 'from-[#f9a470]/20 to-[#bc556f]/20' : 'from-[#f9a470]/10 to-[#f9a470]/20'
          }`}>
            <svg className={`w-7 h-7 md:w-8 md:h-8 ${theme === 'dark' ? 'text-[#f9a470]' : 'text-[#f9a470]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className={`text-lg md:text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Export to Excel</h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Download all student data as spreadsheet</p>
        </div>
      </div>

      {/* Statistics */}
      <div className={`rounded-xl shadow-lg p-5 md:p-8 border ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center ${
          theme === 'dark' ? 'text-white' : 'text-gray-800'
        }`}>
          <svg className={`w-6 h-6 md:w-7 md:h-7 mr-2 md:mr-3 ${theme === 'dark' ? 'text-[#f9a470]' : 'text-[#f9a470]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          System Statistics
        </h2>

        {loading ? (
          <div className="text-center py-8 md:py-12">
            <div className={`inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full mb-4 ${
              theme === 'dark' ? 'bg-[#f9a470]/30' : 'bg-[#f9a470]/10'
            }`}>
              <div className={`animate-spin rounded-full h-8 w-8 md:h-10 md:w-10 border-4 ${
                theme === 'dark' ? 'border-[#f9a470]/30 border-t-[#f9a470]' : 'border-[#f9a470]/20 border-t-[#f9a470]'
              }`}></div>
            </div>
            <p className={`font-medium text-sm md:text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Loading statistics...</p>
          </div>
        ) : stats ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
              <div className={`rounded-xl p-5 md:p-6 border ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-[#f9a470]/40 to-[#bc556f]/40 border-[#f9a470]/50' 
                  : 'bg-gradient-to-br from-[#f9a470]/10 to-[#f9a470]/20 border-[#f9a470]/30'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-3xl md:text-4xl font-bold ${theme === 'dark' ? 'text-[#f9a470]' : 'text-[#f9a470]'}`}>
                    {stats.total_students}
                  </div>
                  <div className={`p-2 md:p-3 rounded-lg ${theme === 'dark' ? 'bg-[#f9a470]/30' : 'bg-[#f9a470]/20'}`}>
                    <svg className={`w-5 h-5 md:w-6 md:h-6 ${theme === 'dark' ? 'text-[#f9a470]' : 'text-[#f9a470]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className={`font-semibold text-sm md:text-base ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Total Students</div>
                <div className={`text-xs md:text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Registered in system</div>
              </div>

              <div className={`rounded-xl p-5 md:p-6 border ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-blue-700/50' 
                  : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-3xl md:text-4xl font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                    {stats.recent_uploads}
                  </div>
                  <div className={`p-2 md:p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-700/30' : 'bg-blue-200'}`}>
                    <svg className={`w-5 h-5 md:w-6 md:h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                </div>
                <div className={`font-semibold text-sm md:text-base ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Recent Uploads</div>
                <div className={`text-xs md:text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Last 7 days</div>
              </div>
            </div>

            {stats.departments.length > 0 && (
              <div className={`rounded-xl p-5 md:p-6 border ${
                theme === 'dark' ? 'bg-gray-900/50 border-gray-700/50' : 'bg-gray-50 border-gray-200'
              }`}>
                <h3 className={`text-lg md:text-xl font-bold mb-3 md:mb-4 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>Students by Department</h3>
                <div className="space-y-3 md:space-y-4">
                  {stats.departments.map((dept, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className={`font-medium flex-shrink-0 w-32 md:w-40 text-sm md:text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{dept.name}</span>
                      <div className="flex items-center space-x-2 md:space-x-3 flex-1">
                        <div className={`rounded-full h-2.5 md:h-3 flex-1 overflow-hidden ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <div
                            className="bg-gradient-to-r from-[#f9a470] to-[#bc556f] h-2.5 md:h-3 rounded-full transition-all duration-500"
                            style={{
                              width: `${(dept.count / stats.total_students) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <span className={`font-bold w-10 md:w-12 text-right text-sm md:text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {dept.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : !stats ? (
          <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <div className="mb-4 text-4xl">🔒</div>
            <p className="text-base md:text-lg font-semibold mb-2">Statistics Unavailable</p>
            <p className="text-sm md:text-base">Please log in to view system statistics.</p>
          </div>
        ) : null}
      </div>

      {/* Features */}
      <div className="mt-6 md:mt-8 bg-gradient-to-br from-[#f9a470] via-[#bc556f] to-[#a04458] rounded-xl md:rounded-2xl shadow-2xl p-6 md:p-8 text-white">
        <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 flex items-center">
          <svg className="w-7 h-7 md:w-8 md:h-8 mr-2 md:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          Key Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 hover:bg-white/20 transition">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="font-bold text-base md:text-lg">OCR Text Extraction</h4>
            </div>
            <p className="text-white/90 text-xs md:text-sm">Automatically extract student information from documents</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 hover:bg-white/20 transition">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-lg">Photo Detection</h4>
            </div>
            <p className="text-white/90 text-xs md:text-sm">Extract and save student photos from ID cards</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 hover:bg-white/20 transition">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-lg">Smart Search</h4>
            </div>
            <p className="text-white/90 text-xs md:text-sm">Find students instantly by ID or name</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 hover:bg-white/20 transition">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <h4 className="font-bold text-lg">Secure Database</h4>
            </div>
            <p className="text-white/90 text-xs md:text-sm">PostgreSQL for reliable and secure data storage</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 hover:bg-white/20 transition">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="font-bold text-lg">Excel Export</h4>
            </div>
            <p className="text-white/90 text-xs md:text-sm">Download formatted spreadsheets with one click</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 hover:bg-white/20 transition">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-bold text-lg">Fast Performance</h4>
            </div>
            <p className="text-white/90 text-xs md:text-sm">Handle 5000+ students with optimized queries</p>
          </div>
        </div>
      </div>
    </div>
  );
}
