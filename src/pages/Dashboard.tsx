import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MOCK_DASHBOARD_STATS, MOCK_CHATLOGS } from '../data/mockData';
import MetricCard from '../components/MetricCard';
import Chart from '../components/Chart';
import { 
  Brain, 
  MessageSquare, 
  Heart, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  Users,
  Database,
  Eye,
  Check,
  X as XIcon,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import type { ChatLog, Evaluation, Analysis, Recommendation } from '../types';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Check if user is a demo user
  const isDemoUser = localStorage.getItem('token') === 'demo-token';
  
  // Get stats based on user role and ID, with fallback to default stats
  const getStats = () => {
    // Only show mock data for demo users
    if (!isDemoUser) {
      // For official users, return empty/placeholder stats
      return {
        avg_coherence: 0,
        avg_relevance: 0,
        avg_politeness: 0,
        avg_resolution: 0,
        total_chats: 0,
        unresolved_chats: 0
      };
    }
    
    if (user?.role === 'manager') {
      return MOCK_DASHBOARD_STATS.manager;
    }
    
    // For agents, try to find stats by user ID, fallback to default agent stats
    const userStats = MOCK_DASHBOARD_STATS[user?.id || '1'];
    if (userStats) {
      return userStats;
    }
    
    // Fallback stats for new users
    return {
      avg_coherence: 4.0,
      avg_relevance: 4.2,
      avg_politeness: 4.3,
      avg_resolution: 0.75,
      total_chats: 15,
      unresolved_chats: 2
    };
  };

  const stats = getStats();

  const userChats = isDemoUser 
    ? (user?.role === 'manager' 
        ? MOCK_CHATLOGS 
        : MOCK_CHATLOGS.filter(chat => chat.agent_id === user?.id))
    : []; // Empty array for official users

  const recentUnresolved = userChats.slice(0, 5);

  const chartData = [
    { label: 'Coherence', value: stats.avg_coherence, color: 'bg-blue-600' },
    { label: 'Relevance', value: stats.avg_relevance, color: 'bg-emerald-600' },
    { label: 'Politeness', value: stats.avg_politeness, color: 'bg-purple-600' },
    { label: 'Resolution', value: stats.avg_resolution * 5, color: 'bg-yellow-600' }
  ];

  const agentPerformanceData = isDemoUser && user?.role === 'manager' ? [
    { label: 'Sarah J.', value: 4.2, color: 'bg-blue-600' },
    { label: 'Alex R.', value: 3.8, color: 'bg-emerald-600' },
    { label: 'Emma D.', value: 4.5, color: 'bg-purple-600' },
    { label: 'Mike T.', value: 3.9, color: 'bg-yellow-600' }
  ] : [];

  const agentId = user?.agent_id || user?.id;

  // Fetch all evaluations for the agent
  const { data: evaluations = [], isLoading: loadingEvals } = useQuery<Evaluation[]>({
    queryKey: ['evaluations', agentId, user?.role],
    queryFn: () => {
      if (user?.role === 'manager') {
        // Managers see all evaluations
        return api.evaluations.getAll();
      } else {
        // Agents see only their own evaluations
        return agentId ? api.evaluations.getByAgentId(agentId) : Promise.resolve([]);
      }
    },
    enabled: !!agentId
  });
  // Fetch all analyses for the agent
  const { data: analyses = [], isLoading: loadingAnalyses } = useQuery<Analysis[]>({
    queryKey: ['analyses', agentId, user?.role],
    queryFn: () => {
      if (user?.role === 'manager') {
        // Managers see all analyses
        return api.analysis.getAll();
      } else {
        // Agents see only their own analyses
        return agentId ? api.analysis.getByAgentId(agentId) : Promise.resolve([]);
      }
    },
    enabled: !!agentId
  });
  // Fetch all chat logs for the agent
  const { data: chatLogs = [], isLoading: loadingChats } = useQuery<ChatLog[]>({
    queryKey: ['chatLogs', agentId, user?.role],
    queryFn: () => {
      if (user?.role === 'manager') {
        // Managers see all chat logs
        return api.chatLogs.getAll();
      } else {
        // Agents see only their own chat logs
        return api.chatLogs.getAll().then(logs => logs.filter((l: ChatLog) => l.agent_id === agentId));
      }
    },
    enabled: !!agentId
  });

  // --- Aggregate metrics ---
  const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const coherenceArr = (evaluations as Evaluation[]).map((e: Evaluation) => e.coherence ?? 0).filter(Boolean);
  const relevanceArr = (evaluations as Evaluation[]).map((e: Evaluation) => e.relevance ?? 0).filter(Boolean);
  const politenessArr = (evaluations as Evaluation[]).map((e: Evaluation) => e.politeness ?? 0).filter(Boolean);
  const avg_coherence = avg(coherenceArr);
  const avg_relevance = avg(relevanceArr);
  const avg_politeness = avg(politenessArr);
  // --- Performance trend (by createdAt) ---
  const trendData = (evaluations as Evaluation[])
    .filter((e: Evaluation) => e.created_at)
    .sort((a: Evaluation, b: Evaluation) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime())
    .map((e: Evaluation) => ({
      date: e.created_at ? new Date(e.created_at).toLocaleDateString() : '',
      coherence: e.coherence ?? 0,
      relevance: e.relevance ?? 0,
      politeness: e.politeness ?? 0,
    }));
  // --- Guideline pass/fail counts ---
  const guidelineCounts: Record<string, { passed: number; failed: number; description: string }> = {};
  analyses.forEach(a => {
    (a.guidelines || []).forEach(g => {
      if (!guidelineCounts[g.name]) guidelineCounts[g.name] = { passed: 0, failed: 0, description: g.description };
      if (g.passed) guidelineCounts[g.name].passed++;
      else guidelineCounts[g.name].failed++;
    });
  });
  // Get top 3 guidelines by total count
  const topGuidelines = Object.entries(guidelineCounts)
    .sort((a, b) => (b[1].passed + b[1].failed) - (a[1].passed + a[1].failed))
    .slice(0, 3);
  // --- Unresolved chats: only those with evaluations that have resolution === 0 ---
  const unresolvedChats = chatLogs.filter(log => {
    const evalForLog = evaluations.find(e => e.chat_log_id === log.id);
    
    // If no evaluation exists, it's not unresolved
    if (!evalForLog) {
      return false;
    }
    
    // Check resolution value - resolution is stored as a direct number field
    const resolution = evalForLog.resolution;
    
    // Resolution should be a direct number (0 or 1)
    if (typeof resolution === 'number') {
      return resolution === 0;
    }
    
    // If resolution is not a number, check if it's in reasoning object
    if (evalForLog.reasoning && evalForLog.reasoning.resolution) {
      const reasoningResolution = evalForLog.reasoning.resolution;
      if (typeof reasoningResolution === 'object' && 'score' in reasoningResolution) {
        const score = (reasoningResolution as any).score;
        return typeof score === 'number' && score === 0;
      }
    }
    
    // Default: not unresolved
    return false;
  });

  // --- Resolved chats: only those with evaluations that have resolution === 1 ---
  const resolvedChats = chatLogs.filter(log => {
    const evalForLog = evaluations.find(e => e.chat_log_id === log.id);
    
    // If no evaluation exists, it's not resolved
    if (!evalForLog) {
      return false;
    }
    
    // Check resolution value - resolution is stored as a direct number field
    const resolution = evalForLog.resolution;
    
    // Resolution should be a direct number (0 or 1)
    if (typeof resolution === 'number') {
      return resolution === 1;
    }
    
    // If resolution is not a number, check if it's in reasoning object
    if (evalForLog.reasoning && evalForLog.reasoning.resolution) {
      const reasoningResolution = evalForLog.reasoning.resolution;
      if (typeof reasoningResolution === 'object' && 'score' in reasoningResolution) {
        const score = (reasoningResolution as any).score;
        return typeof score === 'number' && score === 1;
      }
    }
    
    // Default: not resolved
    return false;
  });

  // Debug logging
  console.log('Dashboard Debug Info:', {
    totalChatLogs: chatLogs.length,
    totalEvaluations: evaluations.length,
    unresolvedChats: unresolvedChats.length,
    resolvedChats: resolvedChats.length,
    agentId,
    isDemoUser,
    userRole: user?.role,
    chatLogs: chatLogs.map(log => ({ id: log.id, agent_id: log.agent_id, status: log.status })),
    evaluations: evaluations.map(evaluation => ({ 
      chatLogId: evaluation.chat_log_id, 
      resolution: evaluation.resolution, 
      resolutionType: typeof evaluation.resolution,
      reasoning: evaluation.reasoning,
      hasReasoning: !!evaluation.reasoning,
      reasoningResolution: evaluation.reasoning?.resolution,
      reasoningResolutionType: typeof evaluation.reasoning?.resolution
    }))
  });

  // Additional debug for unresolved logic
  console.log('Unresolved Logic Debug:', {
    unresolvedChats: unresolvedChats.map(chat => {
      const evalForLog = evaluations.find(e => e.chat_log_id === chat.id);
      return {
        chatId: chat.id,
        interactionId: chat.interaction_id,
        resolution: evalForLog?.resolution,
        resolutionType: typeof evalForLog?.resolution,
        reasoning: evalForLog?.reasoning,
        reasoningResolution: evalForLog?.reasoning?.resolution,
        isUnresolved: true
      };
    }),
    allEvaluations: evaluations.map(evaluation => ({
      chatLogId: evaluation.chat_log_id,
      resolution: evaluation.resolution,
      resolutionType: typeof evaluation.resolution,
      reasoning: evaluation.reasoning,
      reasoningResolution: evaluation.reasoning?.resolution
    }))
  });

  // --- Fetch recommendations for chat logs and pick 3 random long-term coaching tips ---
  const [coachingTips, setCoachingTips] = useState<string[]>([]);
  useEffect(() => {
    let isMounted = true;
    const fetchCoaching = async () => {
      if (!chatLogs.length) return setCoachingTips([]);
      const recs = await Promise.all(
        chatLogs.map(log => api.recommendations.getByChatLogId(log.id).catch(() => null))
      );
      const allTips = recs.map(r => r?.long_term_coaching).filter(Boolean) as string[];
      // Pick 3 random unique tips
      const shuffled = allTips.sort(() => 0.5 - Math.random());
      if (isMounted) setCoachingTips(shuffled.slice(0, 3));
    };
    fetchCoaching();
    return () => { isMounted = false; };
  }, [chatLogs]);
  // --- Carousel state for coaching tips ---
  const [carouselIdx, setCarouselIdx] = useState(0);
  useEffect(() => {
    if (coachingTips.length < 2) return;
    const interval = setInterval(() => {
      setCarouselIdx(idx => (idx + 1) % coachingTips.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [coachingTips]);

  // --- New: Helper for guideline card ---
  const GuidelineCard: React.FC<{ name: string; passed: boolean; description: string }> = ({ name, passed, description }) => (
  <div className={`rounded-lg p-4 border flex flex-col gap-2 ${passed ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-red-400 bg-red-50 dark:bg-red-900/20'}`}>
    <div className="flex items-center gap-2">
      {passed ? <CheckCircle className="text-green-500 w-5 h-5" /> : <AlertCircle className="text-red-500 w-5 h-5" />}
      <span className="font-semibold text-gray-900 dark:text-white">{name}</span>
      <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${passed ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'}`}>{passed ? 'Passed' : 'Failed'}</span>
    </div>
  </div>
);

  // --- New: Unresolved Chat Card ---
  const UnresolvedChatCard: React.FC<{ chat: ChatLog; onView: (chat: ChatLog) => void }> = ({ chat, onView }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between mb-2">
    <div>
      <div className="font-medium text-gray-900 dark:text-white">{chat.interaction_id}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">ID: {chat.id}</div>
    </div>
    <button onClick={() => onView(chat)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1">
      <Eye className="w-4 h-4" /> View
    </button>
  </div>
);

  // --- New: Resolution Rate Over Time ---
  const resolutionTrend = chatLogs
    .filter(log => log.created_at)
    .sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime())
    .map(log => {
      const evalForLog = evaluations.find(e => e.chat_log_id === log.id);
      return {
        date: log.created_at ? new Date(log.created_at).toLocaleDateString() : '',
        resolved: evalForLog && (evalForLog.resolution ?? 1) > 0 ? 1 : 0
      };
    });
  // Group by date and calculate % resolved
  const dateMap: Record<string, { total: number; resolved: number }> = {};
  resolutionTrend.forEach(({ date, resolved }) => {
    if (!dateMap[date]) dateMap[date] = { total: 0, resolved: 0 };
    dateMap[date].total++;
    if (resolved) dateMap[date].resolved++;
  });
  const resolutionRateData = Object.entries(dateMap).map(([date, { total, resolved }]) => ({
    date,
    rate: total ? Math.round((resolved / total) * 100) : 0
  }));

  // --- State for unresolved chat modal ---
  const [selectedChat, setSelectedChat] = useState<ChatLog | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Handler to view chat
  const handleViewChat = (chat: ChatLog) => {
    setSelectedChat(chat);
    setShowViewModal(true);
  };

  // Handler to delete chat
  const handleDeleteChat = async (chatLogId: string) => {
    if (!window.confirm('Are you sure you want to delete this chat log? This action cannot be undone.')) {
      return;
    }
    try {
      await api.chatLogs.delete(chatLogId);
      // Refetch chat logs (react-query will refetch due to queryKey)
      setSelectedChat(null);
      setShowViewModal(false);
    } catch (error) {
      setDeleteError('Failed to delete chat log');
      console.error('Error deleting chat log:', error);
    }
  };

  // Show demo notice for demo users
  if (isDemoUser) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {user?.role === 'manager' 
                ? 'Overview of team performance and metrics' 
                : 'Your performance overview and recent activity'
              }
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {user?.role === 'manager' && (
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                <Users className="w-5 h-5" />
                <span className="font-medium">4 Active Agents</span>
              </div>
            )}
            <div className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-medium">
              Demo Mode
            </div>
          </div>
        </div>

        {/* Summary Section */}
        {!loadingChats && !loadingEvals && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{chatLogs.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Chat Logs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{evaluations.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Evaluated</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{unresolvedChats.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Unresolved</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{resolvedChats.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Resolved</div>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Avg. Coherence"
            value={isDemoUser ? (stats?.avg_coherence || 0).toFixed(1) : (avg_coherence || 0).toFixed(1)}
            subtitle="out of 5.0"
            icon={Brain}
            color="blue"
            trend="up"
          />
          <MetricCard
            title="Avg. Relevance"
            value={isDemoUser ? (stats?.avg_relevance || 0).toFixed(1) : (avg_relevance || 0).toFixed(1)}
            subtitle="out of 5.0"
            icon={MessageSquare}
            color="green"
            trend="up"
          />
          <MetricCard
            title="Avg. Politeness"
            value={isDemoUser ? (stats?.avg_politeness || 0).toFixed(1) : (avg_politeness || 0).toFixed(1)}
            subtitle="out of 5.0"
            icon={Heart}
            color="purple"
            trend="neutral"
          />
          <MetricCard
            title="Resolution Rate"
            value={isDemoUser ? `${((stats?.avg_resolution || 0) * 100).toFixed(0)}%` : `${((resolvedChats.length / Math.max(resolvedChats.length + unresolvedChats.length, 1)) * 100).toFixed(0)}%`}
            subtitle={isDemoUser ? `${(stats?.total_chats || 0) - (stats?.unresolved_chats || 0)}/${stats?.total_chats || 0} resolved` : `${resolvedChats.length}/${resolvedChats.length + unresolvedChats.length} resolved`}
            icon={CheckCircle}
            color="yellow"
            trend="up"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Chart
            data={chartData}
            type="bar"
            title={user?.role === 'manager' ? 'Team Average Metrics' : 'Your Performance Metrics'}
          />
          
          {user?.role === 'manager' && (
            <Chart
              data={agentPerformanceData}
              type="bar"
              title="Agent Performance Overview"
            />
          )}
          
          {user?.role === 'agent' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-emerald-600" />
                Performance Trends
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">This Week</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">+12% improvement</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Response Time</span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Avg. 2.3 min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Customer Satisfaction</span>
                  <span className="text-purple-600 dark:text-purple-400 font-medium">4.6/5.0</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Unresolved Chats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
              {user?.role === 'manager' ? 'Unresolved Chats Across Team' : 'Your Unresolved Chats'}
            </h2>
          </div>
          <div className="p-6">
            {recentUnresolved.length > 0 ? (
              <div className="space-y-4">
                {recentUnresolved.map((chat: any) => (
                  <div key={chat.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Chat #{chat.id}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user?.role === 'manager' ? `Agent: ${chat.agent_id} • ` : ''}
                        {chat.created_at ? new Date(chat.created_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 text-xs rounded-full">
                        Unresolved
                      </span>
                      <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {user?.role === 'manager' 
                    ? 'All team chats are resolved!' 
                    : 'All your chats are resolved!'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // For official users, show real data interface
  if (!isDemoUser) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard <span role="img" aria-label="dashboard">📊</span></h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {user?.role === 'manager' 
                ? 'Overview of team performance and metrics' 
                : 'Your performance overview and recent activity'
              }
            </p>
          </div>
          {user?.role === 'manager' && (
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
              <Users className="w-5 h-5" />
              <span className="font-medium">Connected to Database</span>
            </div>
          )}
        </div>

        {/* Summary Section */}
        {!loadingChats && !loadingEvals && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{chatLogs.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Chat Logs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{evaluations.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Evaluated</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{unresolvedChats.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Unresolved</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{resolvedChats.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Resolved</div>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Avg. Coherence"
            value={isDemoUser ? (stats?.avg_coherence || 0).toFixed(1) : (avg_coherence || 0).toFixed(1)}
            subtitle="out of 5.0"
            icon={Brain}
            color="blue"
            trend="up"
          />
          <MetricCard
            title="Avg. Relevance"
            value={isDemoUser ? (stats?.avg_relevance || 0).toFixed(1) : (avg_relevance || 0).toFixed(1)}
            subtitle="out of 5.0"
            icon={MessageSquare}
            color="green"
            trend="up"
          />
          <MetricCard
            title="Avg. Politeness"
            value={isDemoUser ? (stats?.avg_politeness || 0).toFixed(1) : (avg_politeness || 0).toFixed(1)}
            subtitle="out of 5.0"
            icon={Heart}
            color="purple"
            trend="neutral"
          />
          <MetricCard
            title="Resolution Rate"
            value={isDemoUser ? `${((stats?.avg_resolution || 0) * 100).toFixed(0)}%` : `${((resolvedChats.length / Math.max(resolvedChats.length + unresolvedChats.length, 1)) * 100).toFixed(0)}%`}
            subtitle={isDemoUser ? `${(stats?.total_chats || 0) - (stats?.unresolved_chats || 0)}/${stats?.total_chats || 0} resolved` : `${resolvedChats.length}/${resolvedChats.length + unresolvedChats.length} resolved`}
            icon={CheckCircle}
            color="yellow"
            trend="up"
          />
        </div>

        {/* Guidelines - Now Full Width */}
        <div className="w-full mt-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow flex flex-col items-start min-h-[260px] border border-gray-200 dark:border-gray-700 w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">Guidelines <span className="ml-2">📋</span></h3>
            {topGuidelines.length === 0 ? (
              <div className="text-gray-500">No guideline data available.</div>
            ) : (
              topGuidelines.map(([name, { passed, failed, description }]) => {
                const total = passed + failed;
                const passRate = total ? Math.round((passed / total) * 100) : 0;
                return (
                  <div key={name} className="mb-4 w-full bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow flex flex-col gap-2">
                    <div className="flex items-center mb-2">
                      <span className="font-semibold text-base text-gray-900 dark:text-white">{name}</span>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="dark:bg-green-900/40 dark:text-green-200 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">Passed: {passed}</span>
                      <span className="dark:bg-red-900/40 dark:text-red-200 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold">Failed: {failed}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${passRate}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Pass Rate: {passRate}%</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Unresolved Chatlogs Section */}
        <div className="w-full mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border border-gray-200 dark:border-gray-700 w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">Unresolved Chatlogs <span className="ml-2">❗</span></h3>
            {loadingChats || loadingEvals ? (
              <div className="text-gray-500">Loading unresolved chatlogs...</div>
            ) : unresolvedChats.length === 0 ? (
              <div className="space-y-2">
                <div className="text-gray-500">No unresolved chatlogs.</div>
                <div className="text-xs text-gray-400">
                  Total chat logs: {chatLogs.length} | Total evaluations: {evaluations.length} | Unresolved: {unresolvedChats.length} | Resolved: {resolvedChats.length}
                </div>
                {chatLogs.length === 0 && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">No chat logs found</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      To see unresolved chats, you need to upload chat log files first. 
                      Go to the <Link to="/chats" className="text-blue-600 dark:text-blue-400 hover:underline">Chats</Link> page to upload your chat logs.
                    </p>
                    <Link 
                      to="/chats" 
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Upload Chat Logs
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-gray-400 mb-2">
                  Total chat logs: {chatLogs.length} | Total evaluations: {evaluations.length} | Unresolved: {unresolvedChats.length} | Resolved: {resolvedChats.length}
                </div>
                {unresolvedChats.map(chat => (
                  <div key={chat.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded p-3">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{chat.interaction_id}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">ID: {chat.id}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleViewChat(chat)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1">
                        <Eye className="w-4 h-4" /> View
                      </button>
                      <button onClick={() => handleDeleteChat(chat.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1">
                        <XIcon className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Long-term Coaching Section */}
        {coachingTips.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 mt-6 flex flex-col items-center shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-emerald-900 dark:text-emerald-200 flex items-center">Long-term Coaching <span className="ml-2">🌱</span></h3>
            <div className="w-full max-w-xl min-h-[80px] flex items-center justify-center relative">
              <div className="transition-all duration-700 ease-in-out text-center text-emerald-700 dark:text-emerald-300 text-lg font-semibold px-4">
                <span role="img" aria-label="lightbulb">💡</span> {coachingTips[carouselIdx]}
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              {coachingTips.map((_, idx) => (
                <span key={idx} className={`w-3 h-3 rounded-full ${idx === carouselIdx ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
              ))}
            </div>
          </div>
        )}

        {/* View Modal for Unresolved Chat */}
        {selectedChat && showViewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Chat Log Details
                </h2>
                <button 
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Chat Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Interaction ID</label>
                    <p className="text-sm text-gray-900 dark:text-white font-mono">{selectedChat.interaction_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Agent ID</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedChat.agent_id || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Date</label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {(() => {
                        try {
                          if (!selectedChat.created_at) return 'N/A';
                          const date = new Date(selectedChat.created_at);
                          return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
                        } catch {
                          return 'N/A';
                        }
                      })()}
                    </p>
                  </div>
                </div>
                {/* Transcript */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Chat Transcript</h3>
                  <div className="space-y-3">
                    {selectedChat.transcript.map((message, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg ${
                          message.sender === 'customer' 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' 
                            : 'bg-gray-50 dark:bg-gray-700 border-l-4 border-gray-500'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-1">
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                message.sender === 'customer'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                              }`}>
                                {message.sender.charAt(0).toUpperCase() + message.sender.slice(1)}
                              </span>
                              {message.timestamp && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                  {new Date(message.timestamp).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-900 dark:text-white">{message.text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // For official users, show real data interface
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {user?.role === 'manager' 
              ? 'Overview of team performance and metrics' 
              : 'Your performance overview and recent activity'
            }
          </p>
        </div>
        {user?.role === 'manager' && (
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
            <Users className="w-5 h-5" />
            <span className="font-medium">Connected to Database</span>
          </div>
        )}
      </div>

      {/* Summary Section */}
      {!loadingChats && !loadingEvals && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{chatLogs.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Chat Logs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{evaluations.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Evaluated</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{unresolvedChats.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Unresolved</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{resolvedChats.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Resolved</div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Avg. Coherence"
          value={isDemoUser ? (stats?.avg_coherence || 0).toFixed(1) : (avg_coherence || 0).toFixed(1)}
          subtitle="out of 5.0"
          icon={Brain}
          color="blue"
          trend="up"
        />
        <MetricCard
          title="Avg. Relevance"
          value={isDemoUser ? (stats?.avg_relevance || 0).toFixed(1) : (avg_relevance || 0).toFixed(1)}
          subtitle="out of 5.0"
          icon={MessageSquare}
          color="green"
          trend="up"
        />
        <MetricCard
          title="Avg. Politeness"
          value={isDemoUser ? (stats?.avg_politeness || 0).toFixed(1) : (avg_politeness || 0).toFixed(1)}
          subtitle="out of 5.0"
          icon={Heart}
          color="purple"
          trend="neutral"
        />
        <MetricCard
          title="Resolution Rate"
          value={isDemoUser ? `${((stats?.avg_resolution || 0) * 100).toFixed(0)}%` : `${((resolvedChats.length / Math.max(resolvedChats.length + unresolvedChats.length, 1)) * 100).toFixed(0)}%`}
          subtitle={isDemoUser ? `${(stats?.total_chats || 0) - (stats?.unresolved_chats || 0)}/${stats?.total_chats || 0} resolved` : `${resolvedChats.length}/${resolvedChats.length + unresolvedChats.length} resolved`}
          icon={CheckCircle}
          color="yellow"
          trend="up"
        />
      </div>

      {/* Guidelines - Now Full Width */}
      <div className="w-full mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow flex flex-col items-start min-h-[260px] border border-gray-200 dark:border-gray-700 w-full">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">Guidelines <span className="ml-2">📋</span></h3>
          {topGuidelines.length === 0 ? (
            <div className="text-gray-500">No guideline data available.</div>
          ) : (
            topGuidelines.map(([name, { passed, failed, description }]) => {
              const total = passed + failed;
              const passRate = total ? Math.round((passed / total) * 100) : 0;
              return (
                <div key={name} className="mb-4 w-full bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow flex flex-col gap-2">
                  <div className="flex items-center mb-2">
                    <span className="font-semibold text-base text-gray-900 dark:text-white">{name}</span>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="dark:bg-green-900/40 dark:text-green-200 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">Passed: {passed}</span>
                    <span className="dark:bg-red-900/40 dark:text-red-200 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold">Failed: {failed}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${passRate}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Pass Rate: {passRate}%</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Unresolved Chatlogs Section */}
      <div className="w-full mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border border-gray-200 dark:border-gray-700 w-full">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">Unresolved Chatlogs <span className="ml-2">❗</span></h3>
          {loadingChats || loadingEvals ? (
            <div className="text-gray-500">Loading unresolved chatlogs...</div>
          ) : unresolvedChats.length === 0 ? (
            <div className="space-y-2">
              <div className="text-gray-500">No unresolved chatlogs.</div>
              <div className="text-xs text-gray-400">
                Total chat logs: {chatLogs.length} | Total evaluations: {evaluations.length} | Unresolved: {unresolvedChats.length} | Resolved: {resolvedChats.length}
              </div>
              {chatLogs.length === 0 && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">No chat logs found</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    To see unresolved chats, you need to upload chat log files first. 
                    Go to the <Link to="/chats" className="text-blue-600 dark:text-blue-400 hover:underline">Chats</Link> page to upload your chat logs.
                  </p>
                  <Link 
                    to="/chats" 
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Upload Chat Logs
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-gray-400 mb-2">
                Total chat logs: {chatLogs.length} | Total evaluations: {evaluations.length} | Unresolved: {unresolvedChats.length} | Resolved: {resolvedChats.length}
              </div>
              {unresolvedChats.map(chat => (
                <div key={chat.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded p-3">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{chat.interaction_id}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">ID: {chat.id}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleViewChat(chat)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1">
                      <Eye className="w-4 h-4" /> View
                    </button>
                    <button onClick={() => handleDeleteChat(chat.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1">
                      <XIcon className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Long-term Coaching Section */}
      {coachingTips.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 mt-6 flex flex-col items-center shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-emerald-900 dark:text-emerald-200 flex items-center">Long-term Coaching <span className="ml-2">🌱</span></h3>
          <div className="w-full max-w-xl min-h-[80px] flex items-center justify-center relative">
            <div className="transition-all duration-700 ease-in-out text-center text-emerald-700 dark:text-emerald-300 text-lg font-semibold px-4">
              <span role="img" aria-label="lightbulb">💡</span> {coachingTips[carouselIdx]}
            </div>
          </div>
          <div className="flex space-x-2 mt-4">
            {coachingTips.map((_, idx) => (
              <span key={idx} className={`w-3 h-3 rounded-full ${idx === carouselIdx ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
            ))}
          </div>
        </div>
      )}

      {/* View Modal for Unresolved Chat */}
      {selectedChat && showViewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Chat Log Details
              </h2>
              <button 
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Chat Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Interaction ID</label>
                  <p className="text-sm text-gray-900 dark:text-white font-mono">{selectedChat.interaction_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Agent ID</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedChat.agent_id || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Date</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {(() => {
                      try {
                        if (!selectedChat.created_at) return 'N/A';
                        const date = new Date(selectedChat.created_at);
                        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
                      } catch {
                        return 'N/A';
                      }
                    })()}
                  </p>
                </div>
              </div>
              {/* Transcript */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Chat Transcript</h3>
                <div className="space-y-3">
                  {selectedChat.transcript.map((message, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg ${
                        message.sender === 'customer' 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' 
                          : 'bg-gray-50 dark:bg-gray-700 border-l-4 border-gray-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              message.sender === 'customer'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                            }`}>
                              {message.sender.charAt(0).toUpperCase() + message.sender.slice(1)}
                            </span>
                            {message.timestamp && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                {new Date(message.timestamp).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-900 dark:text-white">{message.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;