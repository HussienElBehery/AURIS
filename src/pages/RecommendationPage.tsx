import React, { useState, useEffect } from 'react';
import { Lightbulb, BookOpen, Database } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MOCK_CHATLOGS, MOCK_EVALUATIONS, MOCK_AGENTS } from '../data/mockData';
import { api } from '../services/api';
import { Recommendation, SpecificFeedbackItem } from '../types';

// Mock recommendation data
const MOCK_RECOMMENDATIONS: Recommendation[] = [
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
      },
      {
        original_text: 'initiate a trace on your package immediately',
        suggested_text: 'initiate a package trace with our shipping partner and will also check if there were any delivery issues reported. You should receive an update within 24 hours, and I\'ll personally follow up with you tomorrow'
      }
    ],
    long_term_coaching: 'Focus on being more specific with customer information and setting clear expectations for follow-up actions.'
  },
  {
    id: 'rec-002',
    chat_log_id: 'chat-002',
    original_message: 'I understand your frustration. Can you tell me more about the issue?',
    improved_message: 'I completely understand your frustration with the product not working as expected. I\'d be happy to help you with a return or exchange. To better assist you, could you please tell me: 1) What specific issue are you experiencing? 2) When did you purchase the item? 3) Have you tried any troubleshooting steps? Based on your answers, I can guide you through our return process or help resolve the issue.',
    reasoning: 'The improved version shows more empathy, provides structure, asks specific questions, and offers multiple solution paths.',
    coaching_suggestions: [
      'Ask specific, structured questions to gather complete information',
      'Offer multiple solution options upfront',
      'Provide clear next steps even when gathering information'
    ],
    specific_feedback: [
      {
        original_text: 'Can you tell me more about the issue?',
        suggested_text: 'could you please tell me: 1) What specific issue are you experiencing? 2) When did you purchase the item? 3) Have you tried any troubleshooting steps?'
      }
    ],
    long_term_coaching: 'Develop structured questioning techniques and always offer multiple solution paths to customers.'
  },
  {
    id: 'rec-003',
    chat_log_id: 'chat-003',
    original_message: 'I can help you with that! You can update your billing address by going to Account Settings > Billing Information.',
    improved_message: 'I can help you with that! You can update your billing address by going to Account Settings > Billing Information. The changes will take effect immediately for future orders. Is there anything else you\'d like me to help you with regarding your account settings?',
    reasoning: 'The improved version provides additional context about when changes take effect and offers to help with related questions.',
    coaching_suggestions: [
      'Provide context about when changes take effect',
      'Offer to help with related questions',
      'Show enthusiasm while being informative'
    ],
    specific_feedback: [
      {
        original_text: 'You can update your billing address by going to Account Settings > Billing Information.',
        suggested_text: 'You can update your billing address by going to Account Settings > Billing Information. The changes will take effect immediately for future orders.'
      }
    ],
    long_term_coaching: 'Always provide context about the impact of changes and offer additional assistance.'
  }
];

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
  
  console.log('RecommendationPage - isDemoUser:', isDemoUser);
  console.log('RecommendationPage - user:', user);
  console.log('RecommendationPage - token:', localStorage.getItem('token'));

  // Load chat logs and recommendations
  useEffect(() => {
    console.log('RecommendationPage - useEffect triggered, isDemoUser:', isDemoUser);
    loadData();
  }, [isDemoUser]);

  const loadData = async () => {
    console.log('RecommendationPage - loadData called, isDemoUser:', isDemoUser);
    setLoading(true);
    setError(null);
    try {
      if (isDemoUser) {
        console.log('RecommendationPage - Using mock data for demo user');
        // Use mock data for demo users
        setChatLogs(MOCK_CHATLOGS);
        setRecommendations(MOCK_RECOMMENDATIONS);
      } else {
        console.log('RecommendationPage - Fetching real data for user:', user);
        const logs = await api.chatLogs.getAll();
        console.log('RecommendationPage - Chat logs fetched:', logs);
        setChatLogs(logs);
        
        const allRecommendations: Recommendation[] = [];
        if (user?.role === 'manager') {
          // Managers can see all recommendations - fetch for each chat
          for (const log of logs) {
            try {
              const recommendation = await api.recommendations.getByChatLogId(log.id);
              if (recommendation) allRecommendations.push(recommendation);
            } catch {
              // Skip if no recommendation exists for this chat
            }
          }
        } else {
          // Agents see their own recommendations
          const agentId = user?.agentId || (user as any)?.agent_id;
          if (agentId) {
            const agentChats = logs.filter(l => l.agent_id === agentId);
            for (const chat of agentChats) {
              try {
                const recommendation = await api.recommendations.getByChatLogId(chat.id);
                if (recommendation) allRecommendations.push(recommendation);
              } catch {
                // Skip if no recommendation exists for this chat
              }
            }
          }
        }
        console.log('RecommendationPage - Recommendations fetched:', allRecommendations);
        setRecommendations(allRecommendations);
      }
    } catch (err: any) {
      console.error('RecommendationPage - Error loading data:', err);
      setError(err.message || 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const userChats = isDemoUser 
    ? MOCK_CHATLOGS
    : chatLogs;

  const userRecommendations = isDemoUser 
    ? MOCK_RECOMMENDATIONS
    : recommendations;

  // Filter recommendations based on selected chat and agent
  const filteredRecommendations = userRecommendations.filter(recommendation => {
    const chat = userChats.find(c => c.id === recommendation.chat_log_id);
    if (!chat) return false;
    
    const matchesChat = selectedChat === 'all' || recommendation.chat_log_id === selectedChat;
    const matchesAgent = selectedAgent === 'all' || chat.agent_id === selectedAgent;
    
    return matchesChat && matchesAgent;
  });

  // Show demo notice for demo users
  if (isDemoUser) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recommendations</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              AI-powered suggestions for improving customer service interactions
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
                  {Array.from(new Set(userRecommendations.map(recommendation => {
                    const chat = userChats.find(c => c.id === recommendation.chat_log_id);
                    return chat?.agent_id;
                  }).filter(Boolean))).map(agentId => (
                    <option key={agentId} value={agentId}>{agentId}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI Recommendations ({filteredRecommendations.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredRecommendations.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                No recommendations found
              </div>
            ) : (
              filteredRecommendations.map((recommendation) => {
                const chat = userChats.find(c => c.id === recommendation.chat_log_id);
                return (
                  <div key={recommendation.id} className="p-6">
                    <div className="mb-4">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {chat?.agent_persona} - {chat?.created_at ? new Date(chat.created_at).toLocaleDateString() : 'N/A'}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Chat ID: {recommendation.chat_log_id}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Original Message</h5>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <p className="text-gray-700 dark:text-gray-300">{recommendation.original_message}</p>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Improved Message</h5>
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          <p className="text-gray-700 dark:text-gray-300">{recommendation.improved_message}</p>
                        </div>
                      </div>

                      {recommendation.reasoning && (
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">AI Reasoning</h5>
                          <p className="text-gray-600 dark:text-gray-400">{recommendation.reasoning}</p>
                        </div>
                      )}

                      {recommendation.coaching_suggestions && recommendation.coaching_suggestions.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">Coaching Suggestions</h5>
                          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                            {recommendation.coaching_suggestions.map((suggestion, index) => (
                              <li key={index}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {recommendation.specific_feedback && recommendation.specific_feedback.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">Specific Feedback</h5>
                          <div className="space-y-2">
                            {recommendation.specific_feedback.map((feedback, index) => (
                              <div key={index} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                <div className="mb-2">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Original:</span>
                                  <p className="text-gray-600 dark:text-gray-400">{feedback.original_text}</p>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Suggested:</span>
                                  <p className="text-gray-600 dark:text-gray-400">{feedback.suggested_text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {recommendation.long_term_coaching && (
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">Long-term Coaching</h5>
                          <p className="text-gray-600 dark:text-gray-400">{recommendation.long_term_coaching}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // Filtering logic
  const filteredChats = userChats.filter(chat => {
    if (user?.role === 'manager' && selectedAgent !== 'all') {
      if (chat.agent_id !== selectedAgent) return false;
    }
    return true;
  });

  const currentRecommendation = selectedChat !== 'all'
    ? filteredRecommendations.find(r => r.chat_log_id === selectedChat)
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
                {Array.from(new Set(userChats.map(chat => chat.agent_id))).filter(Boolean).map(agentId => (
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
              const chat = userChats.find(c => c.id === rec.chat_log_id);
              return (
                <div key={rec.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Chat {chat?.interaction_id || rec.chat_log_id}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user?.role === 'manager' && chat ? `${chat.agent_id} • ` : ''}
                        {chat ? new Date(chat.created_at ?? '').toLocaleDateString() : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedChat(rec.chat_log_id)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        selectedChat === rec.chat_log_id
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/70'
                      }`}
                    >
                      {selectedChat === rec.chat_log_id ? 'Selected' : 'View'}
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
                    • Agent: {userChats.find(c => c.id === selectedChat)?.agent_id}
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