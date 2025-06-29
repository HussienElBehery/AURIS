import React, { useState, useRef } from 'react';
import { api } from '../services/api';
import { ChatLog, ProcessingStatus } from '../types';

interface ChatLogUploadProps {
  onUploadSuccess?: (chatLog: ChatLog) => void;
  onProcessingComplete?: (chatLogId: string) => void;
}

const ChatLogUpload: React.FC<ChatLogUploadProps> = ({ 
  onUploadSuccess, 
  onProcessingComplete 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedChatLog, setUploadedChatLog] = useState<ChatLog | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('pending');
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setError('Please select a JSON file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const chatLog = await api.chatLogs.upload(file);
      setUploadedChatLog(chatLog);
      onUploadSuccess?.(chatLog);
      
      // Start processing automatically
      await startProcessing(chatLog.id);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const startProcessing = async (chatLogId: string) => {
    setIsProcessing(true);
    setProcessingStatus('processing');

    try {
      await api.chatLogs.process(chatLogId);
      
      // Poll for status updates
      const pollInterval = setInterval(async () => {
        try {
          const status = await api.chatLogs.getStatus(chatLogId);
          setProcessingStatus(status.status);
          setProgress(status.progress);
          setErrorMessages(status.error_messages);

          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollInterval);
            setIsProcessing(false);
            onProcessingComplete?.(chatLogId);
          }
        } catch (err: any) {
          console.error('Error polling status:', err);
          clearInterval(pollInterval);
          setIsProcessing(false);
          setError('Failed to get processing status');
        }
      }, 2000); // Poll every 2 seconds

      // Stop polling after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isProcessing) {
          setIsProcessing(false);
          setError('Processing timeout - please check status manually');
        }
      }, 600000);

    } catch (err: any) {
      setIsProcessing(false);
      setError(err.message || 'Failed to start processing');
    }
  };

  const handleRetry = () => {
    if (uploadedChatLog) {
      startProcessing(uploadedChatLog.id);
    }
  };

  const handleNewUpload = () => {
    setUploadedChatLog(null);
    setProcessingStatus('pending');
    setProgress({});
    setErrorMessages({});
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

      {!uploadedChatLog ? (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Select JSON File'}
            </button>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Upload a JSON file containing chat log data
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
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
              Interaction ID: {uploadedChatLog.interactionId}
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
                <span className={`text-sm font-medium ${getStatusColor(processingStatus)}`}>
                  {processingStatus.charAt(0).toUpperCase() + processingStatus.slice(1)}
                </span>
              </div>

              {Object.entries(progress).map(([agent, status]) => (
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

            {Object.keys(errorMessages).length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-red-700 dark:text-red-300">
                  Errors:
                </h4>
                {Object.entries(errorMessages).map(([agent, error]) => (
                  <div key={agent} className="text-xs text-red-600 dark:text-red-400">
                    <span className="font-medium capitalize">{agent}:</span> {error}
                  </div>
                ))}
              </div>
            )}

            {isProcessing && (
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
            {processingStatus === 'failed' && (
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry Processing
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