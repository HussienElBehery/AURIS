import React, { useState, useEffect } from 'react';
import { Brain, MessageSquare, Heart, CheckCircle, Filter, TrendingUp, Database, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { ChatLog, Evaluation } from '../types';
import Chart from '../components/Chart';
import MetricCard from '../components/MetricCard';
import { MOCK_CHATLOGS, MOCK_EVALUATIONS } from '../data/mockData';

const EvaluationPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is a demo user
  const isDemoUser = localStorage.getItem('token') === 'demo-token';

  // Helper to map backend evaluation fields to frontend camelCase
  const mapEvaluation = (e: any): Evaluation => ({
    ...e,
    chatLogId: e.chat_log_id,
    agentId: e.agent_id,
    evaluationSummary: e.evaluation_summary,
    errorMessage: e.error_message,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  });

  // Load chat logs and evaluations
  useEffect(() => {
    loadData();
  }, [isDemoUser]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isDemoUser) {
        // Use mock data for demo users
        setChatLogs(MOCK_CHATLOGS);
        setEvaluations(MOCK_EVALUATIONS);
      } else {
        const logs = await api.chatLogs.getAll();
        setChatLogs(logs);
        
        // Debug: Log user object to see what fields are available
        console.log('Current user object:', user);
        console.log('User agentId:', user?.agentId);
        console.log('User agent_id:', (user as any)?.agent_id);
        
        // Load evaluations by agent_id instead of by chat_log_id
        const allEvaluations: Evaluation[] = [];
        
        if (user?.role === 'manager') {
          // Managers can see all evaluations
          const evaluations = await api.evaluations.getAll();
          allEvaluations.push(...evaluations.map(mapEvaluation));
        } else {
          // Agents see their own evaluations - use agentId from user object
          const agentId = user?.agentId || (user as any)?.agent_id;
          if (agentId) {
            console.log(`Loading evaluations for agent: ${agentId}`);
            const evaluations = await api.evaluations.getByAgentId(agentId);
            console.log('Raw evaluations from API:', evaluations);
            allEvaluations.push(...evaluations.map(mapEvaluation));
          } else {
            console.warn('No agentId found for user:', user);
          }
        }
        
        console.log('All evaluations after processing:', allEvaluations);
        setEvaluations(allEvaluations);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const userChats = isDemoUser 
    ? MOCK_CHATLOGS
    : chatLogs;

  const userEvaluations = isDemoUser 
    ? MOCK_EVALUATIONS
    : evaluations;

  // Filter evaluations based on selected chat and agent
  const filteredEvaluations = userEvaluations.filter((evaluation: Evaluation) => {
    const chat = userChats.find((c: ChatLog) => c.id === evaluation.chat_log_id);
    if (!chat) return false;
    
    const matchesChat = selectedChat === 'all' || evaluation.chat_log_id === selectedChat;
    const matchesAgent = selectedAgent === 'all' || chat.agent_id === selectedAgent;
    
    return matchesChat && matchesAgent;
  });

  // Calculate average metrics for all filtered evaluations
  const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const coherenceArr = filteredEvaluations.map((e: Evaluation) => e.coherence ?? 0).filter(Boolean);
  const relevanceArr = filteredEvaluations.map((e: Evaluation) => e.relevance ?? 0).filter(Boolean);
  const politenessArr = filteredEvaluations.map((e: Evaluation) => e.politeness ?? 0).filter(Boolean);
  const resolutionArr = filteredEvaluations.map((e: Evaluation) => e.resolution ?? 0).filter(e => typeof e === 'number');

  const avg_coherence = avg(coherenceArr);
  const avg_relevance = avg(relevanceArr);
  const avg_politeness = avg(politenessArr);

  // For resolution rate (percentage)
  const resolvedCount = filteredEvaluations.filter(e => e.resolution === 1).length;
  const unresolvedCount = filteredEvaluations.filter(e => e.resolution === 0).length;
  const totalResolution = resolvedCount + unresolvedCount;
  const resolutionRate = totalResolution > 0 ? resolvedCount / totalResolution : 0;

  const formattedAvgMetrics = {
    coherence: Math.round(avg_coherence * 10) / 10,
    relevance: Math.round(avg_relevance * 10) / 10,
    politeness: Math.round(avg_politeness * 10) / 10,
    resolution: Math.round(resolutionRate * 100) / 100
  };

  const chartData = [
    { label: 'Coherence', value: formattedAvgMetrics.coherence, color: 'bg-blue-600', max: 5 },
    { label: 'Relevance', value: formattedAvgMetrics.relevance, color: 'bg-emerald-600', max: 5 },
    { label: 'Politeness', value: formattedAvgMetrics.politeness, color: 'bg-purple-600', max: 5 },
    { label: 'Resolution', value: formattedAvgMetrics.resolution, color: 'bg-yellow-600', max: 1 }
  ];

  // Show demo notice for demo users
  if (isDemoUser) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Evaluation</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              AI-powered analysis of customer service interactions
            </p>
          </div>
          <div className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-medium">
            Demo Mode
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Chat
              </label>
              <select
                value={selectedChat}
                onChange={(e) => setSelectedChat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Chats</option>
                {userChats.map(chat => (
                  <option key={chat.id} value={chat.id}>
                    {chat.agent_persona} - {chat.created_at ? new Date(chat.created_at).toLocaleDateString() : 'N/A'}
                  </option>
                ))}
              </select>
            </div>

            {user?.role === 'manager' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Agent
                </label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Agents</option>
                  {Array.from(new Set(userEvaluations.map(evaluation => {
                    const chat = userChats.find(c => c.id === evaluation.chat_log_id);
                    return chat?.agent_id;
                  }).filter(Boolean))).map(agentId => (
                    <option key={agentId} value={agentId}>{agentId}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard
            title="Average Coherence"
            value={formattedAvgMetrics.coherence}
            subtitle="out of 5"
            icon={Brain}
            color="blue"
          />
          <MetricCard
            title="Average Relevance"
            value={formattedAvgMetrics.relevance}
            subtitle="out of 5"
            icon={MessageSquare}
            color="green"
          />
          <MetricCard
            title="Average Politeness"
            value={formattedAvgMetrics.politeness}
            subtitle="out of 5"
            icon={Heart}
            color="purple"
          />
          <MetricCard
            title="Average Resolution"
            value={formattedAvgMetrics.resolution}
            subtitle="out of 1"
            icon={CheckCircle}
            color="yellow"
          />
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Overview</h3>
          <Chart data={chartData} type="bar" title="Evaluation Metrics" />
        </div>

        {/* Evaluations List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Evaluations ({filteredEvaluations.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEvaluations.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                No evaluations found
              </div>
            ) : (
              filteredEvaluations.map((evaluation) => {
                const chat = userChats.find(c => c.id === evaluation.chat_log_id);
                return (
                  <div key={evaluation.id} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                          {chat?.agent_persona} - {chat?.created_at ? new Date(chat.created_at).toLocaleDateString() : 'N/A'}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Chat ID: {evaluation.chat_log_id}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 rounded">
                          Coherence: {evaluation.coherence}/5
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 rounded">
                          Relevance: {evaluation.relevance}/5
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 rounded">
                          Politeness: {evaluation.politeness}/5
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 rounded">
                          Resolution: {evaluation.resolution}/1
                        </span>
                      </div>
                    </div>
                    {evaluation.reasoning && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">Coherence</h5>
                          <p className="text-gray-600 dark:text-gray-400">
                            {evaluation.reasoning.coherence?.reasoning || 'No reasoning provided'}
                          </p>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">Relevance</h5>
                          <p className="text-gray-600 dark:text-gray-400">
                            {evaluation.reasoning.relevance?.reasoning || 'No reasoning provided'}
                          </p>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">Politeness</h5>
                          <p className="text-gray-600 dark:text-gray-400">
                            {evaluation.reasoning.politeness?.reasoning || 'No reasoning provided'}
                          </p>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">Resolution</h5>
                          <p className="text-gray-600 dark:text-gray-400">
                            {evaluation.reasoning.resolution?.reasoning || 'No reasoning provided'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Evaluation</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            AI-powered analysis of customer service interactions
          </p>
        </div>
        <button 
          onClick={loadData}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <Database className="w-4 h-4" />
          <span>{loading ? 'Loading...' : 'Refresh'}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading evaluations...</span>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Chat
                </label>
                <select
                  value={selectedChat}
                  onChange={(e) => setSelectedChat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Chats (Average)</option>
                  {userChats.map(chat => (
                    <option key={chat.id} value={chat.id}>
                      {chat.interaction_id} - {chat.agent_id || 'N/A'} ({chat.created_at ? new Date(chat.created_at).toLocaleDateString() : 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {user?.role === 'manager' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filter by Agent
                  </label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Agents</option>
                    {Array.from(new Set(userEvaluations.map(evaluation => evaluation.agent_id).filter(Boolean))).map(agentId => (
                      <option key={agentId} value={agentId}>{agentId}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Coherence"
              value={selectedChat === 'all' ? avg_coherence.toFixed(1) : (filteredEvaluations[0]?.coherence?.toFixed(1) || '0.0')}
              subtitle="out of 5.0"
              icon={Brain}
              color="blue"
            />
            <MetricCard
              title="Relevance"
              value={selectedChat === 'all' ? avg_relevance.toFixed(1) : (filteredEvaluations[0]?.relevance?.toFixed(1) || '0.0')}
              subtitle="out of 5.0"
              icon={MessageSquare}
              color="green"
            />
            <MetricCard
              title="Politeness"
              value={selectedChat === 'all' ? avg_politeness.toFixed(1) : (filteredEvaluations[0]?.politeness?.toFixed(1) || '0.0')}
              subtitle="out of 5.0"
              icon={Heart}
              color="purple"
            />
            <MetricCard
              title={selectedChat === 'all' ? 'Resolution Rate' : 'Resolution'}
              value={selectedChat === 'all'
                ? `${(resolutionRate * 100).toFixed(0)}%`
                : (filteredEvaluations[0]?.resolution === 1 ? 'Resolved' : filteredEvaluations[0]?.resolution === 0 ? 'Unresolved' : 'N/A')
              }
              subtitle={selectedChat === 'all'
                ? `${resolvedCount}/${totalResolution} resolved`
                : 'Rate'}
              icon={CheckCircle}
              color="yellow"
            />
          </div>

          {/* Charts and Detailed Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Chart
              data={chartData.map(d => ({ ...d, value: Number(d.value.toFixed(1)) }))}
              type="bar"
              title={selectedChat === 'all' ? 'Average Performance Metrics' : 'Chat Performance Metrics'}
              maxValue={selectedChat === 'all' ? 5 : undefined}
            />

            {/* Reasoning Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                {filteredEvaluations.length > 0 ? 'AI Reasoning' : 'Analysis Summary'}
              </h3>
              
              {filteredEvaluations.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-1">Coherence</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {filteredEvaluations[0].reasoning?.coherence?.reasoning || 'No reasoning available'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-emerald-600 dark:text-emerald-400 mb-1">Relevance</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {filteredEvaluations[0].reasoning?.relevance?.reasoning || 'No reasoning available'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-purple-600 dark:text-purple-400 mb-1">Politeness</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {filteredEvaluations[0].reasoning?.politeness?.reasoning || 'No reasoning available'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-1">Resolution</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {filteredEvaluations[0].reasoning?.resolution?.reasoning || 'No reasoning available'}
                    </p>
                  </div>
                  
                  {filteredEvaluations[0].evaluation_summary && (
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Evaluation Summary</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {filteredEvaluations[0].evaluation_summary}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EvaluationPage;