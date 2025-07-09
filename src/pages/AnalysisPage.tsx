import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown, Filter, Database, Edit2, RotateCcw, Loader2, Circle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { MOCK_CHATLOGS, MOCK_EVALUATIONS, MOCK_AGENTS } from '../data/mockData';
import { Analysis, GuidelineResult, ChatLog } from '../types';
import Chart from '../components/Chart';
import MetricCard from '../components/MetricCard';

// Mock analysis data
const MOCK_ANALYSES: Analysis[] = [
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

const DEFAULT_GUIDELINES: GuidelineResult[] = [
  { name: 'Acknowledge and Empathize', passed: false, description: 'Agent should acknowledge the customer\'s concern and show empathy.' },
  { name: 'Set Clear Expectations', passed: false, description: 'Agent should set clear, actionable expectations for the customer.' },
  { name: 'Proactive Help', passed: false, description: 'Agent should offer proactive solutions and explore alternatives.' },
];

// Add a check function for debugging
function checkAnalysisPage({ chatLogs, analyses, filteredAnalyses, currentAnalysis, selectedChat, selectedAgent }: any) {
  console.log('--- AnalysisPage Check ---');
  console.log('chatLogs:', chatLogs);
  console.log('analyses:', analyses);
  console.log('filteredAnalyses:', filteredAnalyses);
  console.log('currentAnalysis:', currentAnalysis);
  console.log('selectedChat:', selectedChat);
  console.log('selectedAgent:', selectedAgent);
  console.log('--------------------------');
}

// Helper to get a friendly chat label (interaction_id only)
function getChatLabel(chatLogs: ChatLog[], chatLogId: string) {
  const chat = chatLogs.find(c => c.id === chatLogId);
  if (!chat) return chatLogId;
  return chat.interaction_id || chat.id;
}

const AnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guidelines, setGuidelines] = useState<GuidelineResult[]>(DEFAULT_GUIDELINES);
  const [editingGuidelines, setEditingGuidelines] = useState(false);
  const [guidelineDraft, setGuidelineDraft] = useState<GuidelineResult[]>(DEFAULT_GUIDELINES);
  const [refreshing, setRefreshing] = useState(false);

  // Check if user is a demo user
  const isDemoUser = localStorage.getItem('token') === 'demo-token';
  
  console.log('AnalysisPage - isDemoUser:', isDemoUser);
  console.log('AnalysisPage - user:', user);
  console.log('AnalysisPage - token:', localStorage.getItem('token'));

  useEffect(() => {
    console.log('AnalysisPage - useEffect triggered, isDemoUser:', isDemoUser);
    loadData();
  }, [isDemoUser]);

  const loadData = async () => {
    console.log('AnalysisPage - loadData called, isDemoUser:', isDemoUser);
    setLoading(true);
    setError(null);
    try {
      if (isDemoUser) {
        console.log('AnalysisPage - Using mock data for demo user');
        // Use mock data for demo users
        setChatLogs(MOCK_CHATLOGS);
        setAnalyses(MOCK_ANALYSES);
      } else {
        console.log('AnalysisPage - Fetching real data for user:', user);
        console.log('User object:', user);
        const logs = await api.chatLogs.getAll();
        console.log('AnalysisPage - Chat logs fetched:', logs);
        setChatLogs(logs);
        const allAnalyses: Analysis[] = [];
        if (user?.role === 'manager') {
          // Managers can see all analyses
          const analyses = await api.analysis.getAll();
          console.log('Raw analyses from API (manager):', analyses);
          allAnalyses.push(...analyses);
        } else {
          // Agents see their own analyses - use agentId from user object
          const agentId = user?.agentId || (user as any)?.agent_id;
          console.log('AgentId used for analysis API:', agentId);
          if (!agentId) {
            console.warn('No agentId found in user object!');
          }
          if (agentId) {
            const analyses = await api.analysis.getByAgentId(agentId);
            console.log('Raw analyses from API (agent):', analyses);
            allAnalyses.push(...analyses);
          }
        }
        console.log('Mapped analyses:', allAnalyses);
        setAnalyses(allAnalyses);
      }
    } catch (err: any) {
      console.error('AnalysisPage - Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const userChats = isDemoUser 
    ? MOCK_CHATLOGS
    : chatLogs;

  const userAnalyses = isDemoUser 
    ? MOCK_ANALYSES
    : analyses;

  // Filtering logic for analyses:
  // - Only include analyses for chats that exist in userChats
  // - Apply chat and agent filters just like EvaluationPage
  const filteredAnalyses = userAnalyses.filter(analysis => {
    const chat = userChats.find(c => c.id === analysis.chat_log_id);
    if (!chat) return false;
    const matchesChat = selectedChat === 'all' || analysis.chat_log_id === selectedChat;
    const matchesAgent = selectedAgent === 'all' || analysis.agent_id === selectedAgent;
    return matchesChat && matchesAgent;
  });

  const currentAnalysis = selectedChat !== 'all' 
    ? filteredAnalyses.find(a => a.chat_log_id === selectedChat)
    : null;

  // Call check function after data is loaded and filters change
  useEffect(() => {
    checkAnalysisPage({ chatLogs, analyses, filteredAnalyses, currentAnalysis, selectedChat, selectedAgent });
  }, [chatLogs, analyses, filteredAnalyses, currentAnalysis, selectedChat, selectedAgent]);

  // Debug output
  console.log('userChats:', userChats);
  console.log('userAnalyses:', userAnalyses);
  console.log('All chat IDs:', userChats.map(c => c.id), 'Types:', userChats.map(c => typeof c.id));
  console.log('All analysis chatLogIds:', userAnalyses.map(a => a.chat_log_id), 'Types:', userAnalyses.map(a => typeof a.chat_log_id));
  console.log('selectedChat:', selectedChat, 'Type:', typeof selectedChat);
  console.log('filteredAnalyses:', filteredAnalyses);
  console.log('currentAnalysis:', currentAnalysis);

  // Guideline editing logic
  const handleEditGuidelines = () => {
    setGuidelineDraft(guidelines);
    setEditingGuidelines(true);
  };
  const handleSaveGuidelines = () => {
    setGuidelines(guidelineDraft);
    setEditingGuidelines(false);
    // TODO: Optionally send to backend to persist
  };
  const handleAddGuideline = () => {
    setGuidelineDraft([...guidelineDraft, { name: '', passed: false, description: '' }]);
  };
  const handleRemoveGuideline = (idx: number) => {
    setGuidelineDraft(guidelineDraft.filter((_, i) => i !== idx));
  };
  const handleGuidelineChange = (idx: number, field: keyof GuidelineResult, value: string) => {
    setGuidelineDraft(guidelineDraft.map((g, i) => i === idx ? { ...g, [field]: value } : g));
  };

  // Refresh analyses (reload data)
  const handleRefreshAnalyses = async () => {
    setRefreshing(true);
    setError(null);
    await loadData();
    setRefreshing(false);
  };

  // UI rendering
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <div className="text-lg text-gray-700 dark:text-gray-200">Loading analysis data...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
        <div className="text-lg text-red-700 dark:text-red-300 mb-2">{error}</div>
        <button
          onClick={handleRefreshAnalyses}
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analysis</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Guideline compliance and detailed insights
          </p>
        </div>
        <button 
          onClick={handleRefreshAnalyses}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <Database className="w-4 h-4" />
          <span>{loading ? 'Loading...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Guidelines Editor Modal */}
      {editingGuidelines && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-8 w-full max-w-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">Edit Guidelines</h2>
            <div className="space-y-4">
              {guidelineDraft.map((g, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    className="border px-2 py-1 rounded w-1/3"
                    value={g.name}
                    onChange={e => handleGuidelineChange(idx, 'name', e.target.value)}
                    placeholder="Guideline name"
                  />
                  <input
                    className="border px-2 py-1 rounded w-2/3"
                    value={g.description}
                    onChange={e => handleGuidelineChange(idx, 'description', e.target.value)}
                    placeholder="Description"
                  />
                  <button
                    className="text-red-600 hover:text-red-800"
                    onClick={() => handleRemoveGuideline(idx)}
                  >Remove</button>
                </div>
              ))}
              <button
                className="mt-2 px-3 py-1 bg-emerald-600 text-white rounded"
                onClick={handleAddGuideline}
              >Add Guideline</button>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
                onClick={() => setEditingGuidelines(false)}
              >Cancel</button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={handleSaveGuidelines}
              >Save</button>
            </div>
          </div>
        </div>
      )}

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
              <option value="all">All Chats (Aggregated)</option>
              {userChats.map(chat => (
                <option key={chat.id} value={chat.id}>
                  {chat.interaction_id} - {(chat.agent_persona || chat.agent_id || 'Unknown Agent')} ({new Date(chat.created_at || '').toLocaleDateString()})
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
                {Array.from(new Set(userAnalyses.map(analysis => analysis.agent_id).filter(Boolean))).map(agentId => (
                  <option key={agentId} value={agentId}>{agentId}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Guidelines Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-emerald-600" />
            Guideline Compliance
          </h2>
          <button
            className="flex items-center space-x-1 px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            onClick={handleEditGuidelines}
          >
            <Edit2 className="w-4 h-4 mr-1" />
            Edit Guidelines
          </button>
        </div>
        <div className="p-6">
          {selectedChat === 'all' ? (
            filteredAnalyses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {DEFAULT_GUIDELINES.map((guideline, idx) => {
                  let passCount = 0;
                  let failCount = 0;
                  filteredAnalyses.forEach(analysis => {
                    const found = analysis.guidelines?.find(g => g.name === guideline.name);
                    if (found) {
                      if (found.passed) passCount++;
                      else failCount++;
                    }
                  });
                  const total = passCount + failCount;
                  const passPercent = total > 0 ? ((passCount / total) * 100).toFixed(0) : '0';
                  const failPercent = total > 0 ? ((failCount / total) * 100).toFixed(0) : '0';
                  return (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex flex-col items-center shadow-sm">
                      <div className="flex items-center mb-2">
                        <span className="font-semibold text-lg text-gray-900 dark:text-white mr-2">{guideline.name}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">{guideline.description}</p>
                      <div className="flex items-center space-x-4 mt-auto">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                            <span className="font-medium text-emerald-700 dark:text-emerald-300">{passCount} Passed</span>
                          </div>
                          <span className="text-xs text-emerald-700 dark:text-emerald-300">{passPercent}%</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="flex items-center space-x-1">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <span className="font-medium text-red-700 dark:text-red-300">{failCount} Failed</span>
                          </div>
                          <span className="text-xs text-red-700 dark:text-red-300">{failPercent}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-600 dark:text-gray-400 text-center py-4">
                No guideline data available for this chat
              </div>
            )
          ) : (
            currentAnalysis ? (
              <div className="space-y-4">
                {currentAnalysis.guidelines?.map((guideline, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center space-x-3">
                      {guideline.passed ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{guideline.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{guideline.description}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      guideline.passed 
                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200'
                        : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                    }`}>
                      {guideline.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-600 dark:text-gray-400 text-center py-4">
                No guideline data available for this chat
              </div>
            )
          )}
        </div>
      </div>

      {/* Issues and Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Issues */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <TrendingDown className="w-5 h-5 mr-2 text-red-600" />
              Key Issues
            </h2>
          </div>
          <div className="p-6">
            {selectedChat === 'all' ? (
              filteredAnalyses.length > 0 ? (
                <div className="max-h-96 overflow-y-auto pr-2">
                  {filteredAnalyses.map((analysis, idx) => (
                    <div key={analysis.id || idx} className="mb-8">
                      <div className="mb-2 font-semibold text-blue-700 dark:text-blue-300">
                        Chat: {getChatLabel(userChats, analysis.chat_log_id)}
                      </div>
                      {analysis.issues && analysis.issues.length > 0 ? (
                        analysis.issues.map((issue, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-900/50 rounded-lg mb-2">
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-800 dark:text-red-200">{issue}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                          No issues identified for this chat
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-600 dark:text-gray-400 text-center py-4">
                  No issues data available
                </div>
              )
            ) : (
              currentAnalysis ? (
                <div className="space-y-3">
                  {currentAnalysis.issues && currentAnalysis.issues.length > 0 ? (
                    currentAnalysis.issues.map((issue, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-900/50 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-800 dark:text-red-200">{issue}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                      No issues identified for this chat
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-gray-600 dark:text-gray-400 text-center py-4">
                  No issues data available
                </div>
              )
            )}
          </div>
        </div>

        {/* Positive Highlights */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-emerald-600" />
              Positive Highlights
            </h2>
          </div>
          <div className="p-6">
            {selectedChat === 'all' ? (
              filteredAnalyses.length > 0 ? (
                <div className="max-h-96 overflow-y-auto pr-2">
                  {filteredAnalyses.map((analysis, idx) => (
                    <div key={analysis.id || idx} className="mb-8">
                      <div className="mb-2 font-semibold text-blue-700 dark:text-blue-300">
                        Chat: {getChatLabel(userChats, analysis.chat_log_id)}
                      </div>
                      {analysis.highlights && analysis.highlights.length > 0 ? (
                        analysis.highlights.map((highlight, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-emerald-50 dark:bg-emerald-900/50 rounded-lg mb-2">
                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-emerald-800 dark:text-emerald-200">{highlight}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                          No highlights identified for this chat
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-600 dark:text-gray-400 text-center py-4">
                  No highlights data available
                </div>
              )
            ) : (
              currentAnalysis ? (
                <div className="space-y-3">
                  {currentAnalysis.highlights && currentAnalysis.highlights.length > 0 ? (
                    currentAnalysis.highlights.map((highlight, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-emerald-50 dark:bg-emerald-900/50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-emerald-800 dark:text-emerald-200">{highlight}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                      No highlights identified for this chat
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-gray-600 dark:text-gray-400 text-center py-4">
                  No highlights data available
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Analysis Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Filter className="w-5 h-5 mr-2 text-blue-600" />
            Analysis Summary
          </h2>
        </div>
        <div className="p-6">
          {selectedChat === 'all' ? (
            filteredAnalyses.length > 0 ? (
              <div className="max-h-96 overflow-y-auto pr-2">
                {filteredAnalyses.map((analysis, idx) => (
                  <div key={analysis.id || idx} className="mb-8">
                    <div className="mb-2 font-semibold text-blue-700 dark:text-blue-300">
                      Chat: {getChatLabel(userChats, analysis.chat_log_id)}
                    </div>
                    {analysis.analysis_summary ? (
                      <div className="prose dark:prose-invert max-w-none text-gray-900 dark:text-gray-100 font-medium">
                        {analysis.analysis_summary}
                      </div>
                    ) : (
                      <div className="text-gray-600 dark:text-gray-400 text-center py-4">
                        No summary available for this chat
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-600 dark:text-gray-400 text-center py-4">
                No summary available for this chat
              </div>
            )
          ) : (
            currentAnalysis?.analysis_summary ? (
              <div className="prose dark:prose-invert max-w-none text-gray-900 dark:text-gray-100 font-medium">
                {currentAnalysis.analysis_summary}
              </div>
            ) : (
              <div className="text-gray-600 dark:text-gray-400 text-center py-4">
                No summary available for this chat
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;