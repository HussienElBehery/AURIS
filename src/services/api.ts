import { User, ChatLog, Evaluation, DashboardStats } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorData.detail || errorData.message || `HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  // Auth endpoints
  auth: {
    login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await handleResponse<{ access_token: string; refresh_token: string; token_type: string; expires_in: number }>(response);
      
      // Extract user info from token or get user profile
      const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` },
      });
      const user = await handleResponse<User>(userResponse);
      
      return { user, token: data.access_token };
    },

    register: async (userData: { name: string; email: string; password: string; role: 'agent' | 'manager' }): Promise<{ user: User; token: string }> => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await handleResponse<{ access_token: string; refresh_token: string; token_type: string; expires_in: number }>(response);
      
      // Extract user info from token or get user profile
      const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` },
      });
      const user = await handleResponse<User>(userResponse);
      
      return { user, token: data.access_token };
    },

    refreshToken: async (): Promise<{ token: string }> => {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new ApiError(401, 'No refresh token available');
      }
      
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const data = await handleResponse<{ access_token: string; refresh_token: string; token_type: string; expires_in: number }>(response);
      
      // Update tokens in localStorage
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      return { token: data.access_token };
    },

    logout: async (): Promise<void> => {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}` 
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    },

    getProfile: async (): Promise<User> => {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      return handleResponse<User>(response);
    },
  },

  // Chat logs (placeholder - not implemented in backend yet)
  chatLogs: {
    getAll: async (filters?: { agentId?: string; dateFrom?: string; dateTo?: string; resolved?: boolean }): Promise<ChatLog[]> => {
      // For now, return empty array since this endpoint doesn't exist yet
      return [];
    },

    getById: async (id: string): Promise<ChatLog> => {
      throw new ApiError(501, 'Chat logs endpoint not implemented yet');
    },

    create: async (chatLog: Omit<ChatLog, 'id'>): Promise<ChatLog> => {
      throw new ApiError(501, 'Chat logs endpoint not implemented yet');
    },

    update: async (id: string, updates: Partial<ChatLog>): Promise<ChatLog> => {
      throw new ApiError(501, 'Chat logs endpoint not implemented yet');
    },
  },

  // Evaluations (placeholder - not implemented in backend yet)
  evaluations: {
    getAll: async (chatLogId?: string): Promise<Evaluation[]> => {
      // For now, return empty array since this endpoint doesn't exist yet
      return [];
    },

    getById: async (id: string): Promise<Evaluation> => {
      throw new ApiError(501, 'Evaluations endpoint not implemented yet');
    },

    create: async (evaluation: Omit<Evaluation, 'id'>): Promise<Evaluation> => {
      throw new ApiError(501, 'Evaluations endpoint not implemented yet');
    },

    update: async (id: string, updates: Partial<Evaluation>): Promise<Evaluation> => {
      throw new ApiError(501, 'Evaluations endpoint not implemented yet');
    },
  },

  // Dashboard stats (placeholder - not implemented in backend yet)
  dashboard: {
    getStats: async (filters?: { agentId?: string; dateFrom?: string; dateTo?: string }): Promise<DashboardStats> => {
      // Return mock data for now
      return {
        avgCoherence: 4.2,
        avgRelevance: 4.5,
        avgPoliteness: 4.3,
        avgResolution: 4.1,
        totalChats: 25,
        unresolvedChats: 3,
        totalEvaluations: 22,
      };
    },
  },

  // Users (using auth endpoints)
  users: {
    getProfile: async (): Promise<User> => {
      return api.auth.getProfile();
    },

    updateProfile: async (updates: Partial<User>): Promise<User> => {
      throw new ApiError(501, 'Profile update not implemented yet');
    },

    getAll: async (): Promise<User[]> => {
      throw new ApiError(501, 'Get all users not implemented yet');
    },
  },
};

export { ApiError }; 