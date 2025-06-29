import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { ChatLog, ProcessingStatus } from '../types';
import { useUpload } from '../contexts/UploadContext';

interface ChatLogUploadProps {
  onUploadSuccess?: (chatLog: ChatLog) => void;
  onProcessingComplete?: (chatLogId: string) => void;
}

const ChatLogUpload: React.FC<ChatLogUploadProps> = ({ 
  onUploadSuccess, 
  onProcessingComplete 
}) => {
  const { uploadState, setUploadState } = useUpload();
  const [settingDefault, setSettingDefault] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<number | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setUploadState(prev => ({ ...prev, error: 'Please select a JSON file' }));
      return;
    }

    setUploadState(prev => ({ ...prev, isUploading: true, error: null }));

    try {
      const chatLog = await api.chatLogs.upload(file);
      setUploadState(prev => ({ 
        ...prev, 
        uploadedChatLog: chatLog, 
        isUploading: false 
      }));
      onUploadSuccess?.(chatLog);
      
      // Start processing automatically
      await startProcessing(chatLog.id);
    } catch (err: any) {
      setUploadState(prev => ({ 
        ...prev, 
        error: err.message || 'Failed to upload file',
        isUploading: false 
      }));
    }
  };

  const startProcessing = async (chatLogId: string) => {
    setUploadState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      processingStatus: 'processing' 
    }));

    try {
      await api.chatLogs.process(chatLogId);
      
      // Poll for status updates
      pollIntervalRef.current = setInterval(async () => {
        try {
          const status = await api.chatLogs.getStatus(chatLogId);
          setUploadState(prev => ({
            ...prev,
            processingStatus: status.status,
            progress: status.progress,
            errorMessages: status.error_messages
          }));

          if (status.status === 'completed' || status.status === 'failed') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setUploadState(prev => ({ ...prev, isProcessing: false }));
            onProcessingComplete?.(chatLogId);
          }
        } catch (err: any) {
          console.error('Error polling status:', err);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setUploadState(prev => ({ 
            ...prev, 
            isProcessing: false, 
            error: 'Failed to get processing status' 
          }));
        }
      }, 2000); // Poll every 2 seconds

      // Stop polling after 10 minutes
      setTimeout(() => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        if (uploadState.isProcessing) {
          setUploadState(prev => ({ 
            ...prev, 
            isProcessing: false, 
            error: 'Processing timeout - please check status manually' 
          }));
        }
      }, 600000);

    } catch (err: any) {
      setUploadState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: err.message || 'Failed to start processing' 
      }));
    }
  };

  const handleRetry = () => {
    if (uploadState.uploadedChatLog) {
      startProcessing(uploadState.uploadedChatLog.id);
    }
  };

  const handleCancel = () => {
    // Clear polling interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    // Reset to upload state
    setUploadState({
      isUploading: false,
      isProcessing: false,
      uploadedChatLog: null,
      processingStatus: 'pending',
      progress: {},
      errorMessages: {},
      error: null,
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNewUpload = () => {
    // Clear polling interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    setUploadState({
      isUploading: false,
      isProcessing: false,
      uploadedChatLog: null,
      processingStatus: 'pending',
      progress: {},
      errorMessages: {},
      error: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const getStatusColor = (status: ProcessingStatus) => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'processing': return 'text-blue-500';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getAgentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'processing': return 'text-blue-500';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Upload Chat Log
      </h2>

      {!uploadState.uploadedChatLog ? (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploadState.isUploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadState.isUploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadState.isUploading ? 'Uploading...' : 'Select JSON File'}
            </button>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Upload a JSON file containing chat log data
            </p>
          </div>

          {/* JSON Format Instructions */}
          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Expected JSON Format
            </h3>
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
              <p>The JSON file should contain a <code className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-blue-600 dark:text-blue-400 font-mono">transcript</code> array with message objects:</p>
              <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md p-4">
                <pre className="text-xs overflow-x-auto text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
{`{
  "transcript": [
    {
      "sender": "customer",
      "text": "Message text here",
      "timestamp": "2024-01-15T14:30:00" // Optional
    },
    {
      "sender": "agent", 
      "text": "Response text here"
      // timestamp is optional - will use current time if not provided
    }
  ]
}`}
                </pre>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-500 p-3 rounded-r-md">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Required Fields:</h4>
                <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full mr-2"></span>
                    <strong>sender:</strong> Must be "customer" or "agent"
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full mr-2"></span>
                    <strong>text:</strong> The message content (required)
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full mr-2"></span>
                    <strong>timestamp:</strong> Optional ISO format timestamp
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {uploadState.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <p className="text-red-800 dark:text-red-200">{uploadState.error}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
            <h3 className="font-medium text-green-800 dark:text-green-200">
              File uploaded successfully!
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Interaction ID: {uploadState.uploadedChatLog.interaction_id}
            </p>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              Processing Status
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Overall Status:
                </span>
                <span className={`text-sm font-medium ${getStatusColor(uploadState.processingStatus)}`}>
                  {uploadState.processingStatus.charAt(0).toUpperCase() + uploadState.processingStatus.slice(1)}
                </span>
              </div>

              {Object.entries(uploadState.progress).map(([agent, status]) => (
                <div key={agent} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {agent} Agent:
                  </span>
                  <span className={`text-sm font-medium ${getAgentStatusColor(status)}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
              ))}
            </div>

            {Object.keys(uploadState.errorMessages).length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-red-700 dark:text-red-300">
                  Errors:
                </h4>
                {Object.entries(uploadState.errorMessages).map(([agent, error]) => (
                  <div key={agent} className="text-xs text-red-600 dark:text-red-400">
                    <span className="font-medium capitalize">{agent}:</span> {error}
                  </div>
                ))}
              </div>
            )}

            {uploadState.isProcessing && (
              <div className="mt-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Processing in progress...
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            {uploadState.processingStatus === 'failed' && (
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry Processing
              </button>
            )}
            {uploadState.isProcessing && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Cancel Processing
              </button>
            )}
            <button
              onClick={handleNewUpload}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Upload New File
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatLogUpload; 