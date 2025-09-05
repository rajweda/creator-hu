import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { getToken, removeToken } from '../auth';

// API Configuration
const API_BASE_URL = 'http://localhost:4000';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, remove it and redirect to login
      removeToken();
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// API Response Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

// User Types
export interface User {
  id: string;
  name: string;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  name: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  password: string;
  displayName?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Content Types
export interface Content {
  id: string;
  title: string;
  body: string;
  authorId: string;
  author?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentRequest {
  title: string;
  body: string;
}

export interface UpdateContentRequest {
  title?: string;
  body?: string;
}

// API Service Class
class ApiService {
  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/users/login', credentials);
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/users/register', userData);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/api/users/me');
    return response.data;
  }

  // Content endpoints
  async getContents(): Promise<Content[]> {
    const response = await apiClient.get<Content[]>('/api/contents');
    return response.data;
  }

  async getContent(id: string): Promise<Content> {
    const response = await apiClient.get<Content>(`/api/contents/${id}`);
    return response.data;
  }

  async createContent(contentData: CreateContentRequest): Promise<Content> {
    const response = await apiClient.post<Content>('/api/contents', contentData);
    return response.data;
  }

  async updateContent(id: string, contentData: UpdateContentRequest): Promise<Content> {
    const response = await apiClient.put<Content>(`/api/contents/${id}`, contentData);
    return response.data;
  }

  async deleteContent(id: string): Promise<void> {
    await apiClient.delete(`/api/contents/${id}`);
  }

  // File upload endpoint
  async uploadFile(file: File): Promise<{ filename: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Generic HTTP methods
  async get<T = any>(url: string): Promise<T> {
    const response = await apiClient.get<T>(url);
    return response.data;
  }

  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await apiClient.post<T>(url, data);
    return response.data;
  }

  async put<T = any>(url: string, data?: any): Promise<T> {
    const response = await apiClient.put<T>(url, data);
    return response.data;
  }

  async delete<T = any>(url: string): Promise<T> {
    const response = await apiClient.delete<T>(url);
    return response.data;
  }
}

// Export singleton instance
export const api = new ApiService();
export default apiClient;