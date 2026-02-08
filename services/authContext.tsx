import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { GOOGLE_CLIENT_ID, MOCK_USER } from '../constants';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('iftar_user_session');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = () => {
    setIsLoading(true);
    // Simulation of Google Auth Flow
    // In a real implementation with a valid Client ID, you would initialize window.google.accounts.id.initialize
    setTimeout(() => {
      setUser(MOCK_USER);
      localStorage.setItem('iftar_user_session', JSON.stringify(MOCK_USER));
      setIsLoading(false);
    }, 800);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('iftar_user_session');
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