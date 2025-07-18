import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  BarChart3, 
  Search, 
  Lightbulb, 
  FileText, 
  LogOut,
  Moon,
  Sun,
  Database,
  Upload,
  Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUpload } from '../contexts/UploadContext';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const { uploadState } = useUpload();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/chats', icon: MessageSquare, label: 'Chats' },
    { to: '/evaluation', icon: BarChart3, label: 'Evaluation' },
    { to: '/analysis', icon: Search, label: 'Analysis' },
    { to: '/recommendation', icon: Lightbulb, label: 'Recommendation' },
    { to: '/models', icon: Database, label: 'Models' },
    ...(user?.role === 'manager' ? [{ to: '/report', icon: FileText, label: 'Report' }] : [])
  ];

  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">AURIS</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">AI Customer Service Evaluator</p>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium">
              {user?.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{user?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Upload Progress Indicator */}
        {(uploadState.isUploading || uploadState.isProcessing) && (
          <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-center space-x-2 mb-2">
              {uploadState.isUploading ? (
                <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
              )}
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {uploadState.isUploading ? 'Uploading...' : 'Processing...'}
              </span>
            </div>
            
            {uploadState.isProcessing && (
              <div className="space-y-1">
                {Object.entries(uploadState.progress).map(([agent, status]) => (
                  <div key={agent} className="flex items-center justify-between text-xs">
                    <span className="text-blue-700 dark:text-blue-300 capitalize">{agent}:</span>
                    <span className={`font-medium ${
                      status === 'completed' ? 'text-green-600 dark:text-green-400' :
                      status === 'failed' ? 'text-red-600 dark:text-red-400' :
                      'text-blue-600 dark:text-blue-400'
                    }`}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <button
          onClick={toggle}
          className="w-full flex items-center space-x-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;