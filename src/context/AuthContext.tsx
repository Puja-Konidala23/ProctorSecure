import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, UserRole } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string, role?: string, adminPin?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  role: UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const initAuth = async () => {
    try {
      const token = api.getToken();
      if (token) {
        const res = await api.getMe();
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn('Session verification failed, requiring fresh login:', err);
      api.clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (identifier: string, password: string, role?: string, adminPin?: string) => {
    setLoading(true);
    try {
      const res = await api.login(identifier, password, role, adminPin);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.logout();
    } catch (err) {
      console.warn('Logout error, clearing local token:', err);
    } finally {
      api.clearToken();
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        role: user?.role || null,
      }}
    >
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
