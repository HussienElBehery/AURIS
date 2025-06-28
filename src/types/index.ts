export interface User {
  id: string;
  name: string;
  email: string;
  role: 'agent' | 'manager';
  avatar?: string;
}

export interface ChatLog {
  id: string;
  agentId: string;
  agentName: string;
  date: string;
  resolved: boolean;
  messages: Message[];
  evaluation?: Evaluation;
}

export interface Message {
  id: string;
  sender: 'agent' | 'customer';
  content: string;
  timestamp: string;
}

export interface Evaluation {
  id: string;
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

export interface GuidelineResult {
  name: string;
  passed: boolean;
  description: string;
}

export interface Recommendation {
  original: string;
  improved: string;
  reasoning: string;
  coaching: string[];
}

export interface DashboardStats {
  avgCoherence: number;
  avgRelevance: number;
  avgPoliteness: number;
  avgResolution: number;
  totalChats: number;
  unresolvedChats: number;
}