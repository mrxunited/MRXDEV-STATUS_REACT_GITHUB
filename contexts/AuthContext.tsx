
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User } from '../types';
// Import the new auth service functions from the new location
import { login as apiLogin, logout as apiLogout, getCurrentUser as apiGetCurrentUser } from '../services/appwrite'; 

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserSession = async () => {
      setLoading(true);
      try {
        const currentUser = await apiGetCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to fetch current user session", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUserSession();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const loggedInUser = await apiLogin(email, pass);
      setUser(loggedInUser);
    } catch (error) {
      console.error("Login failed:", error);
      setUser(null);
      throw error; // Re-throw to be caught by LoginPage or calling component
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiLogout();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if API logout fails, clear local state
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
