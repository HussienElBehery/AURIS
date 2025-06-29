import React, { useState, useEffect } from 'react';
import { Upload, Search, Filter, Download, Eye, Trash2, Plus, Database, X, CheckCircle, XCircle, Loader2, Circle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { ChatLog, ProcessingStatus } from '../types';
import ChatLogUpload from '../components/ChatLogUpload';
import { MOCK_CHATLOGS, MOCK_AGENTS } from '../data/mockData';

const ChatsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'view' | 'upload'>('view');
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | ProcessingStatus>('all');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedChat, setSelectedChat] = useState<ChatLog | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState<{ evaluation: string; analysis: string; recommendation: string } | null>(null);

  // Check if user is a demo user
  const isDemoUser = localStorage.getItem('token') === 'demo-token';

  // Load chat logs
  useEffect(() => {
    loadChatLogs();
  }, []);

  const loadChatLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const logs = await api.chatLogs.getAll();
      setChatLogs(logs);
    } catch (err: any) {
      setError(err.message || 'Failed to load chat logs');
      console.error('Error loading chat logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter chat logs based on user role and search criteria
  const filteredChats = chatLogs.filter(chat => {
    // For agents, they should only see their own chats (already filtered by backend)
    // For managers, they can see all chats but can filter by agent
    if (user?.role === 'manager' && selectedAgent !== 'all') {
      // Manager filtering by specific agent
      if (chat.agent_id !== selectedAgent) {
        return false;
      }
    }

    const matchesSearch = chat.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chat.interaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (chat.agent_id && chat.agent_id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || chat.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleUploadSuccess = (chatLog: ChatLog) => {
    // Add the new chat log to the list
    setChatLogs(prev => [chatLog, ...prev]);
  };

  const handleProcessingComplete = (chatLogId: string) => {
    // Refresh the chat logs list
    loadChatLogs();
  };

  const handleDeleteChat = async (chatLogId: string) => {
    if (!confirm('Are you sure you want to delete this chat log? This action cannot be undone.')) {
      return;
    }

    try {
      await api.chatLogs.delete(chatLogId);
      // Refresh the chat logs list
      loadChatLogs();
    } catch (error) {
      console.error('Error deleting chat log:', error);
      setError('Failed to delete chat log');
    }
  };

  const getStatusColor = (status: ProcessingStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  const fetchAgentStatuses = async (chatLogId: string) => {
    try {
      // Default: not started
      let evaluation = 'not_started', analysis = 'not_started', recommendation = 'not_started';
      // Try to fetch evaluation
      try {
        const evalData = await api.evaluations.getByChatLogId(chatLogId);
        evaluation = evalData && !evalData.errorMessage ? 'completed' : 'failed';
      } catch { evaluation = 'not_started'; }
      // Try to fetch analysis
      try {
        const analysisData = await api.analysis.getByChatLogId(chatLogId);
        analysis = analysisData && !analysisData.errorMessage ? 'completed' : 'failed';
      } catch { analysis = 'not_started'; }
      // Try to fetch recommendation
      try {
        const recData = await api.recommendations.getByChatLogId(chatLogId);
        recommendation = recData && !recData.errorMessage ? 'completed' : 'failed';
      } catch { recommendation = 'not_started'; }
      setAgentStatuses({ evaluation, analysis, recommendation });
    } catch {
      setAgentStatuses(null);
    }
  };

  const handleViewChat = (chat: ChatLog) => {
    setSelectedChat(chat);
    setShowViewModal(true);
    fetchAgentStatuses(chat.id);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chat Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage customer service chat logs
          </p>
        </div>
        {isDemoUser && (
          <div className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-medium">
            Demo Mode
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('view')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'view'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            View Chats
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Upload Chats
          </button>
        </nav>
      </div>

      {activeTab === 'view' && (
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Filters and Refresh */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Filters</h3>
              <button
                onClick={loadChatLogs}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    Refresh
                  </>
                )}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by interaction ID or agent..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {user?.role === 'manager' && (
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
                    {isDemoUser ? MOCK_AGENTS.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    )) : (
                      // TODO: Load real agents when available
                      <option value="agent-1">Agent 1</option>
                    )}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Chat Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Chat Logs ({filteredChats.length})
                </h2>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Interaction ID
                    </th>
                    {user?.role === 'manager' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Agent
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Messages
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredChats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        {loading ? 'Loading chat logs...' : 'No chat logs found'}
                      </td>
                    </tr>
                  ) : (
                    filteredChats.map((chat) => (
                      <tr key={chat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {chat.interaction_id}
                        </td>
                        {user?.role === 'manager' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {chat.agent_id || 'N/A'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {(() => {
                            try {
                              if (!chat.created_at) return 'N/A';
                              const date = new Date(chat.created_at);
                              return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
                            } catch {
                              return 'N/A';
                            }
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(chat.status)}`}>
                            {chat.status.charAt(0).toUpperCase() + chat.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {chat.transcript.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" onClick={() => handleViewChat(chat)}>
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" onClick={() => handleDeleteChat(chat.id)}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="space-y-6">
          <ChatLogUpload 
            onUploadSuccess={handleUploadSuccess}
            onProcessingComplete={handleProcessingComplete}
          />
        </div>
      )}

      {/* View Modal */}
      {selectedChat && showViewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Chat Log Details
              </h2>
              <button 
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Chat Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Interaction ID</label>
                  <p className="text-sm text-gray-900 dark:text-white font-mono">{selectedChat.interaction_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Agent ID</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedChat.agent_id || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedChat.status)}`}>
                    {selectedChat.status.charAt(0).toUpperCase() + selectedChat.status.slice(1)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Date</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {(() => {
                      try {
                        if (!selectedChat.created_at) return 'N/A';
                        const date = new Date(selectedChat.created_at);
                        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
                      } catch {
                        return 'N/A';
                      }
                    })()}
                  </p>
                </div>
              </div>

              {/* Agent Status Indicators */}
              {agentStatuses && (
                <div className="flex items-center space-x-4 mb-4">
                  <span className="flex items-center space-x-1" title="Evaluation status">
                    <span className="font-bold">E</span>
                    {agentStatuses.evaluation === 'completed' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                    {agentStatuses.evaluation === 'failed' && <XCircle className="w-4 h-4 text-red-600" />}
                    {agentStatuses.evaluation === 'not_started' && <Circle className="w-4 h-4 text-gray-400" />}
                  </span>
                  <span className="flex items-center space-x-1" title="Analysis status">
                    <span className="font-bold">A</span>
                    {agentStatuses.analysis === 'completed' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                    {agentStatuses.analysis === 'failed' && <XCircle className="w-4 h-4 text-red-600" />}
                    {agentStatuses.analysis === 'not_started' && <Circle className="w-4 h-4 text-gray-400" />}
                  </span>
                  <span className="flex items-center space-x-1" title="Recommendation status">
                    <span className="font-bold">R</span>
                    {agentStatuses.recommendation === 'completed' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                    {agentStatuses.recommendation === 'failed' && <XCircle className="w-4 h-4 text-red-600" />}
                    {agentStatuses.recommendation === 'not_started' && <Circle className="w-4 h-4 text-gray-400" />}
                  </span>
                </div>
              )}

              {/* Transcript */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Chat Transcript</h3>
                <div className="space-y-3">
                  {selectedChat.transcript.map((message, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg ${
                        message.sender === 'customer' 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' 
                          : 'bg-gray-50 dark:bg-gray-700 border-l-4 border-gray-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              message.sender === 'customer'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                            }`}>
                              {message.sender.charAt(0).toUpperCase() + message.sender.slice(1)}
                            </span>
                            {message.timestamp && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                {new Date(message.timestamp).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-900 dark:text-white">{message.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatsPage;