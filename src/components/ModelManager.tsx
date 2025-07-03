import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Cpu, Monitor, HardDrive, Server, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface OllamaModel {
  name: string;
  tag: string;
  size: number;
  modified_at: string;
  digest: string;
  details: any;
}

interface SystemInfo {
  cpu: {
    count: number;
    percent: number;
    frequency?: any;
  };
  memory: {
    total: number;
    available: number;
    percent: number;
    used: number;
  };
  gpu: {
    available: boolean;
    count: number;
    gpus: Array<{
      name: string;
      memory_total: number;
      memory_used: number;
      memory_free: number;
      utilization: number;
    }>;
  };
  ollama_running: boolean;
}

interface ModelStatusResponse {
  available_models: OllamaModel[];
  current_model: string | null;
  default_model: string | null;
  system_info: SystemInfo;
  ollama_running: boolean;
  total_models: number;
  agent_default_models?: { [key: string]: string };
}

const AGENTS = [
  { key: 'analysis', label: 'Analysis Agent' },
  { key: 'evaluation', label: 'Evaluation Agent' },
  { key: 'recommendation', label: 'Recommendation Agent' },
];

const MODELS_CACHE_KEY = 'cachedModelsList';

const ModelManager: React.FC = () => {
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [modelsLoadedFromCache, setModelsLoadedFromCache] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState<string | null>(null);
  const [systemInfoLoading, setSystemInfoLoading] = useState(true);
  const [ollamaRunning, setOllamaRunning] = useState<boolean | null>(null);
  const [testPrompt, setTestPrompt] = useState<string>("Hello, how are you today?");
  const [showTestModal, setShowTestModal] = useState<boolean>(false);
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testResponse, setTestResponse] = useState<string>("");
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);
  const [agentModels, setAgentModels] = useState<{ [key: string]: string }>(() => {
    const saved = localStorage.getItem('agentModels');
    return saved ? JSON.parse(saved) : {};
  });
  const [agentModelsLoaded, setAgentModelsLoaded] = useState(true);

  // Load models from cache on mount for instant UI
  useEffect(() => {
    const cached = localStorage.getItem(MODELS_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setModelStatus(parsed);
        setModelsLoadedFromCache(true);
      } catch {}
    }
    fetchModelList(); // Always refresh in background
  }, []);

  // Load system info separately and update every minute
  useEffect(() => {
    fetchSystemInfo();
    const interval = setInterval(fetchSystemInfo, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Save models to cache whenever modelStatus changes (from API)
  useEffect(() => {
    if (modelStatus && !modelsLoadedFromCache) {
      localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(modelStatus));
    }
  }, [modelStatus, modelsLoadedFromCache]);

  // When models list changes, validate agent assignments
  useEffect(() => {
    if (!agentModelsLoaded) return; // Wait until agentModels are loaded
    if (!modelStatus || !modelStatus.available_models || modelStatus.available_models.length === 0) return;
    let changed = false;
    const available = modelStatus.available_models.map(m => m.name);
    const newAgentModels = { ...agentModels };
    AGENTS.forEach(agent => {
      if (agentModels[agent.key] && !available.includes(agentModels[agent.key])) {
        newAgentModels[agent.key] = '';
        changed = true;
      }
    });
    if (changed) setAgentModels(newAgentModels);
  }, [modelStatus, agentModelsLoaded]);

  // Add back the useEffect to save agentModels to localStorage:
  useEffect(() => {
    localStorage.setItem('agentModels', JSON.stringify(agentModels));
  }, [agentModels]);

  // In ModelManager component, after modelStatus is set (in fetchModelList), set agentModels for agents with no user selection using agent_default_models
  useEffect(() => {
    if (!modelStatus || !modelStatus.agent_default_models) return;
    setAgentModels(prev => {
      const updated = { ...prev };
      AGENTS.forEach(agent => {
        if (!prev[agent.key] && modelStatus.agent_default_models![agent.key]) {
          updated[agent.key] = modelStatus.agent_default_models![agent.key];
        }
      });
      return updated;
    });
    setAgentModelsLoaded(true);
  }, [modelStatus]);

  const fetchModelList = async () => {
    try {
      setError(null);
      const response = await api.models.getList();
      if (response.success) {
        setModelStatus(prev => ({
          available_models: response.data.models,
          current_model: response.data.current_model,
          default_model: response.data.default_model,
          total_models: response.data.total_models,
          ollama_running: true,
          system_info: prev?.system_info || {
            cpu: { count: 0, percent: 0 },
            memory: { total: 0, available: 0, percent: 0, used: 0 },
            gpu: { available: false, count: 0, gpus: [] },
            ollama_running: true
          },
          agent_default_models: response.data.agent_default_models
        }));
        setOllamaRunning(true);
        setModelsLoadedFromCache(false); // Now using fresh data
      } else {
        setError('Failed to fetch model list');
        setOllamaRunning(false);
      }
    } catch (err) {
      setError('Failed to fetch model list');
      console.error('Error fetching model list:', err);
      setOllamaRunning(false);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      setSystemInfoLoading(true);
      const response = await api.models.getSystemInfo();
      if (response.success) {
        setModelStatus(prev => prev ? {
          ...prev,
          system_info: response.data,
          ollama_running: response.data.ollama_running
        } : null);
        setOllamaRunning(response.data.ollama_running);
      }
    } catch (err) {
      console.error('Error fetching system info:', err);
    } finally {
      setSystemInfoLoading(false);
    }
  };

  const loadModel = async (modelName: string) => {
    try {
      setLoadingModel(modelName);
      setError(null);
      const response = await api.models.loadModel(modelName);
      if (response.success) {
        await fetchModelList(); // Refresh model list to update current model
        alert(`Model ${modelName} loaded successfully!`);
      } else {
        setError(`Failed to load model: ${response.message}`);
      }
    } catch (err) {
      setError('Failed to load model');
      console.error('Error loading model:', err);
    } finally {
      setLoadingModel(null);
    }
  };

  const unloadModel = async () => {
    try {
      setLoadingModel("unloading");
      setError(null);
      const response = await api.models.unloadModel();
      if (response.success) {
        await fetchModelList(); // Refresh model list to update current model
        alert("Model unloaded successfully! Memory freed.");
      } else {
        setError(`Failed to unload model: ${response.message}`);
      }
    } catch (err) {
      setError('Failed to unload model');
      console.error('Error unloading model:', err);
    } finally {
      setLoadingModel(null);
    }
  };

  const testModelGeneration = async (modelName: string, customPrompt?: string) => {
    try {
      setTestLoading(true);
      setTestResponse("");
      const prompt = customPrompt || testPrompt;
      
      // First load the model if it's not already loaded
      if (modelStatus?.current_model !== modelName) {
        console.log(`Loading model ${modelName} for testing...`);
        const loadResponse = await api.models.loadModel(modelName);
        if (!loadResponse.success) {
          setError(`Failed to load model for testing: ${loadResponse.message}`);
          return;
        }
        // Refresh model list to update current model
        await fetchModelList();
      }
      
      // Now test the generation
      const response = await api.models.testGeneration(modelName, prompt);
      if (response.success) {
        setTestResponse(response.data.response);
      } else {
        setError(`Model generation test failed: ${response.message}`);
      }
    } catch (err) {
      setError('Failed to test model generation');
      console.error('Error testing model generation:', err);
    } finally {
      setTestLoading(false);
    }
  };

  const openTestModal = (modelName: string) => {
    setTestingModel(modelName);
    setShowTestModal(true);
    setTestResponse("");
  };

  const closeTestModal = async () => {
    setShowTestModal(false);
    
    // Automatically unload the model when closing the test modal
    if (testingModel && modelStatus?.current_model === testingModel) {
      try {
        console.log(`Auto-unloading model ${testingModel} after test completion`);
        await api.models.unloadModel();
        await fetchModelList(); // Refresh model list
      } catch (err) {
        console.error('Error auto-unloading model:', err);
        // Don't show error to user as this is automatic
      }
    }
    
    setTestingModel(null);
    setTestResponse("");
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatMemory = (bytes: number): string => {
    return formatBytes(bytes);
  };

  const getStatusIcon = (ollamaRunning: boolean) => {
    if (ollamaRunning) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const runModel = async (modelName: string) => {
    await loadModel(modelName);
  };

  const setDefaultModel = async (modelName: string) => {
    try {
      setSettingDefault(modelName);
      setError(null);
      const response = await api.models.setDefaultModel(modelName);
      if (response.success) {
        await fetchModelList();
        alert(`Model ${modelName} set as default successfully!`);
      } else {
        setError(`Failed to set default model: ${response.message}`);
      }
    } catch (err) {
      setError('Failed to set default model');
      console.error('Error setting default model:', err);
    } finally {
      setSettingDefault(null);
    }
  };

  const handleAgentModelChange = (agentKey: string, modelName: string) => {
    setAgentModels((prev) => ({ ...prev, [agentKey]: modelName }));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Ollama Model Management</h1>
        
        {error && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* System Status */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">System Status</h2>
            <button
              onClick={fetchSystemInfo}
              disabled={systemInfoLoading}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              {systemInfoLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update System Info'
              )}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Ollama Status */}
            <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">
                    {ollamaRunning === null ? 'Checking...' : (ollamaRunning ? 'Running' : 'Stopped')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Ollama Service</div>
                </div>
                {ollamaRunning !== null && getStatusIcon(ollamaRunning)}
              </div>
            </div>

            {/* Available Models */}
            <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-300">
                {modelStatus?.total_models || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Available Models</div>
            </div>

            {/* CPU Usage */}
            <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-300">
                {systemInfoLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    ...
                  </div>
                ) : (
                  `${modelStatus?.system_info.cpu.percent.toFixed(1) || 0}%`
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">CPU Usage</div>
            </div>

            {/* Memory Usage */}
            <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-300">
                {systemInfoLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    ...
                  </div>
                ) : (
                  `${modelStatus?.system_info.memory.percent.toFixed(1) || 0}%`
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Memory Usage</div>
            </div>
          </div>

          {/* Detailed System Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CPU Info */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">CPU Information</h3>
                {systemInfoLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Cores:</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {systemInfoLoading ? '...' : (modelStatus?.system_info.cpu.count || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Usage:</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {systemInfoLoading ? '...' : `${(modelStatus?.system_info.cpu.percent || 0).toFixed(1)}%`}
                  </span>
                </div>
                {modelStatus?.system_info.cpu.frequency && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Frequency:</span>
                    <span className="text-gray-800 dark:text-gray-200">
                      {systemInfoLoading ? '...' : `${(modelStatus.system_info.cpu.frequency.current / 1000).toFixed(1)} GHz`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Memory Info */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Memory Information</h3>
                {systemInfoLoading && <Loader2 className="w-4 h-4 animate-spin text-green-600" />}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Total:</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {systemInfoLoading ? '...' : formatMemory(modelStatus?.system_info.memory.total || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Used:</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {systemInfoLoading ? '...' : formatMemory(modelStatus?.system_info.memory.used || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Available:</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {systemInfoLoading ? '...' : formatMemory(modelStatus?.system_info.memory.available || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Usage:</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {systemInfoLoading ? '...' : `${(modelStatus?.system_info.memory.percent || 0).toFixed(1)}%`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Agent Model Assignment */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Agent Model Assignment</h2>
          {(!modelStatus || !agentModelsLoaded) ? (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-500">Loading agent assignments...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {AGENTS.map(agent => (
                <div key={agent.key} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="mb-2 font-semibold text-gray-800 dark:text-gray-200">{agent.label}</div>
                  {agentModels[agent.key] && !modelStatus?.available_models.some(m => m.name === agentModels[agent.key]) && (
                    <div className="text-xs text-red-500 mb-1">Previously selected model is no longer available.</div>
                  )}
                  <select
                    className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    value={agentModels[agent.key] || ''}
                    onChange={e => handleAgentModelChange(agent.key, e.target.value)}
                  >
                    <option value="">Select Model</option>
                    {modelStatus?.available_models.map(model => (
                      <option key={model.name} value={model.name}>{model.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Models Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Available Models</h2>
            {modelStatus?.current_model && (
              <button
                onClick={unloadModel}
                disabled={loadingModel === "unloading"}
                className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
              >
                {loadingModel === "unloading" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Unloading...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Unload Current Model
                  </>
                )}
              </button>
            )}
          </div>
          
          {ollamaRunning === false ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">
                Ollama is not running. Please start Ollama to see available models.
              </p>
            </div>
          ) : modelStatus?.available_models && modelStatus.available_models.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modelStatus.available_models.map((model) => (
                <div key={model.name} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">{model.name}</h3>
                    <div className="flex gap-1">
                      {modelStatus.current_model === model.name && (
                        <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    <div>Tag: {model.tag}</div>
                    <div>Size: {formatBytes(model.size)}</div>
                    <div>Modified: {new Date(model.modified_at).toLocaleDateString()}</div>
                  </div>
                  
                  <div>
                    <button
                      onClick={() => openTestModal(model.name)}
                      disabled={loadingModel === model.name}
                      className="w-full px-3 py-2 bg-green-600 dark:bg-green-500 text-white text-sm rounded hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 mt-3"
                    >
                      Test
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Models Available</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                No models are currently available in Ollama. Pull a model to get started.
              </p>
              <button
                onClick={() => {
                  const modelName = prompt("Enter model name to pull (e.g., llama2):");
                  if (modelName) {
                    loadModel(modelName);
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Pull Model
              </button>
            </div>
          )}
        </div>

        {/* Test Modal */}
        {showTestModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Test Model: {testingModel}
                </h3>
                <button
                  onClick={closeTestModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prompt
                  </label>
                  <textarea
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                    rows={3}
                    placeholder="Enter your prompt here..."
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => testModelGeneration(testingModel!)}
                    disabled={testLoading}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {testLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Response'
                    )}
                  </button>
                  <button
                    onClick={closeTestModal}
                    className="px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
                
                {testResponse && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Response
                    </label>
                    <div className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[100px] max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                      {testResponse}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelManager; 