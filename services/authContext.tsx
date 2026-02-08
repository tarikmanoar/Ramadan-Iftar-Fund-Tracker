import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { GOOGLE_CLIENT_ID } from '../constants';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('iftar_user_session');
    const sessionToken = localStorage.getItem('iftar_session_token');
    
    if (storedUser && sessionToken) {
      setUser(JSON.parse(storedUser));
      setIsLoading(false);
      return;
    }

    // Handle OAuth callback - but only once
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && !isProcessingCallback) {
      // Immediately clear the URL to prevent re-execution
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsProcessingCallback(true);
      handleOAuthCallback(code);
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleOAuthCallback = async (code: string) => {
    setIsLoading(true);
    try {
      console.log('Calling OAuth callback with code:', code);
      const url = `${API_BASE_URL}/api/auth/callback?code=${code}`;
      console.log('Fetching:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Authentication failed:', errorData);
        alert(`Authentication failed: ${JSON.stringify(errorData)}`);
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      console.log('Authentication successful:', data);
      
      setUser(data.user);
      localStorage.setItem('iftar_user_session', JSON.stringify(data.user));
      localStorage.setItem('iftar_session_token', data.sessionId);

      // Success - reload to dashboard
      window.location.href = '/';
    } catch (error) {
      console.error('OAuth callback error:', error);
      if (error instanceof Error) {
        alert(`OAuth Error: ${error.message}\n\nCheck console for details. API URL: ${API_BASE_URL}`);
      } else {
        alert(`Failed to connect to API at ${API_BASE_URL}\n\nMake sure both servers are running:\n- Frontend: npm run dev\n- Worker: npm run dev:worker`);
      }
      // On error, redirect to home
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } finally {
      setIsLoading(false);
      setIsProcessingCallback(false);
    }
  };

  const login = () => {
    // Redirect to Google OAuth
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = 'email profile';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
    
    window.location.href = authUrl;
  };

  const logout = async () => {
    const sessionToken = localStorage.getItem('iftar_session_token');
    
    if (sessionToken) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    setUser(null);
    localStorage.removeItem('iftar_user_session');
    localStorage.removeItem('iftar_session_token');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};