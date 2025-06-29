import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface BaseModel {
  name: string;
  path: string;
  type: string;
}

interface Adapter {
  installed: boolean;
  path: string;
  base_model_name: string;
  agent_type: string;
  size_gb: number;
  compatible: boolean;
}

interface ModelStatusResponse {
  base_model_loaded: boolean;
  current_base_model: string | null;
  device: string;
  available_base_models: BaseModel[];
  adapters: Record<string, Adapter>;
}

const ModelManager: React.FC = () => {
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);

  const fetchModelStatus = async () => {
    try {
      setLoading(true);
      const response = await api.models.getStatus();
      if (response.success) {
        setModelStatus(response.data);
      }
    } catch (err) {
      setError('Failed to fetch model status');
      console.error('Error fetching model status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelStatus();
  }, []);

  const loadBaseModel = async (modelName: string) => {
    try {
      setLoadingModel(true);
      setError(null);
      const response = await api.models.loadBaseModel(modelName);
      if (response.success) {
        await fetchModelStatus();
        alert(`Base model ${modelName} loaded successfully!`);
      } else {
        setError(`Failed to load base model: ${response.message}`);
      }
    } catch (err) {
      setError('Failed to load base model');
      console.error('Error loading base model:', err);
    } finally {
      setLoadingModel(false);
    }
  };

  const testModelGeneration = async (adapterName?: string) => {
    try {
      setLoading(true);
      const response = await api.models.testGeneration(adapterName);
      if (response.success) {
        alert(`Model generation test completed successfully!\nResponse: ${response.data.response}`);
      } else {
        alert(`Model generation test failed: ${response.message}`);
      }
    } catch (err) {
      setError('Failed to test model generation');
      console.error('Error testing model generation:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !modelStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Model Management</h1>
        
        {error && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* System Status */}
        {modelStatus && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">System Status</h2>
              <button
                onClick={fetchModelStatus}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">
                  {modelStatus.available_base_models.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Available Base Models</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-300">
                  {Object.values(modelStatus.adapters).filter(a => a.installed).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Installed Adapters</div>
              </div>
              <div className={`p-4 rounded-lg ${modelStatus.base_model_loaded ? 'bg-green-50 dark:bg-green-900' : 'bg-yellow-50 dark:bg-yellow-900'}`}> 
                <div className={`text-2xl font-bold ${modelStatus.base_model_loaded ? 'text-green-600 dark:text-green-300' : 'text-yellow-600 dark:text-yellow-300'}`}> 
                  {modelStatus.base_model_loaded ? 'Loaded' : 'Not Loaded'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Base Model</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-300">
                  {modelStatus.device.toUpperCase()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Device</div>
              </div>
            </div>

            {modelStatus.current_base_model && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Current Base Model</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {modelStatus.current_base_model}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Base Models Section */}
        {modelStatus && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Available Base Models</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modelStatus.available_base_models.map((model, index) => (
                <div key={index} className="border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100">{model.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{model.type}</p>
                    </div>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                      {model.type}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{model.path}</span>
                    <button
                      onClick={() => loadBaseModel(model.name)}
                      disabled={loadingModel || (modelStatus.current_base_model === model.name)}
                      className="px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white rounded text-sm hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingModel ? 'Loading...' : 
                       modelStatus.current_base_model === model.name ? 'Loaded' : 'Load'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Adapters Section */}
        {modelStatus && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Fine-tuned Adapters</h2>
            <div className="space-y-4">
              {Object.entries(modelStatus.adapters).map(([name, adapter]) => (
                <div key={name} className="border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100 capitalize">{name} Agent</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Trained on: {adapter.base_model_name}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        adapter.installed 
                          ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200' 
                          : 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200'
                      }`}>
                        {adapter.installed ? 'Installed' : 'Not Installed'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        adapter.compatible 
                          ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200' 
                          : 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                      }`}>
                        {adapter.compatible ? 'Compatible' : 'Incompatible'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{adapter.size_gb}GB</span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Path: {adapter.path}</p>
                  
                  {adapter.installed && modelStatus.base_model_loaded && (
                    <div className="mt-3">
                      <button
                        onClick={() => testModelGeneration(name)}
                        disabled={loading}
                        className="px-3 py-1 bg-green-600 dark:bg-green-500 text-white rounded text-sm hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50"
                      >
                        {loading ? 'Testing...' : 'Test Generation'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => testModelGeneration()}
              disabled={loading || !modelStatus?.base_model_loaded}
              className="px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded hover:bg-orange-700 dark:hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Testing...' : 'Test Base Model Generation'}
            </button>
            
            <button
              onClick={fetchModelStatus}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelManager; 