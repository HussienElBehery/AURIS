import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Bot, Shield, Zap, BarChart3, Users, CheckCircle, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const { isDark, toggle } = useTheme();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    {
      icon: Bot,
      title: 'AI-Powered Analysis',
      description: 'Advanced LLM technology evaluates customer service interactions with human-like understanding.'
    },
    {
      icon: BarChart3,
      title: 'Comprehensive Metrics',
      description: 'Track coherence, relevance, politeness, and resolution rates with detailed insights.'
    },
    {
      icon: Shield,
      title: 'Quality Assurance',
      description: 'Ensure consistent service quality across all customer interactions and agents.'
    },
    {
      icon: Zap,
      title: 'Real-time Feedback',
      description: 'Get instant recommendations and coaching suggestions for continuous improvement.'
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Manager dashboard with comprehensive reporting and team performance analytics.'
    },
    {
      icon: CheckCircle,
      title: 'Guideline Compliance',
      description: 'Automated checking against service guidelines with detailed pass/fail analysis.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Header */}
      <header className="relative">
        <div className="absolute top-4 right-4">
          <button
            onClick={toggle}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        <div className="container mx-auto px-6 pt-16 pb-8">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
              <span className="text-blue-600 dark:text-blue-400">AURIS</span>
            </h1>
            <p className="text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto transition-colors duration-300">
              AI-Powered Customer Service Evaluator
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto transition-colors duration-300">
              Revolutionize your customer service quality with cutting-edge AI analysis. 
              Get real-time feedback, comprehensive metrics, and actionable insights to elevate your team's performance.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl text-center"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="px-8 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-md text-center"
              >
                Already have an account?
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12 transition-colors duration-300">
            Powerful Features for Modern Customer Service
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mb-4 transition-colors duration-300">
                  <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-300">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;