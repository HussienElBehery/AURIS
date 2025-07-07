export interface User {
  id: string;
  name: string;
  email: string;
  role: 'agent' | 'manager';
  agentId?: string;
  agent_id?: string;
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
  chat_log_id: string;
  agent_id?: string;
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
  evaluation_summary?: string;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Analysis {
  id: string;
  chat_log_id: string;
  agent_id?: string;
  guidelines?: GuidelineResult[];
  issues?: string[];
  highlights?: string[];
  analysis_summary?: string;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SpecificFeedbackItem {
  original_text: string;
  suggested_text: string;
}

export interface Recommendation {
  id: string;
  chat_log_id: string;
  original_message?: string;
  improved_message?: string;
  reasoning?: string;
  coaching_suggestions?: string[];
  error_message?: string;
  created_at?: string;
  updated_at?: string;
  specific_feedback?: SpecificFeedbackItem[];
  long_term_coaching?: string;
  raw_output?: any;
}

export interface GuidelineResult {
  name: string;
  passed: boolean;
  description: string;
  category?: 'communication' | 'technical' | 'compliance';
}

export interface DashboardStats {
  avg_coherence: number;
  avg_relevance: number;
  avg_politeness: number;
  avg_resolution: number;
  total_chats: number;
  unresolved_chats: number;
  total_evaluations: number;
  improvement_rate?: number;
  top_issues?: string[];
  agent_performance?: AgentPerformance[];
}

export interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  avg_score: number;
  total_chats: number;
  resolved_chats: number;
  avg_resolution_time: number;
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