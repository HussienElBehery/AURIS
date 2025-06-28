import React, { useState } from 'react';
import { Lightbulb, ArrowRight, BookOpen, Filter, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MOCK_CHATLOGS, MOCK_EVALUATIONS, MOCK_AGENTS } from '../data/mockData';

const RecommendationPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');

  const userChats = user?.role === 'manager' 
    ? MOCK_CHATLOGS 
    : MOCK_CHATLOGS.filter(chat => chat.agentId === user?.id);

  const userEvaluations = MOCK_EVALUATIONS.filter(evaluation => {
    const chat = userChats.find(c => c.id === evaluation.chatLogId);
    return chat !== undefined && evaluation.recommendation;
  });

  const filteredEvaluations = userEvaluations.filter(evaluation => {
    const chat = userChats.find(c => c.id === evaluation.chatLogId);
    if (!chat) return false;
    
    const matchesChat = !selectedChat || evaluation.chatLogId === selectedChat;
    const matchesAgent = selectedAgent === 'all' || chat.agentId === selectedAgent;
    
    return matchesChat && matchesAgent;
  });

  // Set default selected chat if none selected
  React.useEffect(() => {
    if (!selectedChat && filteredEvaluations.length > 0) {
      setSelectedChat(filteredEvaluations[0].chatLogId);
    }
  }, [filteredEvaluations, selectedChat]);

  const currentRecommendation = filteredEvaluations.find(e => e.chatLogId === selectedChat)?.recommendation;
  const currentChat = userChats.find(c => c.id === selectedChat);

  // Aggregate coaching suggestions
  const allCoaching = filteredEvaluations
    .flatMap(evaluation => evaluation.recommendation?.coaching || [])
    .reduce((acc, coaching) => {
      acc[coaching] = (acc[coaching] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const topCoaching = Object.entries(allCoaching)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recommendations</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            AI-powered suggestions for improved customer service
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
              <option value="">Select a chat...</option>
              {userChats.filter(chat => userEvaluations.some(e => e.chatLogId === chat.id)).map(chat => (
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

      {currentRecommendation && selectedChat ? (
        <div className="space-y-6">
          {/* Side-by-side Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-600" />
                Message Improvement for Chat {selectedChat}
                {currentChat && user?.role === 'manager' && (
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    • Agent: {currentChat.agentName}
                  </span>
                )}
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Original Message */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Original Message</h3>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
                    <p className="text-gray-700 dark:text-gray-300">{currentRecommendation.original}</p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="hidden lg:flex items-center justify-center">
                  <ArrowRight className="w-8 h-8 text-gray-400" />
                </div>

                {/* Improved Message */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Improved Message</h3>
                  </div>
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500 rounded-r-lg">
                    <p className="text-gray-700 dark:text-gray-300">{currentRecommendation.improved}</p>
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Why This Improvement Works:</h4>
                <p className="text-blue-800 dark:text-blue-300">{currentRecommendation.reasoning}</p>
              </div>
            </div>
          </div>

          {/* Specific Coaching for Current Chat */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-purple-600" />
                Coaching Suggestions for This Chat
              </h2>
            </div>
            <div className="p-6">
              <div className="grid gap-4">
                {currentRecommendation.coaching.map((suggestion, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium">
                      {index + 1}
                    </div>
                    <p className="text-purple-900 dark:text-purple-200">{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-12 text-center">
            <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Select a Chat for Recommendations
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Choose a chat from the dropdown above to view AI-powered improvement suggestions.
            </p>
          </div>
        </div>
      )}

      {/* Long-term Coaching Section */}
      {topCoaching.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
              {user?.role === 'manager' ? 'Team' : 'Your'} Long-Term Coaching Opportunities
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Common improvement areas identified across multiple interactions
            </p>
          </div>
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {topCoaching.map(([coaching, count]) => (
                <div key={coaching} className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-900 dark:text-blue-200">{coaching}</p>
                  </div>
                  <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full ml-4">
                    {count} times
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Available Recommendations List */}
      {filteredEvaluations.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Available Recommendations ({filteredEvaluations.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEvaluations.map((evaluation) => {
              const chat = userChats.find(c => c.id === evaluation.chatLogId);
              return (
                <div key={evaluation.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Chat {evaluation.chatLogId}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user?.role === 'manager' && chat ? `${chat.agentName} • ` : ''}
                        {chat ? new Date(chat.date).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedChat(evaluation.chatLogId)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        selectedChat === evaluation.chatLogId
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/70'
                      }`}
                    >
                      {selectedChat === evaluation.chatLogId ? 'Selected' : 'View'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendationPage;