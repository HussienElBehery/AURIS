export interface User {
  id: string;
  name: string;
  email: string;
  role: 'agent' | 'manager';
  agentId?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatLog {
  id: string;
  interaction_id: string;
  agent_id?: string;
  agent_persona?: string;
  transcript: TranscriptMessage[];
  status: ProcessingStatus;
  uploaded_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface TranscriptMessage {
  sender: string;
  text: string;
  timestamp?: string;
}

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Message {
  id: string;
  sender: 'agent' | 'customer';
  content: string;
  timestamp: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'video';
  url: string;
  size?: number;
}

export interface Evaluation {
  id: string;
  chatLogId: string;
  coherence?: number;
  relevance?: number;
  politeness?: number;
  resolution?: number;
  reasoning?: {
    coherence?: { score: number; reasoning: string };
    relevance?: { score: number; reasoning: string };
    politeness?: { score: number; reasoning: string };
    resolution?: { score: number; reasoning: string };
  };
  evaluationSummary?: string;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Analysis {
  id: string;
  chatLogId: string;
  guidelines?: GuidelineResult[];
  issues?: string[];
  highlights?: string[];
  analysisSummary?: string;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Recommendation {
  id: string;
  chatLogId: string;
  originalMessage?: string;
  improvedMessage?: string;
  reasoning?: string;
  coachingSuggestions?: string[];
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GuidelineResult {
  name: string;
  passed: boolean;
  description: string;
  category?: 'communication' | 'technical' | 'compliance';
}

export interface DashboardStats {
  avgCoherence: number;
  avgRelevance: number;
  avgPoliteness: number;
  avgResolution: number;
  totalChats: number;
  unresolvedChats: number;
  totalEvaluations: number;
  improvementRate?: number;
  topIssues?: string[];
  agentPerformance?: AgentPerformance[];
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  avgScore: number;
  totalChats: number;
  resolvedChats: number;
  avgResolutionTime: number;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FilterOptions {
  agentId?: string;
  dateFrom?: string;
  dateTo?: string;
  resolved?: boolean;
  channel?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'agent' | 'manager';
}

export interface EvaluationForm {
  chatLogId: string;
  coherence: number;
  relevance: number;
  politeness: number;
  resolution: number;
  reasoning: {
    coherence: string;
    relevance: string;
    politeness: string;
    resolution: string;
  };
  guidelines: GuidelineResult[];
  issues: string[];
  highlights: string[];
  recommendation?: Recommendation;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

// Settings Types
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    evaluationComplete: boolean;
    newChat: boolean;
  };
  dashboard: {
    defaultView: 'overview' | 'analytics' | 'reports';
    refreshInterval: number;
  };
}

// Export/Import Types
export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  dateRange: {
    from: string;
    to: string;
  };
  includeEvaluations: boolean;
  includeMessages: boolean;
}

// Error Types
export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: any;
}