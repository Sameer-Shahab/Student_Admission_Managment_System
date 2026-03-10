import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const isLoginPage = request.nextUrl.pathname === '/login';
  
  // Check localStorage token (client-side only)
  // For server-side, we'll rely on the app to redirect
  
  if (!isLoginPage && request.nextUrl.pathname !== '/login') {
    // Protected routes - will be handled by client-side auth check
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
