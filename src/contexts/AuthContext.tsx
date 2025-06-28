import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: { name: string; email: string; password: string; role: 'agent' | 'manager' }) => Promise<boolean>;
  demoLogin: (role: 'agent' | 'manager') => void;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fallback mock users for demo mode
const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    role: 'agent'
  },
  {
    id: '2', 
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    role: 'manager'
  }
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('auris_user');
      
      if (token && savedUser) {
        try {
          // Verify token is still valid by fetching user profile
          const userProfile = await api.auth.getProfile();
          setUser(userProfile);
        } catch (error) {
          // Token is invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('auris_user');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { user: userData, token } = await api.auth.login(email, password);
      setUser(userData);
      localStorage.setItem('token', token);
      localStorage.setItem('auris_user', JSON.stringify(userData));
      setIsLoading(false);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  };

  const register = async (userData: { name: string; email: string; password: string; role: 'agent' | 'manager' }): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { user: newUser, token } = await api.auth.register(userData);
      setUser(newUser);
      localStorage.setItem('token', token);
      localStorage.setItem('auris_user', JSON.stringify(newUser));
      setIsLoading(false);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  };

  const demoLogin = (role: 'agent' | 'manager') => {
    const demoUser = MOCK_USERS.find(u => u.role === role);
    if (demoUser) {
      setUser(demoUser);
      localStorage.setItem('auris_user', JSON.stringify(demoUser));
      // Set a demo token for consistency
      localStorage.setItem('token', 'demo-token');
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      // Ignore logout errors
    }
    setUser(null);
    setError(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auris_user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      demoLogin, 
      logout, 
      isLoading, 
      error 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}