import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown, Filter, Database, Edit2, RotateCcw, Loader2, Circle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { MOCK_CHATLOGS, MOCK_EVALUATIONS, MOCK_AGENTS } from '../data/mockData';
import { Analysis, GuidelineResult, ChatLog } from '../types';

const DEFAULT_GUIDELINES: GuidelineResult[] = [
  { name: 'Acknowledge and Empathize', passed: false, description: 'Agent should acknowledge the customer\'s concern and show empathy.' },
  { name: 'Set Clear Expectations', passed: false, description: 'Agent should set clear, actionable expectations for the customer.' },
  { name: 'Proactive Help', passed: false, description: 'Agent should offer proactive solutions and explore alternatives.' },
];

const mapAnalysis = (a: any): Analysis => ({
  ...a,
  chatLogId: a.chat_log_id,
  agentId: a.agent_id,
  analysisSummary: a.analysis_summary,
  errorMessage: a.error_message,
  createdAt: a.created_at,
  updatedAt: a.updated_at,
});

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
      const allAnalyses: Analysis[] = [];
      if (user?.role === 'manager') {
        // Managers can see all analyses
        const analyses = await api.analysis.getAll();
        console.log('Raw analyses from API (manager):', analyses);
        allAnalyses.push(...analyses.map(mapAnalysis));
      } else {
        // Agents see their own analyses - use agentId from user object
        const agentId = user?.agentId || (user as any)?.agent_id;
        if (agentId) {
          const analyses = await api.analysis.getByAgentId(agentId);
          console.log('Raw analyses from API (agent):', analyses);
          allAnalyses.push(...analyses.map(mapAnalysis));
        }
      }
      console.log('Mapped analyses:', allAnalyses);
      setAnalyses(allAnalyses);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const userChats = isDemoUser 
    ? [] // Demo data would be handled differently
    : chatLogs;

  const userAnalyses = isDemoUser 
    ? [] // Demo data would be handled differently
    : analyses;

  const filteredAnalyses = userAnalyses.filter(analysis => {
    const matchesChat = selectedChat === 'all' || analysis.chatLogId === selectedChat;
    const matchesAgent = selectedAgent === 'all' || analysis.agentId === selectedAgent;
    return matchesChat && matchesAgent;
  });

  const currentAnalysis = selectedChat !== 'all'
    ? filteredAnalyses.find(a => a.chatLogId === selectedChat)
    : null;

  // Debug output
  console.log('userChats:', userChats);
  console.log('userAnalyses:', userAnalyses);
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
    return <div className="p-6 text-center text-lg">Loading analysis data...</div>;
  }
  if (error) {
    return <div className="p-6 text-center text-red-600">{error}</div>;
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
        <div className="flex items-center space-x-2">
          {user?.role === 'manager' && (
            <button
              className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              onClick={handleEditGuidelines}
            >
              <Edit2 className="w-4 h-4 mr-2" /> Edit Guidelines
            </button>
          )}
          {!isDemoUser && (
            <button
              className="flex items-center px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
              onClick={handleRefreshAnalyses}
              disabled={refreshing}
              title="Refresh analyses for all chat logs"
            >
              <RotateCcw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Analyses'}
            </button>
          )}
        </div>
      </div>

      {/* Guidelines Editor Modal */}
      {editingGuidelines && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-8 w-full max-w-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">Edit Default Guidelines</h2>
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
                  {chat.id} - {(chat.agent_persona || chat.agent_id || 'Unknown Agent')} ({new Date(chat.created_at || '').toLocaleDateString()})
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
                {userChats.map(chat => (
                  <option key={chat.agent_id} value={chat.agent_id}>{chat.agent_persona || chat.agent_id || 'Unknown Agent'}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Guidelines Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-emerald-600" />
            Guideline Compliance
          </h2>
        </div>
        <div className="p-6">
          {currentAnalysis ? (
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
            {currentAnalysis ? (
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
            {currentAnalysis ? (
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
          {currentAnalysis?.analysisSummary ? (
            <div className="prose dark:prose-invert max-w-none">
              {currentAnalysis.analysisSummary}
            </div>
          ) : (
            <div className="text-gray-600 dark:text-gray-400 text-center py-4">
              No summary available for this chat
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;