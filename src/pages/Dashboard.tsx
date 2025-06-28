import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MOCK_DASHBOARD_STATS, MOCK_CHATLOGS } from '../data/mockData';
import MetricCard from '../components/MetricCard';
import Chart from '../components/Chart';
import { 
  Brain, 
  MessageSquare, 
  Heart, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  Users
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  const stats = user?.role === 'manager' 
    ? MOCK_DASHBOARD_STATS.manager 
    : MOCK_DASHBOARD_STATS[user?.id || '1'];

  const userChats = user?.role === 'manager' 
    ? MOCK_CHATLOGS 
    : MOCK_CHATLOGS.filter(chat => chat.agentId === user?.id);

  const recentUnresolved = userChats.filter(chat => !chat.resolved).slice(0, 5);

  const chartData = [
    { label: 'Coherence', value: stats.avgCoherence, color: 'bg-blue-600' },
    { label: 'Relevance', value: stats.avgRelevance, color: 'bg-emerald-600' },
    { label: 'Politeness', value: stats.avgPoliteness, color: 'bg-purple-600' },
    { label: 'Resolution', value: stats.avgResolution * 5, color: 'bg-yellow-600' }
  ];

  const agentPerformanceData = user?.role === 'manager' ? [
    { label: 'Sarah J.', value: 4.2, color: 'bg-blue-600' },
    { label: 'Alex R.', value: 3.8, color: 'bg-emerald-600' },
    { label: 'Emma D.', value: 4.5, color: 'bg-purple-600' },
    { label: 'Mike T.', value: 3.9, color: 'bg-yellow-600' }
  ] : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {user?.role === 'manager' 
              ? 'Overview of team performance and metrics' 
              : 'Your performance overview and recent activity'
            }
          </p>
        </div>
        {user?.role === 'manager' && (
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
            <Users className="w-5 h-5" />
            <span className="font-medium">4 Active Agents</span>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Avg. Coherence"
          value={stats.avgCoherence.toFixed(1)}
          subtitle="out of 5.0"
          icon={Brain}
          color="blue"
          trend="up"
        />
        <MetricCard
          title="Avg. Relevance"
          value={stats.avgRelevance.toFixed(1)}
          subtitle="out of 5.0"
          icon={MessageSquare}
          color="green"
          trend="up"
        />
        <MetricCard
          title="Avg. Politeness"
          value={stats.avgPoliteness.toFixed(1)}
          subtitle="out of 5.0"
          icon={Heart}
          color="purple"
          trend="neutral"
        />
        <MetricCard
          title="Resolution Rate"
          value={`${(stats.avgResolution * 100).toFixed(0)}%`}
          subtitle={`${stats.totalChats - stats.unresolvedChats}/${stats.totalChats} resolved`}
          icon={CheckCircle}
          color="yellow"
          trend="up"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Chart
          data={chartData}
          type="bar"
          title={user?.role === 'manager' ? 'Team Average Metrics' : 'Your Performance Metrics'}
        />
        
        {user?.role === 'manager' && (
          <Chart
            data={agentPerformanceData}
            type="bar"
            title="Agent Performance Overview"
          />
        )}
        
        {user?.role === 'agent' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-emerald-600" />
              Performance Trends
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">This Week</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">+12% improvement</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Response Time</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">Avg. 2.3 min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Customer Satisfaction</span>
                <span className="text-purple-600 dark:text-purple-400 font-medium">4.6/5.0</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Unresolved Chats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
            {user?.role === 'manager' ? 'Unresolved Chats Across Team' : 'Your Unresolved Chats'}
          </h2>
        </div>
        <div className="p-6">
          {recentUnresolved.length > 0 ? (
            <div className="space-y-4">
              {recentUnresolved.map((chat) => (
                <div key={chat.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Chat #{chat.id}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {user?.role === 'manager' ? `Agent: ${chat.agentName} • ` : ''}
                      {new Date(chat.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 text-xs rounded-full">
                      Unresolved
                    </span>
                    <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {user?.role === 'manager' 
                  ? 'All team chats are resolved!' 
                  : 'All your chats are resolved!'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;