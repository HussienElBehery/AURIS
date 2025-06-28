import React, { useState } from 'react';
import { Brain, MessageSquare, Heart, CheckCircle, Filter, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MOCK_CHATLOGS, MOCK_EVALUATIONS, MOCK_AGENTS } from '../data/mockData';
import Chart from '../components/Chart';
import MetricCard from '../components/MetricCard';

const EvaluationPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');

  const userChats = user?.role === 'manager' 
    ? MOCK_CHATLOGS 
    : MOCK_CHATLOGS.filter(chat => chat.agentId === user?.id);

  const userEvaluations = MOCK_EVALUATIONS.filter(evaluation => {
    const chat = userChats.find(c => c.id === evaluation.chatLogId);
    return chat !== undefined;
  });

  const filteredEvaluations = userEvaluations.filter(evaluation => {
    const chat = userChats.find(c => c.id === evaluation.chatLogId);
    if (!chat) return false;
    
    const matchesChat = selectedChat === 'all' || evaluation.chatLogId === selectedChat;
    const matchesAgent = selectedAgent === 'all' || chat.agentId === selectedAgent;
    
    return matchesChat && matchesAgent;
  });

  const currentEvaluation = selectedChat !== 'all' 
    ? filteredEvaluations.find(e => e.chatLogId === selectedChat)
    : null;

  // Calculate averages
  const avgMetrics = filteredEvaluations.length > 0 ? {
    coherence: filteredEvaluations.reduce((sum, e) => sum + e.coherence, 0) / filteredEvaluations.length,
    relevance: filteredEvaluations.reduce((sum, e) => sum + e.relevance, 0) / filteredEvaluations.length,
    politeness: filteredEvaluations.reduce((sum, e) => sum + e.politeness, 0) / filteredEvaluations.length,
    resolution: filteredEvaluations.reduce((sum, e) => sum + e.resolution, 0) / filteredEvaluations.length
  } : { coherence: 0, relevance: 0, politeness: 0, resolution: 0 };

  const chartData = [
    { label: 'Coherence', value: avgMetrics.coherence, color: 'bg-blue-600' },
    { label: 'Relevance', value: avgMetrics.relevance, color: 'bg-emerald-600' },
    { label: 'Politeness', value: avgMetrics.politeness, color: 'bg-purple-600' },
    { label: 'Resolution', value: avgMetrics.resolution * 5, color: 'bg-yellow-600' }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Evaluation</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            AI-powered analysis of customer service interactions
          </p>
        </div>
      </div>

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
                  {chat.id} - {chat.agentName} ({new Date(chat.date).toLocaleDateString()})
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
                {MOCK_AGENTS.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
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
          value={currentEvaluation ? currentEvaluation.coherence.toFixed(1) : avgMetrics.coherence.toFixed(1)}
          subtitle="out of 5.0"
          icon={Brain}
          color="blue"
        />
        <MetricCard
          title="Relevance"
          value={currentEvaluation ? currentEvaluation.relevance.toFixed(1) : avgMetrics.relevance.toFixed(1)}
          subtitle="out of 5.0"
          icon={MessageSquare}
          color="green"
        />
        <MetricCard
          title="Politeness"
          value={currentEvaluation ? currentEvaluation.politeness.toFixed(1) : avgMetrics.politeness.toFixed(1)}
          subtitle="out of 5.0"
          icon={Heart}
          color="purple"
        />
        <MetricCard
          title="Resolution"
          value={currentEvaluation ? currentEvaluation.resolution : avgMetrics.resolution.toFixed(2)}
          subtitle={currentEvaluation ? (currentEvaluation.resolution ? 'Resolved' : 'Unresolved') : 'Rate'}
          icon={CheckCircle}
          color="yellow"
        />
      </div>

      {/* Charts and Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Chart
          data={chartData}
          type="bar"
          title={selectedChat === 'all' ? 'Average Performance Metrics' : 'Chat Performance Metrics'}
        />

        {/* Reasoning Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            {currentEvaluation ? 'AI Reasoning' : 'Analysis Summary'}
          </h3>
          
          {currentEvaluation ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-1">Coherence</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{currentEvaluation.reasoning.coherence}</p>
              </div>
              <div>
                <h4 className="font-medium text-emerald-600 dark:text-emerald-400 mb-1">Relevance</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{currentEvaluation.reasoning.relevance}</p>
              </div>
              <div>
                <h4 className="font-medium text-purple-600 dark:text-purple-400 mb-1">Politeness</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{currentEvaluation.reasoning.politeness}</p>
              </div>
              <div>
                <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-1">Resolution</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{currentEvaluation.reasoning.resolution}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Showing average metrics across {filteredEvaluations.length} evaluated chats.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Avg. Coherence:</span>
                  <span className="ml-2 font-medium text-blue-600 dark:text-blue-400">
                    {avgMetrics.coherence.toFixed(1)}/5.0
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Avg. Relevance:</span>
                  <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">
                    {avgMetrics.relevance.toFixed(1)}/5.0
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Avg. Politeness:</span>
                  <span className="ml-2 font-medium text-purple-600 dark:text-purple-400">
                    {avgMetrics.politeness.toFixed(1)}/5.0
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Resolution Rate:</span>
                  <span className="ml-2 font-medium text-yellow-600 dark:text-yellow-400">
                    {(avgMetrics.resolution * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Evaluation History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Evaluations
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Chat ID
                </th>
                {user?.role === 'manager' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Agent
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Coherence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Relevance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Politeness
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Resolution
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEvaluations.map((evaluation) => {
                const chat = userChats.find(c => c.id === evaluation.chatLogId);
                return (
                  <tr key={evaluation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {evaluation.chatLogId}
                    </td>
                    {user?.role === 'manager' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {chat?.agentName}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {evaluation.coherence.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {evaluation.relevance.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {evaluation.politeness.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        evaluation.resolution 
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                      }`}>
                        {evaluation.resolution ? 'Resolved' : 'Unresolved'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EvaluationPage;