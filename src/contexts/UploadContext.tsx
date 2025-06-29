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
};

export const UploadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [uploadState, setUploadState] = useState<UploadState>(initialUploadState);

  const resetUploadState = () => {
    setUploadState(initialUploadState);
  };

  return (
    <UploadContext.Provider value={{ uploadState, setUploadState, resetUploadState }}>
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