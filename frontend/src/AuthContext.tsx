import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { setToken, getToken, removeToken } from "./auth";
import { api, User, LoginRequest, RegisterRequest } from "./services/api";

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = getToken();
      if (storedToken) {
        setTokenState(storedToken);
        try {
          const userData = await api.getCurrentUser();
          setUser(userData);
        } catch (error) {
          // Token is invalid, remove it
          removeToken();
          setTokenState(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    setLoading(true);
    try {
      const response = await api.login(credentials);
      setToken(response.token);
      setTokenState(response.token);
      setUser(response.user);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterRequest) => {
    setLoading(true);
    try {
      const response = await api.register(userData);
      setToken(response.token);
      setTokenState(response.token);
      setUser(response.user);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeToken();
    setTokenState(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const userData = await api.getCurrentUser();
        setUser(userData);
      } catch (error) {
        logout();
      }
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}