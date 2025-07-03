import React, { useEffect, useState } from 'react';
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
  Users,
  Database
} from 'lucide-react';
import { api } from '../services/api';
import type { ChatLog, Evaluation, Analysis, Recommendation } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Check if user is a demo user
  const isDemoUser = localStorage.getItem('token') === 'demo-token';
  
  // Get stats based on user role and ID, with fallback to default stats
  const getStats = () => {
    // Only show mock data for demo users
    if (!isDemoUser) {
      // For official users, return empty/placeholder stats
      return {
        avgCoherence: 0,
        avgRelevance: 0,
        avgPoliteness: 0,
        avgResolution: 0,
        totalChats: 0,
        unresolvedChats: 0
      };
    }
    
    if (user?.role === 'manager') {
      return MOCK_DASHBOARD_STATS.manager;
    }
    
    // For agents, try to find stats by user ID, fallback to default agent stats
    const userStats = MOCK_DASHBOARD_STATS[user?.id || '1'];
    if (userStats) {
      return userStats;
    }
    
    // Fallback stats for new users
    return {
      avgCoherence: 4.0,
      avgRelevance: 4.2,
      avgPoliteness: 4.3,
      avgResolution: 0.75,
      totalChats: 15,
      unresolvedChats: 2
    };
  };

  const stats = getStats();

  const userChats = isDemoUser 
    ? (user?.role === 'manager' 
        ? MOCK_CHATLOGS 
        : MOCK_CHATLOGS.filter(chat => chat.agent_id === user?.id))
    : []; // Empty array for official users

  const recentUnresolved = userChats.slice(0, 5);

  const chartData = [
    { label: 'Coherence', value: stats.avgCoherence, color: 'bg-blue-600' },
    { label: 'Relevance', value: stats.avgRelevance, color: 'bg-emerald-600' },
    { label: 'Politeness', value: stats.avgPoliteness, color: 'bg-purple-600' },
    { label: 'Resolution', value: stats.avgResolution * 5, color: 'bg-yellow-600' }
  ];

  const agentPerformanceData = isDemoUser && user?.role === 'manager' ? [
    { label: 'Sarah J.', value: 4.2, color: 'bg-blue-600' },
    { label: 'Alex R.', value: 3.8, color: 'bg-emerald-600' },
    { label: 'Emma D.', value: 4.5, color: 'bg-purple-600' },
    { label: 'Mike T.', value: 3.9, color: 'bg-yellow-600' }
  ] : [];

  // Show demo notice for demo users
  if (isDemoUser) {
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
          <div className="flex items-center space-x-2">
            {user?.role === 'manager' && (
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                <Users className="w-5 h-5" />
                <span className="font-medium">4 Active Agents</span>
              </div>
            )}
            <div className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-medium">
              Demo Mode
            </div>
          </div>
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
                {recentUnresolved.map((chat: any) => (
                  <div key={chat.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Chat #{chat.id}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user?.role === 'manager' ? `Agent: ${chat.agent_id} • ` : ''}
                        {chat.created_at ? new Date(chat.created_at).toLocaleDateString() : ''}
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
  }

  // For official users, show real data interface
  if (!isDemoUser) {
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
              <span className="font-medium">Connected to Database</span>
            </div>
          )}
        </div>
        {!isDemoUser && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-center py-8">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Data Available</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Performance metrics will appear here once you start using the system
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // For official users, show real data interface
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
            <span className="font-medium">Connected to Database</span>
          </div>
        )}
      </div>

      {/* Metrics Grid - Show real data or loading states */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Avg. Coherence"
          value={stats.avgCoherence > 0 ? stats.avgCoherence.toFixed(1) : '--'}
          subtitle={stats.avgCoherence > 0 ? "out of 5.0" : "No data available"}
          icon={Brain}
          color="blue"
          trend="neutral"
        />
        <MetricCard
          title="Avg. Relevance"
          value={stats.avgRelevance > 0 ? stats.avgRelevance.toFixed(1) : '--'}
          subtitle={stats.avgRelevance > 0 ? "out of 5.0" : "No data available"}
          icon={MessageSquare}
          color="green"
          trend="neutral"
        />
        <MetricCard
          title="Avg. Politeness"
          value={stats.avgPoliteness > 0 ? stats.avgPoliteness.toFixed(1) : '--'}
          subtitle={stats.avgPoliteness > 0 ? "out of 5.0" : "No data available"}
          icon={Heart}
          color="purple"
          trend="neutral"
        />
        <MetricCard
          title="Resolution Rate"
          value={stats.avgResolution > 0 ? `${(stats.avgResolution * 100).toFixed(0)}%` : '--'}
          subtitle={stats.avgResolution > 0 ? `${stats.totalChats - stats.unresolvedChats}/${stats.totalChats} resolved` : "No data available"}
          icon={CheckCircle}
          color="yellow"
          trend="neutral"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats.avgCoherence > 0 ? (
          <Chart
            data={chartData}
            type="bar"
            title={user?.role === 'manager' ? 'Team Average Metrics' : 'Your Performance Metrics'}
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-center py-8">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Data Available</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Performance metrics will appear here once you start using the system
              </p>
            </div>
          </div>
        )}
        
        {user?.role === 'manager' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Team Overview</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Agent performance data will appear here once agents start using the system
              </p>
            </div>
          </div>
        )}
        
        {user?.role === 'agent' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Performance Trends</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your performance trends will appear here once you start using the system
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Unresolved Chats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-gray-400" />
            {user?.role === 'manager' ? 'Unresolved Chats Across Team' : 'Your Unresolved Chats'}
          </h2>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Chat data will appear here once you start using the system
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;