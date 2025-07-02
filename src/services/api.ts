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

function mapAnalysisResponse(data: any): Analysis {
  // Check function for debugging
  console.log('--- mapAnalysisResponse Check ---');
  console.log('raw data:', data);
  const mapped = {
    id: data.id,
    chatLogId: data.chat_log_id,
    agentId: data.agent_id,
    guidelines: data.guidelines,
    issues: data.issues,
    highlights: data.highlights,
    analysisSummary: data.analysis_summary,
    errorMessage: data.error_message,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
  console.log('mapped analysis:', mapped);
  console.log('-------------------------------');
  return mapped;
}

// Add a helper to check token expiry (JWT exp claim)
function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload));
    if (!decoded.exp) return false;
    return Date.now() / 1000 > decoded.exp - 60; // Consider expired 1 min before
  } catch {
    return true;
  }
}

// Wrap fetch to handle auto-refresh
async function fetchWithAuthRetry(input: RequestInfo, init: RequestInit = {}, retry = true): Promise<Response> {
  let token = localStorage.getItem('token');
  if (isTokenExpired(token)) {
    try {
      const refreshed = await api.auth.refreshToken();
      token = refreshed.token;
    } catch {
      // Refresh failed, log out
      await api.auth.logout();
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
  }
  const headers = { ...(init.headers || {}), Authorization: `Bearer ${token}` };
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && retry) {
    // Try refresh once more
    try {
      const refreshed = await api.auth.refreshToken();
      token = refreshed.token;
      const retryHeaders = { ...(init.headers || {}), Authorization: `Bearer ${token}` };
      return await fetch(input, { ...init, headers: retryHeaders });
    } catch {
      await api.auth.logout();
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
  }
  return response;
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
      const response = await fetchWithAuthRetry(`${API_BASE_URL}/chat-logs/`);
      return handleResponse<ChatLog[]>(response);
    },

    getById: async (chatLogId: string): Promise<ChatLog> => {
      const response = await fetchWithAuthRetry(`${API_BASE_URL}/chat-logs/${chatLogId}`);
      return handleResponse<ChatLog>(response);
    },

    getEvaluation: async (chatLogId: string): Promise<Evaluation> => {
      const response = await fetchWithAuthRetry(`${API_BASE_URL}/chat-logs/${chatLogId}/evaluation`);
      return handleResponse<Evaluation>(response);
    },

    upload: async (file: File): Promise<ChatLog> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetchWithAuthRetry(`${API_BASE_URL}/chat-logs/upload`, {
        method: 'POST',
        body: formData,
      });
      return handleResponse<ChatLog>(response);
    },

    process: async (chatLogId: string): Promise<{ message: string }> => {
      const response = await fetchWithAuthRetry(`${API_BASE_URL}/chat-logs/${chatLogId}/process`, {
        method: 'POST',
      });
      return handleResponse<{ message: string }>(response);
    },

    getStatus: async (chatLogId: string): Promise<{
      chat_log_id: string;
      status: ProcessingStatus;
      progress: Record<string, string>;
      error_messages: Record<string, string>;
      details?: Record<string, any>;
    }> => {
      const response = await fetchWithAuthRetry(`${API_BASE_URL}/chat-logs/${chatLogId}/status`);
      return handleResponse<{
        chat_log_id: string;
        status: ProcessingStatus;
        progress: Record<string, string>;
        error_messages: Record<string, string>;
        details?: Record<string, any>;
      }>(response);
    },

    assignAgent: async (chatLogId: string, agentId: string, agentPersona?: string): Promise<{ message: string }> => {
      const response = await fetch(`${API_BASE_URL}/chat-logs/${chatLogId}/assign-agent`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agent_id: agentId, agent_persona: agentPersona }),
      });
      return handleResponse<{ message: string }>(response);
    },

    delete: async (chatLogId: string): Promise<{ message: string }> => {
      const response = await fetch(`${API_BASE_URL}/chat-logs/${chatLogId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse<{ message: string }>(response);
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

    getByAgentId: async (agentId: string): Promise<Evaluation[]> => {
      const response = await fetch(`${API_BASE_URL}/chat-logs/evaluations/by-agent/${agentId}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Evaluation[]>(response);
    },

    getAll: async (): Promise<Evaluation[]> => {
      const response = await fetch(`${API_BASE_URL}/chat-logs/evaluations/all`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Evaluation[]>(response);
    },
  },

  // Analysis endpoints
  analysis: {
    getByChatLogId: async (chatLogId: string, agentId?: string): Promise<Analysis> => {
      let url = `${API_BASE_URL}/chat-logs/${chatLogId}/analysis`;
      if (agentId) url += `?agent_id=${encodeURIComponent(agentId)}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const data = await handleResponse<any>(response);
      return mapAnalysisResponse(data);
    },

    getByAgentId: async (agentId: string): Promise<Analysis[]> => {
      const response = await fetch(`${API_BASE_URL}/chat-logs/analyses/by-agent/${agentId}`, {
        headers: getAuthHeaders(),
      });
      const data = await handleResponse<any[]>(response);
      return data.map(mapAnalysisResponse);
    },

    getAll: async (): Promise<Analysis[]> => {
      const response = await fetch(`${API_BASE_URL}/chat-logs/analyses/all`, {
        headers: getAuthHeaders(),
      });
      const data = await handleResponse<any[]>(response);
      return data.map(mapAnalysisResponse);
    },

    reanalyze: async (chatLogId: string): Promise<Analysis> => {
      const response = await fetch(`${API_BASE_URL}/chat-logs/${chatLogId}/reanalyze-analysis`, {
        method: 'POST',
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

    getList: async (): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/list`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<any>(response);
    },

    getSystemInfo: async (): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/system-info`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<any>(response);
    },

    getAvailableModels: async (): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/available`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<any>(response);
    },

    loadModel: async (modelName: string): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/load`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelName }),
      });
      return handleResponse<any>(response);
    },

    unloadModel: async (): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/unload`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      });
      return handleResponse<any>(response);
    },

    testGeneration: async (modelName: string, prompt?: string): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/test-generation`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model_name: modelName,
          prompt: prompt || "Hello, how are you today?"
        }),
      });
      return handleResponse<any>(response);
    },

    pullModel: async (modelName: string): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/pull`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelName }),
      });
      return handleResponse<any>(response);
    },

    checkHealth: async (): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/health`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<any>(response);
    },

    stopModel: async (modelName: string): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/stop`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelName }),
      });
      return handleResponse<any>(response);
    },

    setDefaultModel: async (modelName: string): Promise<any> => {
      const response = await fetch(`${API_BASE_URL}/models/set-default/${modelName}`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
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