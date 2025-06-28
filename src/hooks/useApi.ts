import { useState, useCallback } from 'react';
import { ApiError } from '../services/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T>(
  apiFunction: (...args: any[]) => Promise<T>,
  initialData: T | null = null
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        const result = await apiFunction(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (error) {
        const errorMessage = error instanceof ApiError 
          ? error.message 
          : 'An unexpected error occurred';
        
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return null;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({ data: initialData, loading: false, error: null });
  }, [initialData]);

  return {
    ...state,
    execute,
    reset,
  };
}

// Specialized hooks for common operations
export function useApiMutation<T, R>(
  mutationFunction: (data: T) => Promise<R>
): UseApiReturn<R> & { mutate: (data: T) => Promise<R | null> } {
  const apiHook = useApi(mutationFunction);
  
  const mutate = useCallback(
    async (data: T): Promise<R | null> => {
      return apiHook.execute(data);
    },
    [apiHook]
  );

  return {
    ...apiHook,
    mutate,
  };
}

export function useApiQuery<T>(
  queryFunction: (...args: any[]) => Promise<T>,
  dependencies: any[] = []
): UseApiReturn<T> {
  const apiHook = useApi(queryFunction);
  
  // Auto-execute on mount and when dependencies change
  const executeQuery = useCallback(
    async (...args: any[]) => {
      return apiHook.execute(...args);
    },
    [apiHook, ...dependencies]
  );

  return {
    ...apiHook,
    execute: executeQuery,
  };
} 