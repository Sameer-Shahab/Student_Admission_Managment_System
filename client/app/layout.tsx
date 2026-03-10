'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/lib/auth";
import AuthGuard from "@/components/AuthGuard";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

const inter = Inter({ subsets: ["latin"] });

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  return (
    <>
      <AuthGuard>
          {!isLoginPage && (
            <nav className="bg-gradient-to-r from-[#f9a470] to-[#bc556f] text-white shadow-lg sticky top-0 z-50">
              <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                  <Link href="/" className="flex items-center space-x-2 md:space-x-3 hover:opacity-90 transition">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-base md:text-lg font-bold">NED University</div>
                      <div className="text-xs opacity-90">Document Management</div>
                    </div>
                  </Link>
                  <div className="flex items-center space-x-2 md:space-x-4 lg:space-x-6">
                    <Link 
                      href="/" 
                      className={`hover:bg-white/10 px-2 md:px-3 py-2 rounded-lg transition text-sm md:text-base ${pathname === '/' ? 'bg-white/20' : ''}`}
                    >
                      <span>Dashboard</span>
                    </Link>
                    <Link 
                      href="/upload" 
                      className={`hover:bg-white/10 px-2 md:px-3 py-2 rounded-lg transition text-sm md:text-base ${pathname === '/upload' ? 'bg-white/20' : ''}`}
                    >
                      <span>Upload</span>
                    </Link>
                    <Link 
                      href="/students" 
                      className={`hover:bg-white/10 px-2 md:px-3 py-2 rounded-lg transition text-sm md:text-base ${pathname === '/students' ? 'bg-white/20' : ''}`}
                    >
                      <span>Students</span>
                    </Link>
                    <button
                      onClick={toggleTheme}
                      className="hover:bg-white/10 px-2 md:px-3 py-2 rounded-lg transition text-sm md:text-base font-medium"
                      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                      {theme === 'dark' ? 'Light' : 'Dark'}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-1 md:space-x-2 bg-red-500/90 hover:bg-red-600 px-2 md:px-4 py-2 rounded-lg transition font-medium text-sm md:text-base"
                    >
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="hidden md:inline">Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            </nav>
          )}
          <main className={`min-h-screen transition-colors duration-300 ${isLoginPage ? '' : theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50'}`}>
            {children}
          </main>
          {!isLoginPage && (
            <footer className="bg-gradient-to-r from-[#f9a470]/90 via-[#bc556f]/80 to-[#f9a470]/90 backdrop-blur-sm text-white py-8 border-t border-[#bc556f]/50">
              <div className="container mx-auto px-4">
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">NED University of Engineering & Technology</h3>
                  <p className="text-orange-100 text-sm mb-1">University Road, Karachi, Pakistan</p>
                  <p className="text-orange-200/70 text-xs mt-4">&copy; Devbyzain. All rights reserved.</p>
                </div>
              </div>
            </footer>
          )}
        </AuthGuard>
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <LayoutContent>{children}</LayoutContent>
        </ThemeProvider>
      </body>
    </html>
  );
}
