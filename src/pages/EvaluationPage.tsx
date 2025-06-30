import React, { useState, useEffect } from 'react';
import { Brain, MessageSquare, Heart, CheckCircle, Filter, TrendingUp, Database, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { ChatLog, Evaluation } from '../types';
import Chart from '../components/Chart';
import MetricCard from '../components/MetricCard';

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
    if (!isDemoUser) {
      loadData();
    }
  }, [isDemoUser]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
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
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const userChats = isDemoUser 
    ? [] // Demo data would be handled differently
    : chatLogs;

  const userEvaluations = isDemoUser 
    ? [] // Demo data would be handled differently
    : evaluations;

  const filteredEvaluations = userEvaluations.filter(evaluation => {
    const chat = userChats.find(c => c.id === evaluation.chatLogId);
    if (!chat) return false;
    
    const matchesChat = selectedChat === 'all' || evaluation.chatLogId === selectedChat;
    const matchesAgent = selectedAgent === 'all' || evaluation.agentId === selectedAgent;
    
    return matchesChat && matchesAgent;
  });

  console.log('User evaluations:', userEvaluations);
  console.log('Filtered evaluations:', filteredEvaluations);
  console.log('Selected chat:', selectedChat);
  console.log('Selected agent:', selectedAgent);

  const currentEvaluation = selectedChat !== 'all' 
    ? filteredEvaluations.find(e => e.chatLogId === selectedChat)
    : null;

  console.log('Current evaluation:', currentEvaluation);

  // Calculate averages
  const avgMetrics = filteredEvaluations.length > 0 ? {
    coherence: filteredEvaluations.reduce((sum, e) => sum + (e.coherence || 0), 0) / filteredEvaluations.length,
    relevance: filteredEvaluations.reduce((sum, e) => sum + (e.relevance || 0), 0) / filteredEvaluations.length,
    politeness: filteredEvaluations.reduce((sum, e) => sum + (e.politeness || 0), 0) / filteredEvaluations.length,
    resolution: filteredEvaluations.reduce((sum, e) => sum + (e.resolution || 0), 0) / filteredEvaluations.length
  } : { coherence: 0, relevance: 0, politeness: 0, resolution: 0 };

  // Format averages to 1 decimal place for display and chart
  const formattedAvgMetrics = {
    coherence: Number(avgMetrics.coherence.toFixed(1)),
    relevance: Number(avgMetrics.relevance.toFixed(1)),
    politeness: Number(avgMetrics.politeness.toFixed(1)),
    resolution: Number(avgMetrics.resolution.toFixed(2)),
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
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <p className="text-blue-800 dark:text-blue-200">
            This is demo mode. Please log in to see real evaluation data.
          </p>
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
                      {chat.interaction_id} - {chat.agent_id || 'N/A'} ({new Date(chat.created_at || '').toLocaleDateString()})
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
                    {Array.from(new Set(userEvaluations.map(evaluation => evaluation.agentId).filter(Boolean))).map(agentId => (
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
              value={currentEvaluation ? (currentEvaluation.coherence || 0).toFixed(1) : formattedAvgMetrics.coherence.toFixed(1)}
              subtitle="out of 5.0"
              icon={Brain}
              color="blue"
            />
            <MetricCard
              title="Relevance"
              value={currentEvaluation ? (currentEvaluation.relevance || 0).toFixed(1) : formattedAvgMetrics.relevance.toFixed(1)}
              subtitle="out of 5.0"
              icon={MessageSquare}
              color="green"
            />
            <MetricCard
              title="Politeness"
              value={currentEvaluation ? (currentEvaluation.politeness || 0).toFixed(1) : formattedAvgMetrics.politeness.toFixed(1)}
              subtitle="out of 5.0"
              icon={Heart}
              color="purple"
            />
            <MetricCard
              title="Resolution"
              value={currentEvaluation ? (currentEvaluation.resolution || 0).toFixed(2) : formattedAvgMetrics.resolution.toFixed(2)}
              subtitle={currentEvaluation ? (currentEvaluation.resolution ? 'Resolved' : 'Unresolved') : 'Rate'}
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
                {currentEvaluation ? 'AI Reasoning' : 'Analysis Summary'}
              </h3>
              
              {currentEvaluation && currentEvaluation.reasoning ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-1">Coherence</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {currentEvaluation.reasoning.coherence?.reasoning || 'No reasoning available'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-emerald-600 dark:text-emerald-400 mb-1">Relevance</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {currentEvaluation.reasoning.relevance?.reasoning || 'No reasoning available'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-purple-600 dark:text-purple-400 mb-1">Politeness</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {currentEvaluation.reasoning.politeness?.reasoning || 'No reasoning available'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-1">Resolution</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {currentEvaluation.reasoning.resolution?.reasoning || 'No reasoning available'}
                    </p>
                  </div>
                  
                  {currentEvaluation.evaluationSummary && (
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Evaluation Summary</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {currentEvaluation.evaluationSummary}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    {filteredEvaluations.length > 0 
                      ? `Showing average metrics across ${filteredEvaluations.length} evaluated chats.`
                      : 'No evaluations available. Upload and process chat logs to see evaluations.'
                    }
                  </p>
                  {filteredEvaluations.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Avg. Coherence:</span>
                        <span className="ml-2 font-medium text-blue-600 dark:text-blue-400">
                          {formattedAvgMetrics.coherence.toFixed(1)}/5.0
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Avg. Relevance:</span>
                        <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">
                          {formattedAvgMetrics.relevance.toFixed(1)}/5.0
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Avg. Politeness:</span>
                        <span className="ml-2 font-medium text-purple-600 dark:text-purple-400">
                          {formattedAvgMetrics.politeness.toFixed(1)}/5.0
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Avg. Resolution:</span>
                        <span className="ml-2 font-medium text-yellow-600 dark:text-yellow-400">
                          {formattedAvgMetrics.resolution.toFixed(2)}
                        </span>
                      </div>
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