import React, { useState } from 'react';
import { Download, Filter, BarChart3, TrendingUp, Users, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MOCK_CHATLOGS, MOCK_EVALUATIONS, MOCK_AGENTS } from '../data/mockData';
import MetricCard from '../components/MetricCard';
import Chart from '../components/Chart';

const ReportPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');

  // Only show for managers
  if (user?.role !== 'manager') {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Restricted</h1>
          <p className="text-gray-600 dark:text-gray-400">This page is only available to managers.</p>
        </div>
      </div>
    );
  }

  const filteredChats = MOCK_CHATLOGS.filter(chat => {
    const matchesAgent = selectedAgent === 'all' || chat.agentId === selectedAgent;
    
    // Simple date filtering (in real app, this would be more sophisticated)
    const chatDate = new Date(chat.date);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(dateRange));
    const matchesDate = chatDate >= cutoff;
    
    return matchesAgent && matchesDate;
  });

  const filteredEvaluations = MOCK_EVALUATIONS.filter(evaluation => 
    filteredChats.some(chat => chat.id === evaluation.chatLogId)
  );

  // Calculate overall metrics
  const overallMetrics = filteredEvaluations.length > 0 ? {
    avgCoherence: filteredEvaluations.reduce((sum, e) => sum + e.coherence, 0) / filteredEvaluations.length,
    avgRelevance: filteredEvaluations.reduce((sum, e) => sum + e.relevance, 0) / filteredEvaluations.length,
    avgPoliteness: filteredEvaluations.reduce((sum, e) => sum + e.politeness, 0) / filteredEvaluations.length,
    avgResolution: filteredEvaluations.reduce((sum, e) => sum + e.resolution, 0) / filteredEvaluations.length,
    totalChats: filteredChats.length,
    resolvedChats: filteredChats.filter(c => c.resolved).length
  } : {
    avgCoherence: 0, avgRelevance: 0, avgPoliteness: 0, avgResolution: 0,
    totalChats: 0, resolvedChats: 0
  };

  // Agent performance data
  const agentPerformance = MOCK_AGENTS.map(agent => {
    const agentEvals = filteredEvaluations.filter(evaluation => 
      filteredChats.find(chat => chat.id === evaluation.chatLogId && chat.agentId === agent.id)
    );
    
    if (agentEvals.length === 0) {
      return { ...agent, avgScore: 0, chatCount: 0, resolutionRate: 0 };
    }

    const avgScore = (
      agentEvals.reduce((sum, e) => sum + e.coherence + e.relevance + e.politeness + (e.resolution * 5), 0) / 
      (agentEvals.length * 4)
    );
    
    const agentChats = filteredChats.filter(c => c.agentId === agent.id);
    const resolutionRate = agentChats.length > 0 ? 
      agentChats.filter(c => c.resolved).length / agentChats.length : 0;

    return {
      ...agent,
      avgScore,
      chatCount: agentChats.length,
      resolutionRate
    };
  }).filter(agent => agent.chatCount > 0);

  // Guideline compliance data
  const guidelineCompliance = filteredEvaluations.reduce((acc, evaluation) => {
    evaluation.guidelines.forEach(guideline => {
      if (!acc[guideline.name]) {
        acc[guideline.name] = { passed: 0, total: 0 };
      }
      acc[guideline.name].total++;
      if (guideline.passed) acc[guideline.name].passed++;
    });
    return acc;
  }, {} as Record<string, { passed: number; total: number }>);

  const chartData = [
    { label: 'Coherence', value: overallMetrics.avgCoherence, color: 'bg-blue-600' },
    { label: 'Relevance', value: overallMetrics.avgRelevance, color: 'bg-emerald-600' },
    { label: 'Politeness', value: overallMetrics.avgPoliteness, color: 'bg-purple-600' },
    { label: 'Resolution', value: overallMetrics.avgResolution * 5, color: 'bg-yellow-600' }
  ];

  const agentChartData = agentPerformance.map(agent => ({
    label: agent.name.split(' ')[0],
    value: agent.avgScore,
    color: 'bg-indigo-600'
  }));

  const handleExportReport = () => {
    // In a real app, this would generate and download a report
    alert('Report export functionality would be implemented here');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Report</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive overview of team performance and insights
          </p>
        </div>
        <button
          onClick={handleExportReport}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Agent
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>Showing data for {filteredChats.length} chats</p>
              <p>across {agentPerformance.length} active agents</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Team Avg. Score"
          value={((overallMetrics.avgCoherence + overallMetrics.avgRelevance + overallMetrics.avgPoliteness + (overallMetrics.avgResolution * 5)) / 4).toFixed(1)}
          subtitle="out of 5.0"
          icon={BarChart3}
          color="blue"
        />
        <MetricCard
          title="Resolution Rate"
          value={`${overallMetrics.totalChats > 0 ? ((overallMetrics.resolvedChats / overallMetrics.totalChats) * 100).toFixed(0) : 0}%`}
          subtitle={`${overallMetrics.resolvedChats}/${overallMetrics.totalChats} resolved`}
          icon={TrendingUp}
          color="green"
        />
        <MetricCard
          title="Active Agents"
          value={agentPerformance.length}
          subtitle="with chat activity"
          icon={Users}
          color="purple"
        />
        <MetricCard
          title="Total Chats"
          value={overallMetrics.totalChats}
          subtitle={`in last ${dateRange} days`}
          icon={Calendar}
          color="yellow"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Chart
          data={chartData}
          type="bar"
          title="Overall Team Metrics"
        />
        
        <Chart
          data={agentChartData}
          type="bar"
          title="Agent Performance Comparison"
        />
      </div>

      {/* Agent Performance Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Agent Performance Details
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Chats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Avg. Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Resolution Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {agentPerformance.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{agent.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{agent.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {agent.chatCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {agent.avgScore.toFixed(1)}/5.0
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {(agent.resolutionRate * 100).toFixed(0)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      agent.avgScore >= 4.0
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                        : agent.avgScore >= 3.5
                        ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200'
                        : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                    }`}>
                      {agent.avgScore >= 4.0 ? 'Excellent' : agent.avgScore >= 3.5 ? 'Good' : 'Needs Improvement'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guideline Compliance */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Guideline Compliance Overview
          </h2>
        </div>
        <div className="p-6">
          <div className="grid gap-4">
            {Object.entries(guidelineCompliance).map(([guideline, stats]) => {
              const passRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
              return (
                <div key={guideline} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">{guideline}</h3>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full ${
                          passRate >= 80 ? 'bg-emerald-600' : passRate >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${passRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="font-medium text-gray-900 dark:text-white">{passRate.toFixed(0)}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stats.passed}/{stats.total}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;