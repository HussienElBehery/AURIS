import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ChatLog, ProcessingStatus } from '../types';

interface UploadState {
  isUploading: boolean;
  isProcessing: boolean;
  uploadedChatLog: ChatLog | null;
  processingStatus: ProcessingStatus;
  progress: Record<string, string>;
  errorMessages: Record<string, string>;
  error: string | null;
  details?: Record<string, any>;
}

interface UploadContextType {
  uploadState: UploadState;
  setUploadState: React.Dispatch<React.SetStateAction<UploadState>>;
  resetUploadState: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

const initialUploadState: UploadState = {
  isUploading: false,
  isProcessing: false,
  uploadedChatLog: null,
  processingStatus: 'pending',
  progress: {},
  errorMessages: {},
  error: null,
  details: {},
};

const UPLOAD_CHATLOG_KEY = 'auris_last_chatlog_id';
const UPLOAD_STATUS_KEY = 'auris_last_processing_status';

export const UploadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [uploadState, setUploadState] = useState<UploadState>(initialUploadState);

  // On mount, load last chat log ID and status from localStorage
  React.useEffect(() => {
    const lastId = localStorage.getItem(UPLOAD_CHATLOG_KEY);
    const lastStatus = localStorage.getItem(UPLOAD_STATUS_KEY) as ProcessingStatus | null;
    if (lastId) {
      // Only restore if status is 'processing'
      if (lastStatus === 'processing') {
        setUploadState(prev => ({
          ...prev,
          uploadedChatLog: {
            id: lastId,
            interaction_id: prev.uploadedChatLog?.interaction_id || '',
            transcript: [],
            status: lastStatus,
            uploaded_by: '',
            created_at: '',
            updated_at: ''
          },
          processingStatus: lastStatus,
        }));
      } else {
        // Reset if not processing
        setUploadState(initialUploadState);
        localStorage.removeItem(UPLOAD_CHATLOG_KEY);
        localStorage.removeItem(UPLOAD_STATUS_KEY);
      }
    }
  }, []);

  // Save only on upload success, processing start, and completion
  const setUploadStateAndPersist = (updater: React.SetStateAction<UploadState>) => {
    setUploadState(prev => {
      const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
      if (next.uploadedChatLog?.id) {
        localStorage.setItem(UPLOAD_CHATLOG_KEY, next.uploadedChatLog.id);
        localStorage.setItem(UPLOAD_STATUS_KEY, next.processingStatus);
      }
      return next;
    });
  };

  const resetUploadState = () => {
    setUploadState(initialUploadState);
    localStorage.removeItem(UPLOAD_CHATLOG_KEY);
    localStorage.removeItem(UPLOAD_STATUS_KEY);
  };

  return (
    <UploadContext.Provider value={{ uploadState, setUploadState: setUploadStateAndPersist, resetUploadState }}>
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}; 