import React, { useState, useEffect } from 'react';
// import { useWords } from '../hooks/useWords'; // Removed as part of import/export refactor
// import { toast } from 'react-hot-toast'; // Removed as part of import/export refactor
// import type { Word } from '../types'; // Removed as part of import/export refactor

const OPENROUTER_API_KEY_STORAGE_KEY = 'openRouterApiKey';
const OPENROUTER_SELECTED_MODEL_STORAGE_KEY = 'openRouterModel';

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
}

const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<OpenRouterModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [showFreeOnly, setShowFreeOnly] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // const { words } = useWords(); // Removed as part of import/export refactor

  useEffect(() => {
    const storedApiKey = localStorage.getItem(OPENROUTER_API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
    const storedModel = localStorage.getItem(OPENROUTER_SELECTED_MODEL_STORAGE_KEY);
    if (storedModel) {
      setSelectedModel(storedModel);
    }
  }, []);

  useEffect(() => {
    if (apiKey) {
      fetchModels();
    }
  }, [apiKey]);

  useEffect(() => {
    let models = availableModels;
    if (showFreeOnly) {
      models = models.filter(
        (model) =>
          parseFloat(model.pricing.prompt) === 0 &&
          parseFloat(model.pricing.completion) === 0
      );
    }
    setFilteredModels(models.sort((a, b) => a.name.localeCompare(b.name)));
  }, [availableModels, showFreeOnly]);

  const fetchModels = async () => {
    setIsLoadingModels(true);
    setMessage(null);
    try {
      // Note: OpenRouter's /models endpoint does not require the API key in the header for fetching the list.
      // The key is used for making inference requests.
      const response = await fetch('https://openrouter.ai/api/v1/models');
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      const data = await response.json();
      setAvailableModels(data.data || []);
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      setMessage({ type: 'error', text: 'Could not fetch models. Check console for details.' });
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSaveSettings = () => {
    if (!apiKey) {
      setMessage({ type: 'error', text: 'API Key cannot be empty.' });
      return;
    }
    localStorage.setItem(OPENROUTER_API_KEY_STORAGE_KEY, apiKey);
    localStorage.setItem(OPENROUTER_SELECTED_MODEL_STORAGE_KEY, selectedModel);
    setMessage({ type: 'success', text: 'Settings saved successfully!' });
    // Re-fetch models if API key was just added and models weren't fetched
    if (availableModels.length === 0 && apiKey) {
        fetchModels();
    }
  };

  // Removed handleExportWords and handleImportWords as part of import/export refactor

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Настройки</h2>

      {message && (
        <div
          className={`p-3 rounded-md mb-4 text-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Words Import/Export Section Removed */}
        
        {/* OpenRouter Settings */}
        <h3 className="text-lg font-medium text-gray-800 mb-4">Настройки LLM (OpenRouter)</h3>
        
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
            OpenRouter API Key
          </label>
          <input
            type="password"
            id="apiKey"
            className="w-full px-3 py-2 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={apiKey}
            onChange={(e) => {
                setApiKey(e.target.value);
                if (message) setMessage(null); // Clear message on input change
            }}
            placeholder="sk-or-v1-..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Your API key is stored locally in your browser&apos;s localStorage.
          </p>
        </div>

        <div>
          <label htmlFor="modelSelect" className="block text-sm font-medium text-gray-700 mb-1">
            Select LLM Model
          </label>
          <div className="flex items-center space-x-3 mb-2">
            <select
              id="modelSelect"
              className="w-full px-3 py-2 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isLoadingModels || availableModels.length === 0}
            >
              <option value="">{isLoadingModels ? 'Loading models...' : 'Select a model'}</option>
              {filteredModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} (Prompt: ${model.pricing.prompt}, Completion: ${model.pricing.completion})
                </option>
              ))}
            </select>
            <button
                type="button"
                onClick={fetchModels}
                disabled={!apiKey || isLoadingModels}
                className="px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
            >
                {isLoadingModels ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
           <div className="flex items-center">
            <input
                id="freeOnly"
                type="checkbox"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={showFreeOnly}
                onChange={(e) => setShowFreeOnly(e.target.checked)}
            />
            <label htmlFor="freeOnly" className="ml-2 block text-sm text-gray-900">
                Show only models with $0 prompt/completion cost
            </label>
          </div>
          {availableModels.length === 0 && !isLoadingModels && apiKey && (
            <p className="text-xs text-red-500 mt-1">
              No models loaded. Ensure your API key is correct and try refreshing.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveSettings}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Save Settings
          </button>
        </div>
      </div>
       <p className="text-xs text-gray-500 mt-6">
        Note: Using LLMs can incur costs. Please check OpenRouter&apos;s pricing for details.
        This application is not responsible for any charges.
      </p>
    </div>
  );
};

export default Settings;
