// Use same-origin `/api/*` and rely on `next.config.ts` rewrites to reach the backend.

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface User {
  username: string;
  role: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await fetch(`/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    
    // Store token in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('token_expiry', String(Date.now() + data.expires_in * 1000));
    }
    
    return data;
  },

  async getCurrentUser(): Promise<User> {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return response.json();
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_expiry');
    }
  },

  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    const token = localStorage.getItem('access_token');
    const expiry = localStorage.getItem('token_expiry');
    
    // Check if token is expired
    if (token && expiry) {
      if (Date.now() > parseInt(expiry)) {
        this.logout();
        return null;
      }
    }
    
    return token;
  },

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  },
};
