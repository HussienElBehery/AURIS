import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { ChatLog, ProcessingStatus } from '../types';
import { useUpload } from '../contexts/UploadContext';
import { CheckCircle, XCircle, Upload, Loader2, Database } from 'lucide-react';

const getAgentModels = () => {
  try {
    return JSON.parse(localStorage.getItem('agentModels') || '{}');
  } catch {
    return {};
  }
};

const ChatLogUpload: React.FC = () => {
  const { uploadState, setUploadState, resetUploadState } = useUpload();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedLogs, setUploadedLogs] = useState<ChatLog[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<any>(null);

  const agentModels = getAgentModels();

  // Step 1: Select file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSelectedFile(file || null);
    setError(null);
  };

  // Step 2: Upload file
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const logs = await api.chatLogs.upload(selectedFile);
      const logsArray: ChatLog[] = Array.isArray(logs) ? logs : [logs];
      setUploadedLogs(logsArray);
      setUploading(false);
      setProcessing(true);
      // Start processing each chat log
      for (const log of logsArray) {
        await api.chatLogs.process(log.id);
      }
      // Start polling status
      pollIntervalRef.current = setInterval(() => {
        logsArray.forEach(async (log: ChatLog) => {
          try {
            const status = await api.chatLogs.getStatus(log.id);
            setStatusMap(prev => ({ ...prev, [log.id]: status }));
          } catch (err: any) {
            setStatusMap(prev => ({ ...prev, [log.id]: { error: err.message || 'Failed to get status' } }));
          }
        });
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      setUploading(false);
    }
  };

  // Step 3: Polling completion
  useEffect(() => {
    if (processing && uploadedLogs.length > 0) {
      const allDone = uploadedLogs.every(log => {
        const status = statusMap[log.id];
        return status && ['completed', 'failed'].includes(status?.overall_status || status?.status);
      });
      if (allDone && pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        setProcessing(false);
      }
    }
    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [processing, uploadedLogs, statusMap]);

  // Step 4: Reset
  const handleReset = () => {
    setSelectedFile(null);
    setUploadedLogs([]);
    setStatusMap({});
    setUploading(false);
    setProcessing(false);
    setError(null);
    resetUploadState();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // UI
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upload Chat Logs</h2>
        <button
          onClick={handleReset}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-xs ml-2"
        >
          Reset Upload
        </button>
      </div>
      {/* Step 1: Select File */}
      {!selectedFile && (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading || processing}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || processing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4 inline mr-2" /> Select JSON File
          </button>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Upload a JSON file containing chat log data
          </p>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>
      )}
      {/* Step 2: Uploading */}
      {selectedFile && !uploadedLogs.length && (
        <div className="flex flex-col items-center justify-center py-8">
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">Uploading file...</span>
            </>
          ) : (
            <button
              onClick={handleUpload}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mt-4"
              disabled={uploading}
            >
              <Upload className="w-4 h-4 inline mr-2" /> Upload
            </button>
          )}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mt-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>
      )}
      {/* Step 3: Processing Status */}
      {uploadedLogs.length > 0 && (
        <div className="space-y-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
            <h3 className="font-medium text-green-800 dark:text-green-200">
              Uploaded {uploadedLogs.length} chat log{uploadedLogs.length > 1 ? 's' : ''}!
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {uploadedLogs.map(log => {
              const status = statusMap[log.id];
              return (
                <div key={log.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">{log.interaction_id}</span>
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({log.id})</span>
                    </div>
                    <span className="text-sm font-medium">
                      {status?.overall_status === 'completed' && <span className="text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> Completed</span>}
                      {status?.overall_status === 'failed' && <span className="text-red-600 flex items-center"><XCircle className="w-4 h-4 mr-1" /> Failed</span>}
                      {(!status || status?.overall_status === 'processing' || status?.overall_status === 'pending') && <span className="text-blue-600 flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-1" /> Processing</span>}
                    </span>
                  </div>
                  {/* Per-agent status */}
                  <div className="flex flex-wrap gap-4 mt-2">
                    {['evaluation', 'analysis', 'recommendation'].map(agent => (
                      <div key={agent} className="flex items-center gap-1 text-xs">
                        <span className="capitalize text-gray-700 dark:text-gray-300">
                          {agent}: <span className="text-gray-400">({agentModels[agent] || 'no model'})</span>
                        </span>
                        <span className={
                          status?.progress?.[agent] === 'completed' ? 'text-green-600' :
                          status?.progress?.[agent] === 'failed' ? 'text-red-600' :
                          'text-blue-600'
                        }>
                          {status?.progress?.[agent] || 'pending'}
                        </span>
                        {status?.progress?.[agent] === 'completed' && (
                          <CheckCircle className="w-4 h-4 text-green-500 ml-1" />
                        )}
                        {status?.progress?.[agent] === 'failed' && (
                          <XCircle className="w-4 h-4 text-red-500 ml-1" />
                        )}
                        {status?.error_messages?.[agent] && (
                          <span className="ml-1 text-red-500">({status.error_messages[agent]})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Step 4: Complete */}
      {!processing && uploadedLogs.length > 0 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Upload New File
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatLogUpload; 