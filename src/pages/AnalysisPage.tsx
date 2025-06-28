import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MOCK_CHATLOGS, MOCK_EVALUATIONS, MOCK_AGENTS } from '../data/mockData';

const AnalysisPage: React.FC = () => {
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

  // Calculate guideline statistics
  const guidelineStats = filteredEvaluations.reduce((acc, evaluation) => {
    evaluation.guidelines.forEach(guideline => {
      if (!acc[guideline.name]) {
        acc[guideline.name] = { passed: 0, total: 0, description: guideline.description };
      }
      acc[guideline.name].total++;
      if (guideline.passed) acc[guideline.name].passed++;
    });
    return acc;
  }, {} as Record<string, { passed: number; total: number; description: string }>);

  // Aggregate issues and highlights
  const allIssues = filteredEvaluations.flatMap(evaluation => evaluation.issues);
  const allHighlights = filteredEvaluations.flatMap(evaluation => evaluation.highlights);

  const issueFrequency = allIssues.reduce((acc, issue) => {
    acc[issue] = (acc[issue] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const highlightFrequency = allHighlights.reduce((acc, highlight) => {
    acc[highlight] = (acc[highlight] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topIssues = Object.entries(issueFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const topHighlights = Object.entries(highlightFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analysis</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Guideline compliance and detailed insights
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
              <option value="all">All Chats (Aggregated)</option>
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

      {/* Guidelines Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-emerald-600" />
            Guideline Compliance
          </h2>
        </div>
        <div className="p-6">
          {currentEvaluation ? (
            // Single chat guidelines
            <div className="space-y-4">
              {currentEvaluation.guidelines.map((guideline, index) => (
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
            // Aggregated guidelines
            <div className="space-y-4">
              {Object.entries(guidelineStats).map(([name, stats]) => {
                const passRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
                return (
                  <div key={name} className="p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">{name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        passRate >= 80 
                          ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200'
                          : passRate >= 60 
                          ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200'
                          : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                      }`}>
                        {passRate.toFixed(0)}% Pass Rate
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{stats.description}</p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          passRate >= 80 
                            ? 'bg-emerald-600' 
                            : passRate >= 60 
                            ? 'bg-yellow-600' 
                            : 'bg-red-600'
                        }`}
                        style={{ width: `${passRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {stats.passed} out of {stats.total} chats passed
                    </p>
                  </div>
                );
              })}
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
            {currentEvaluation ? (
              <div className="space-y-3">
                {currentEvaluation.issues.length > 0 ? (
                  currentEvaluation.issues.map((issue, index) => (
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
              <div className="space-y-3">
                {topIssues.length > 0 ? (
                  topIssues.map(([issue, count]) => (
                    <div key={issue} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/50 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-800 dark:text-red-200">{issue}</p>
                      </div>
                      <span className="text-xs bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 px-2 py-1 rounded-full">
                        {count}x
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                    No issues identified
                  </p>
                )}
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
            {currentEvaluation ? (
              <div className="space-y-3">
                {currentEvaluation.highlights.length > 0 ? (
                  currentEvaluation.highlights.map((highlight, index) => (
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
              <div className="space-y-3">
                {topHighlights.length > 0 ? (
                  topHighlights.map(([highlight, count]) => (
                    <div key={highlight} className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/50 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-emerald-800 dark:text-emerald-200">{highlight}</p>
                      </div>
                      <span className="text-xs bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 px-2 py-1 rounded-full">
                        {count}x
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                    No highlights identified
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;