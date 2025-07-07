import React, { useState, useEffect } from 'react';
import { Download, Filter, BarChart3, TrendingUp, Users, Calendar, Database, FileText, Star, Clock, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { MOCK_CHATLOGS, MOCK_EVALUATIONS, MOCK_AGENTS, MOCK_DASHBOARD_STATS } from '../data/mockData';
import MetricCard from '../components/MetricCard';
import Chart from '../components/Chart';
import { ChatLog, Evaluation, Analysis, Recommendation, DashboardStats } from '../types';

// Mock analysis data for demo
const MOCK_ANALYSES = [
  {
    id: 'analysis-001',
    chat_log_id: 'chat-001',
    agent_id: '1',
    guidelines: [
      { name: 'Acknowledge and Empathize', passed: true, description: 'Agent properly acknowledged the delivery issue and showed empathy.' },
      { name: 'Set Clear Expectations', passed: true, description: 'Agent set clear expectations for the package trace process.' },
      { name: 'Proactive Help', passed: true, description: 'Agent offered proactive solutions by initiating the trace immediately.' }
    ],
    issues: [],
    highlights: [
      'Immediate acknowledgment of customer concern',
      'Clear communication of next steps',
      'Proactive problem-solving approach'
    ],
    analysis_summary: 'Excellent customer service interaction with proper empathy, clear communication, and proactive problem-solving.'
  },
  {
    id: 'analysis-002',
    chat_log_id: 'chat-002',
    agent_id: '1',
    guidelines: [
      { name: 'Acknowledge and Empathize', passed: true, description: 'Agent acknowledged customer frustration.' },
      { name: 'Set Clear Expectations', passed: false, description: 'No clear return process was explained.' },
      { name: 'Proactive Help', passed: false, description: 'Agent should have offered specific return options.' }
    ],
    issues: [
      'Incomplete information gathering about the product issue',
      'No clear return process outlined',
      'Missing proactive solution offering'
    ],
    highlights: [
      'Showed empathy for customer frustration'
    ],
    analysis_summary: 'Interaction needs improvement in setting clear expectations and providing proactive solutions.'
  },
  {
    id: 'analysis-003',
    chat_log_id: 'chat-003',
    agent_id: '3',
    guidelines: [
      { name: 'Acknowledge and Empathize', passed: true, description: 'Agent offered immediate help.' },
      { name: 'Set Clear Expectations', passed: true, description: 'Provided clear navigation instructions.' },
      { name: 'Proactive Help', passed: true, description: 'Gave specific step-by-step guidance.' }
    ],
    issues: [],
    highlights: [
      'Quick and accurate response',
      'Clear step-by-step instructions',
      'Enthusiastic willingness to help'
    ],
    analysis_summary: 'Excellent response with clear instructions and helpful attitude.'
  }
];

// Mock recommendations for demo
const MOCK_RECOMMENDATIONS = [
  {
    id: 'rec-001',
    chat_log_id: 'chat-001',
    original_message: 'Thank you. I can see that your order was marked as delivered yesterday at 2 PM. Let me check with our shipping partner and initiate a trace on your package immediately.',
    improved_message: 'Thank you for providing that information. I can see your order ORDER-12345 was marked as delivered yesterday at 2 PM to your address. Since you haven\'t received it, I\'m immediately initiating a package trace with our shipping partner and will also check if there were any delivery issues reported. You should receive an update within 24 hours, and I\'ll personally follow up with you tomorrow. In the meantime, I\'m also preparing a replacement shipment that we can send if the original package isn\'t located.',
    reasoning: 'The improved version provides more specific details, sets clear expectations for follow-up, and offers proactive solutions.',
    coaching_suggestions: [
      'Always include specific order details when referencing customer information',
      'Set clear timelines for follow-up communications',
      'Offer proactive solutions before customers need to ask'
    ],
    specific_feedback: [
      {
        original_text: 'your order was marked as delivered',
        suggested_text: 'your order ORDER-12345 was marked as delivered yesterday at 2 PM to your address'
      }
    ],
    long_term_coaching: 'Focus on being more specific with customer information and setting clear expectations for follow-up actions.'
  }
];

interface AgentReport {
  id: string;
  name: string;
  email: string;
  metrics: {
    avg_coherence: number;
    avg_relevance: number;
    avg_politeness: number;
    avg_resolution: number;
    total_chats: number;
    resolved_chats: number;
    total_evaluations: number;
    guideline_compliance: {
      [key: string]: { passed: number; total: number; rate: number };
    };
    top_issues: string[];
    top_highlights: string[];
    recommendations_count: number;
    avg_response_time?: number;
  };
  performance_rating: 'excellent' | 'good' | 'needs_improvement' | 'poor';
  trend: 'improving' | 'stable' | 'declining';
}

const ReportPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [agentReports, setAgentReports] = useState<AgentReport[]>([]);

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

  // Check if user is a demo user
  const isDemoUser = localStorage.getItem('token') === 'demo-token';

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
        setAnalyses(MOCK_ANALYSES);
        setRecommendations(MOCK_RECOMMENDATIONS);
        setAgents(MOCK_AGENTS);
      } else {
        // Fetch real data for managers
        const [logs, evals, analysesData, recommendationsData] = await Promise.all([
          api.chatLogs.getAll(),
          api.evaluations.getAll(),
          api.analysis.getAll(),
          // Note: recommendations.getAll() doesn't exist, so we'll handle this differently
          Promise.resolve([])
        ]);
        
        setChatLogs(logs);
        setEvaluations(evals);
        setAnalyses(analysesData);
        setRecommendations(recommendationsData);
        
        // Get unique agents from chat logs
        const uniqueAgents = Array.from(new Set(logs.map(log => log.agent_id).filter(Boolean))).map(agentId => ({
          id: agentId,
          name: `Agent ${agentId}`,
          email: `agent${agentId}@company.com`
        }));
        setAgents(uniqueAgents);
      }
    } catch (err: any) {
      console.error('Error loading report data:', err);
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  // Generate agent reports
  useEffect(() => {
    if (chatLogs.length === 0 || evaluations.length === 0) return;

    const reports: AgentReport[] = agents.map(agent => {
      const agentChats = chatLogs.filter(chat => chat.agent_id === agent.id);
      const agentEvals = evaluations.filter(evaluation => 
        agentChats.some(chat => chat.id === evaluation.chat_log_id)
      );
      const agentAnalyses = analyses.filter(analysis => 
        agentChats.some(chat => chat.id === analysis.chat_log_id)
      );
      const agentRecommendations = recommendations.filter(rec => 
        agentChats.some(chat => chat.id === rec.chat_log_id)
      );

      // Calculate metrics
      const avg_coherence = agentEvals.length > 0 
        ? agentEvals.reduce((sum, e) => sum + (e.coherence || 0), 0) / agentEvals.length 
        : 0;
      const avg_relevance = agentEvals.length > 0 
        ? agentEvals.reduce((sum, e) => sum + (e.relevance || 0), 0) / agentEvals.length 
        : 0;
      const avg_politeness = agentEvals.length > 0 
        ? agentEvals.reduce((sum, e) => sum + (e.politeness || 0), 0) / agentEvals.length 
        : 0;
      const avg_resolution = agentEvals.length > 0 
        ? agentEvals.reduce((sum, e) => sum + (e.resolution || 0), 0) / agentEvals.length 
        : 0;

      // Calculate guideline compliance
      const guidelineCompliance: { [key: string]: { passed: number; total: number; rate: number } } = {};
      agentAnalyses.forEach(analysis => {
        analysis.guidelines?.forEach(guideline => {
          if (!guidelineCompliance[guideline.name]) {
            guidelineCompliance[guideline.name] = { passed: 0, total: 0, rate: 0 };
          }
          guidelineCompliance[guideline.name].total++;
          if (guideline.passed) {
            guidelineCompliance[guideline.name].passed++;
          }
        });
      });

      // Calculate rates
      Object.keys(guidelineCompliance).forEach(guideline => {
        const stats = guidelineCompliance[guideline];
        stats.rate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
      });

      // Collect top issues and highlights
      const allIssues = agentAnalyses.flatMap(analysis => analysis.issues || []);
      const allHighlights = agentAnalyses.flatMap(analysis => analysis.highlights || []);
      
      const topIssues = [...new Set(allIssues)].slice(0, 5);
      const topHighlights = [...new Set(allHighlights)].slice(0, 5);

      // Calculate performance rating
      const overallScore = (avg_coherence + avg_relevance + avg_politeness + (avg_resolution * 5)) / 4;
      let performance_rating: 'excellent' | 'good' | 'needs_improvement' | 'poor';
      if (overallScore >= 4.5) performance_rating = 'excellent';
      else if (overallScore >= 4.0) performance_rating = 'good';
      else if (overallScore >= 3.0) performance_rating = 'needs_improvement';
      else performance_rating = 'poor';

      // Determine trend (simplified - in real app this would compare to previous periods)
      const trend: 'improving' | 'stable' | 'declining' = 'stable';

      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        metrics: {
          avg_coherence,
          avg_relevance,
          avg_politeness,
          avg_resolution,
          total_chats: agentChats.length,
          resolved_chats: agentChats.length, // Simplified for demo
          total_evaluations: agentEvals.length,
          guideline_compliance: guidelineCompliance,
          top_issues: topIssues,
          top_highlights: topHighlights,
          recommendations_count: agentRecommendations.length
        },
        performance_rating,
        trend
      };
    });

    setAgentReports(reports);
  }, [chatLogs, evaluations, analyses, recommendations, agents]);

  // Filter reports based on selected agent
  const filteredReports = selectedAgent === 'all' 
    ? agentReports 
    : agentReports.filter(report => report.id === selectedAgent);

  // Calculate overall team metrics
  const overallMetrics = filteredReports.length > 0 ? {
    avg_coherence: filteredReports.reduce((sum, r) => sum + r.metrics.avg_coherence, 0) / filteredReports.length,
    avg_relevance: filteredReports.reduce((sum, r) => sum + r.metrics.avg_relevance, 0) / filteredReports.length,
    avg_politeness: filteredReports.reduce((sum, r) => sum + r.metrics.avg_politeness, 0) / filteredReports.length,
    avg_resolution: filteredReports.reduce((sum, r) => sum + r.metrics.avg_resolution, 0) / filteredReports.length,
    total_chats: filteredReports.reduce((sum, r) => sum + r.metrics.total_chats, 0),
    resolved_chats: filteredReports.reduce((sum, r) => sum + r.metrics.resolved_chats, 0),
    total_evaluations: filteredReports.reduce((sum, r) => sum + r.metrics.total_evaluations, 0)
  } : {
    avg_coherence: 0, avg_relevance: 0, avg_politeness: 0, avg_resolution: 0,
    total_chats: 0, resolved_chats: 0, total_evaluations: 0
  };

  const chartData = [
    { label: 'Coherence', value: overallMetrics.avg_coherence, color: 'bg-blue-600' },
    { label: 'Relevance', value: overallMetrics.avg_relevance, color: 'bg-emerald-600' },
    { label: 'Politeness', value: overallMetrics.avg_politeness, color: 'bg-purple-600' },
    { label: 'Resolution', value: overallMetrics.avg_resolution * 5, color: 'bg-yellow-600' }
  ];

  const agentChartData = filteredReports.map((agent: AgentReport) => ({
    label: agent.name.split(' ')[0],
    value: (agent.metrics.avg_coherence + agent.metrics.avg_relevance + agent.metrics.avg_politeness + (agent.metrics.avg_resolution * 5)) / 4,
    color: 'bg-indigo-600'
  }));

  const handleExportPDF = () => {
    // Create a comprehensive PDF report
    const reportContent = generatePDFContent();
    downloadPDF(reportContent);
  };

  const generatePDFContent = () => {
    const selectedAgentData = selectedAgent === 'all' 
      ? filteredReports 
      : filteredReports.filter(r => r.id === selectedAgent);

    return {
      title: `Agent Performance Report - ${selectedAgent === 'all' ? 'All Agents' : selectedAgentData[0]?.name}`,
      date: new Date().toLocaleDateString(),
      overallMetrics,
      agentReports: selectedAgentData,
      chartData,
      agentChartData
    };
  };

  const downloadPDF = (content: any) => {
    // In a real implementation, this would use a library like jsPDF
    // For now, we'll create a downloadable text file
    const reportText = `
AGENT PERFORMANCE REPORT
Generated: ${content.date}
${content.title}

OVERALL TEAM METRICS:
- Average Coherence: ${content.overallMetrics.avg_coherence.toFixed(2)}/5.0
- Average Relevance: ${content.overallMetrics.avg_relevance.toFixed(2)}/5.0
- Average Politeness: ${content.overallMetrics.avg_politeness.toFixed(2)}/5.0
- Average Resolution: ${content.overallMetrics.avg_resolution.toFixed(2)}/5.0
- Total Chats: ${content.overallMetrics.total_chats}
- Resolved Chats: ${content.overallMetrics.resolved_chats}
- Resolution Rate: ${content.overallMetrics.total_chats > 0 ? ((content.overallMetrics.resolved_chats / content.overallMetrics.total_chats) * 100).toFixed(1) : 0}%

AGENT DETAILS:
${content.agentReports.map((agent: AgentReport) => `
${agent.name} (${agent.email})
Performance Rating: ${agent.performance_rating.toUpperCase()}
Trend: ${agent.trend}

Metrics:
- Coherence: ${agent.metrics.avg_coherence.toFixed(2)}/5.0
- Relevance: ${agent.metrics.avg_relevance.toFixed(2)}/5.0
- Politeness: ${agent.metrics.avg_politeness.toFixed(2)}/5.0
- Resolution: ${agent.metrics.avg_resolution.toFixed(2)}/5.0
- Total Chats: ${agent.metrics.total_chats}
- Evaluations: ${agent.metrics.total_evaluations}
- Recommendations: ${agent.metrics.recommendations_count}

Guideline Compliance:
${Object.entries(agent.metrics.guideline_compliance).map(([guideline, stats]: [string, { passed: number; total: number; rate: number }]) => 
  `- ${guideline}: ${stats.rate.toFixed(1)}% (${stats.passed}/${stats.total})`
).join('\n')}

Top Issues:
${agent.metrics.top_issues.map((issue: string) => `- ${issue}`).join('\n')}

Top Highlights:
${agent.metrics.top_highlights.map((highlight: string) => `- ${highlight}`).join('\n')}
`).join('\n')}
    `;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <div className="text-lg text-gray-700 dark:text-gray-200">Loading report data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
        <div className="text-lg text-red-700 dark:text-red-300 mb-2">{error}</div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg mt-2"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agent Performance Report</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive analysis of agent performance and team insights
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
          {isDemoUser && (
            <div className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-medium">
              Demo Mode
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Agent
            </label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Agents</option>
              {agents.map(agent => (
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
              <p>Showing data for {filteredReports.length} agent{filteredReports.length !== 1 ? 's' : ''}</p>
              <p>{overallMetrics.total_chats} total chats analyzed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Team Avg. Score"
          value={((overallMetrics.avg_coherence + overallMetrics.avg_relevance + overallMetrics.avg_politeness + (overallMetrics.avg_resolution * 5)) / 4).toFixed(1)}
          subtitle="out of 5.0"
          icon={BarChart3}
          color="blue"
        />
        <MetricCard
          title="Resolution Rate"
          value={`${overallMetrics.total_chats > 0 ? ((overallMetrics.resolved_chats / overallMetrics.total_chats) * 100).toFixed(0) : 0}%`}
          subtitle={`${overallMetrics.resolved_chats}/${overallMetrics.total_chats} resolved`}
          icon={TrendingUp}
          color="green"
        />
        <MetricCard
          title="Active Agents"
          value={filteredReports.length}
          subtitle="with performance data"
          icon={Users}
          color="purple"
        />
        <MetricCard
          title="Total Evaluations"
          value={overallMetrics.total_evaluations}
          subtitle={`in last ${dateRange} days`}
          icon={FileText}
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

      {/* Detailed Agent Reports */}
      {filteredReports.map(agent => (
        <div key={agent.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{agent.name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{agent.email}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  agent.performance_rating === 'excellent'
                    ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                    : agent.performance_rating === 'good'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                    : agent.performance_rating === 'needs_improvement'
                    ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200'
                    : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                }`}>
                  {agent.performance_rating.replace('_', ' ').toUpperCase()}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  agent.trend === 'improving'
                    ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                    : agent.trend === 'stable'
                    ? 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200'
                    : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                }`}>
                  {agent.trend.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Agent Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{agent.metrics.avg_coherence.toFixed(1)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Coherence</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-emerald-600">{agent.metrics.avg_relevance.toFixed(1)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Relevance</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{agent.metrics.avg_politeness.toFixed(1)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Politeness</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{(agent.metrics.avg_resolution * 5).toFixed(1)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Resolution</div>
              </div>
            </div>

            {/* Activity Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <FileText className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">{agent.metrics.total_chats}</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Total Chats</div>
                </div>
              </div>
              <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <div className="text-lg font-semibold text-green-900 dark:text-green-100">{agent.metrics.resolved_chats}</div>
                  <div className="text-sm text-green-700 dark:text-green-300">Resolved</div>
                </div>
              </div>
              <div className="flex items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Star className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <div className="text-lg font-semibold text-purple-900 dark:text-purple-100">{agent.metrics.recommendations_count}</div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">Recommendations</div>
                </div>
              </div>
            </div>

            {/* Guideline Compliance */}
            {Object.keys(agent.metrics.guideline_compliance).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Guideline Compliance</h3>
                <div className="grid gap-3">
                  {Object.entries(agent.metrics.guideline_compliance).map(([guideline, stats]: [string, { passed: number; total: number; rate: number }]) => (
                    <div key={guideline} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{guideline}</h4>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full ${
                              stats.rate >= 80 ? 'bg-emerald-600' : stats.rate >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${stats.rate}%` }}
                          />
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="font-medium text-gray-900 dark:text-white">{stats.rate.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{stats.passed}/{stats.total}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Issues and Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {agent.metrics.top_issues.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                    Top Issues
                  </h3>
                  <div className="space-y-2">
                    {agent.metrics.top_issues.map((issue: string, index: number) => (
                      <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-sm text-red-800 dark:text-red-200">{issue}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {agent.metrics.top_highlights.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    Top Highlights
                  </h3>
                  <div className="space-y-2">
                    {agent.metrics.top_highlights.map((highlight: string, index: number) => (
                      <div key={index} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm text-green-800 dark:text-green-200">{highlight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {filteredReports.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center py-12">
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Report Data Available</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {selectedAgent === 'all' 
                ? 'No agent performance data is available for the selected criteria.'
                : 'No performance data is available for the selected agent.'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportPage;