import React, { useState, useEffect } from 'react';
import { Upload, Search, Filter, Download, Eye, Trash2, Plus, Database } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { ChatLog, ProcessingStatus } from '../types';
import ChatLogUpload from '../components/ChatLogUpload';
import { MOCK_CHATLOGS, MOCK_AGENTS } from '../data/mockData';

const ChatsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'view' | 'upload'>('view');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    // Filter by user role (agents only see their own chats)
    if (user?.role === 'agent' && chat.agentId !== user.id) {
      return false;
    }

    const matchesSearch = chat.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chat.interactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (chat.agentId && chat.agentId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || chat.status === filterStatus;
    const matchesAgent = selectedAgent === 'all' || chat.agentId === selectedAgent;
    
    return matchesSearch && matchesStatus && matchesAgent;
  });

  const handleUploadSuccess = (chatLog: ChatLog) => {
    // Add the new chat log to the list
    setChatLogs(prev => [chatLog, ...prev]);
  };

  const handleProcessingComplete = (chatLogId: string) => {
    // Refresh the chat logs to get updated status
    loadChatLogs();
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

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
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
                <button 
                  onClick={loadChatLogs}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Database className="w-4 h-4" />
                  <span>{loading ? 'Loading...' : 'Refresh'}</span>
                </button>
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
                          {chat.interactionId}
                        </td>
                        {user?.role === 'manager' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {chat.agentId || 'N/A'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(chat.createdAt || '').toLocaleDateString()}
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
                            <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
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
          
          {/* JSON Structure Guide */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">?</span>
              </div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                Chat Log JSON Format Guide
              </h3>
            </div>
            
            <p className="text-blue-800 dark:text-blue-200 mb-4">
              Your JSON file should follow this exact structure. All fields are required unless marked as optional.
            </p>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
{`{
  "interactionId": "chat_12345",
  "agentId": "agent_001",
  "customerId": "customer_456",
  "startTime": "2024-01-15T10:30:00Z",
  "endTime": "2024-01-15T10:45:00Z",
  "transcript": [
    {
      "timestamp": "2024-01-15T10:30:15Z",
      "sender": "customer",
      "message": "Hello, I need help with my order",
      "messageType": "text"
    },
    {
      "timestamp": "2024-01-15T10:30:20Z", 
      "sender": "agent",
      "message": "Hi! I'd be happy to help. Can you provide your order number?",
      "messageType": "text"
    },
    {
      "timestamp": "2024-01-15T10:30:25Z",
      "sender": "customer", 
      "message": "Yes, it's #ORD-789456",
      "messageType": "text"
    }
  ],
  "metadata": {
    "channel": "web_chat",
    "language": "en",
    "category": "order_inquiry"
  }
}`}
              </pre>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Required Fields:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">interactionId</code> - Unique chat identifier</li>
                  <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">agentId</code> - Agent who handled the chat</li>
                  <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">customerId</code> - Customer identifier</li>
                  <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">startTime</code> - Chat start timestamp (ISO 8601)</li>
                  <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">endTime</code> - Chat end timestamp (ISO 8601)</li>
                  <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">transcript</code> - Array of message objects</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Message Object Fields:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">timestamp</code> - Message time (ISO 8601)</li>
                  <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">sender</code> - "customer" or "agent"</li>
                  <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">message</code> - Message content</li>
                  <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">messageType</code> - "text", "image", etc.</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Tip:</strong> You can also upload multiple chat logs in a single JSON array: <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">[&#123;chat1&#125;, &#123;chat2&#125;, ...]</code>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatsPage;