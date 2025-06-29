import { User, ChatLog, Evaluation, Analysis, Recommendation, DashboardStats, ProcessingStatus } from '../types';

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

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Check if we're in demo mode
function isDemoMode(): boolean {
  return localStorage.getItem('token') === 'demo-token';
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
      
      // Store refresh token
      localStorage.setItem('refresh_token', data.refresh_token);
      
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
      
      // Store refresh token
      localStorage.setItem('refresh_token', data.refresh_token);
      
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
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
        } catch (error) {
          // Ignore logout errors
          console.warn('Logout API call failed:', error);
        }
      }
    },

    getProfile: async (): Promise<User> => {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      return handleResponse<User>(response);
    },
  },

  // Chat logs endpoints
  chatLogs: {
    getAll: async (): Promise<ChatLog[]> => {
      // Return mock data for demo mode
      if (isDemoMode()) {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve([
              {
                id: '1',
                interactionId: 'INT-001',
                agentId: 'agent-1',
                agentPersona: 'Customer Support Agent',
                transcript: [
                  { sender: 'customer', text: 'Hello, I need help with my order.' },
                  { sender: 'agent', text: 'Hi! I\'d be happy to help you with your order.' }
                ],
                status: 'completed' as ProcessingStatus,
                uploadedBy: '1',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            ]);
          }, 500);
        });
      }

      const response = await fetch(`${API_BASE_URL}/chat-logs`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<ChatLog[]>(response);
    },

    getById: async (id: string): Promise<ChatLog> => {
      const response = await fetch(`${API_BASE_URL}/chat-logs/${id}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<ChatLog>(response);
    },

    upload: async (file: File): Promise<ChatLog> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_BASE_URL}/chat-logs/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      return handleResponse<ChatLog>(response);
    },

    process: async (chatLogId: string): Promise<{ message: string }> => {
      const response = await fetch(`${API_BASE_URL}/chat-logs/${chatLogId}/process`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse<{ message: string }>(response);
    },

    getStatus: async (chatLogId: string): Promise<{
      chat_log_id: string;
      status: ProcessingStatus;
      progress: Record<string, string>;
      error_messages: Record<string, string>;
    }> => {
      const response = await fetch(`${API_BASE_URL}/chat-logs/${chatLogId}/status`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<{
        chat_log_id: string;
        status: ProcessingStatus;
        progress: Record<string, string>;
        error_messages: Record<string, string>;
      }>(response);
    },
  },

  // Evaluation endpoints
  evaluations: {
    getByChatLogId: async (chatLogId: string): Promise<Evaluation> => {
      const response = await fetch(`${API_BASE_URL}/chat-logs/${chatLogId}/evaluation`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Evaluation>(response);
    },
  },

  // Analysis endpoints
  analysis: {
    getByChatLogId: async (chatLogId: string): Promise<Analysis> => {
      const response = await fetch(`${API_BASE_URL}/chat-logs/${chatLogId}/analysis`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Analysis>(response);
    },
  },

  // Recommendation endpoints
  recommendations: {
    getByChatLogId: async (chatLogId: string): Promise<Recommendation> => {
      const response = await fetch(`${API_BASE_URL}/chat-logs/${chatLogId}/recommendation`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Recommendation>(response);
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

  // Models endpoints
  models: {
    getStatus: async (): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/status`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<any>(response);
    },

    getProgress: async (): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/progress`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<any>(response);
    },

    loadBaseModel: async (modelName: string): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/load`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelName }),
      });
      return handleResponse<any>(response);
    },

    testGeneration: async (adapterName?: string): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/test-generation`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ adapter_name: adapterName }),
      });
      return handleResponse<any>(response);
    },

    installBase: async (): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/install/base`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse<any>(response);
    },

    installAdapters: async (): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/install/adapters`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse<any>(response);
    },

    installAll: async (): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/install/all`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse<any>(response);
    },

    testLoading: async (): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/test`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<any>(response);
    },

    cleanupCache: async (): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/cache`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse<any>(response);
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