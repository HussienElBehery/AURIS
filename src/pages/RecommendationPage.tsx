import React, { useState, useEffect } from 'react';
import { Lightbulb, BookOpen, Database } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MOCK_CHATLOGS, MOCK_EVALUATIONS, MOCK_AGENTS } from '../data/mockData';
import { api } from '../services/api';
import { Recommendation, SpecificFeedbackItem } from '../types';

const RecommendationPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [chatLogs, setChatLogs] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is a demo user
  const isDemoUser = localStorage.getItem('token') === 'demo-token';

  // Load chat logs and recommendations
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
      const allRecs: Recommendation[] = [];
      if (user?.role === 'manager') {
        // Managers can see all recommendations
        // (Assume you have an endpoint to get all recommendations, otherwise fetch per chat)
        for (const log of logs) {
          try {
            const rec = await api.recommendations.getByChatLogId(log.id);
            if (rec) allRecs.push(rec);
          } catch {}
        }
      } else {
        // Agents see their own recommendations
        const agentId = user?.agentId || (user as any)?.agent_id;
        if (agentId) {
          for (const log of logs.filter(l => l.agent_id === agentId)) {
            try {
              const rec = await api.recommendations.getByChatLogId(log.id);
              if (rec) allRecs.push(rec);
            } catch {}
          }
        }
      }
      setRecommendations(allRecs);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filtering logic
  const filteredChats = chatLogs.filter(chat => {
    if (user?.role === 'manager' && selectedAgent !== 'all') {
      if (chat.agent_id !== selectedAgent) return false;
    }
    return true;
  });

  const filteredRecommendations = recommendations.filter(rec => {
    const chat = chatLogs.find(c => c.id === rec.chatLogId);
    if (!chat) return false;
    const matchesChat = selectedChat === 'all' || rec.chatLogId === selectedChat;
    const matchesAgent = selectedAgent === 'all' || chat.agent_id === selectedAgent;
    return matchesChat && matchesAgent;
  });

  const currentRecommendation = selectedChat !== 'all'
    ? filteredRecommendations.find(r => r.chatLogId === selectedChat)
    : null;

  // UI rendering
  if (loading) {
    return <div className="p-6 text-center text-lg flex items-center justify-center"><Database className="w-8 h-8 animate-spin text-blue-600 mr-2" /> Loading recommendations...</div>;
  }
  if (error) {
    return <div className="p-6 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recommendations</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            AI-powered suggestions for improved customer service
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
              <option value="all">All Chats</option>
              {filteredChats.map(chat => (
                <option key={chat.id} value={chat.id}>
                  {chat.interaction_id || chat.id} - {chat.agent_id} ({new Date(chat.created_at ?? '').toLocaleDateString()})
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
                {Array.from(new Set(chatLogs.map(chat => chat.agent_id))).filter(Boolean).map(agentId => (
                  <option key={agentId} value={agentId}>{agentId}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filteredRecommendations.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center py-12">
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Recommendations Available</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              AI-powered recommendations will appear here once you start using the system and have evaluated chat logs
            </p>
          </div>
        </div>
      )}

      {/* All Chats: Summary List */}
      {selectedChat === 'all' && filteredRecommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Available Recommendations ({filteredRecommendations.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredRecommendations.map((rec) => {
              const chat = chatLogs.find(c => c.id === rec.chatLogId);
              return (
                <div key={rec.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Chat {chat?.interaction_id || rec.chatLogId}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user?.role === 'manager' && chat ? `${chat.agent_id} • ` : ''}
                        {chat ? new Date(chat.created_at ?? '').toLocaleDateString() : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedChat(rec.chatLogId)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        selectedChat === rec.chatLogId
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/70'
                      }`}
                    >
                      {selectedChat === rec.chatLogId ? 'Selected' : 'View'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Single Chat: Detailed Recommendation */}
      {selectedChat !== 'all' && (
        <div className="space-y-6">
          {/* Specific Feedback List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-600" />
                Message Improvements for Chat {selectedChat}
                {user?.role === 'manager' && (
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    • Agent: {chatLogs.find(c => c.id === selectedChat)?.agent_id}
                  </span>
                )}
              </h2>
            </div>
            <div className="p-6">
              {currentRecommendation && currentRecommendation.specific_feedback && currentRecommendation.specific_feedback.length > 0 ? (
                <div className="space-y-4">
                  {currentRecommendation.specific_feedback.map((fb: SpecificFeedbackItem, idx: number) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
                        <span className="block text-xs text-gray-500 mb-1">Original</span>
                        <span className="text-gray-700 dark:text-gray-300">{fb.original_text}</span>
                      </div>
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500 rounded-r-lg">
                        <span className="block text-xs text-gray-500 mb-1">Suggested</span>
                        <span className="text-gray-700 dark:text-gray-300">{fb.suggested_text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Lightbulb className="w-10 h-10 text-gray-400 mb-2" />
                  <span className="text-gray-500 dark:text-gray-400">No message improvements available.</span>
                </div>
              )}
            </div>
          </div>
          {/* Long Term Coaching */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-purple-600" />
                Long-Term Coaching Suggestions
              </h2>
            </div>
            <div className="p-6">
              {currentRecommendation && typeof currentRecommendation.long_term_coaching === 'string' && currentRecommendation.long_term_coaching ? (
                <div className="text-purple-900 dark:text-purple-200 whitespace-pre-line">{currentRecommendation.long_term_coaching}</div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <BookOpen className="w-10 h-10 text-gray-400 mb-2" />
                  <span className="text-gray-500 dark:text-gray-400">No long-term coaching suggestions available.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendationPage;