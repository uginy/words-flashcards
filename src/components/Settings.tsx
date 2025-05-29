import React, { useState, useEffect } from 'react';
import { Combobox } from './ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { DEFAULT_OPENROUTER_API_KEY, DEFAULT_OPENROUTER_MODEL } from '../config/openrouter';
import { loadTableSettings, saveTableSettings } from '@/utils/tableSettings';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

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
  const [pageSize, setPageSize] = useState<number>(10);
  const [speechRate, setSpeechRate] = useState<number>(1);
  const [speechVoice, setSpeechVoice] = useState<string>('default');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<OpenRouterModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [showFreeOnly, setShowFreeOnly] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Get available voices for speech synthesis
  const { availableVoices } = useSpeechSynthesis({ text: '' }); // Empty text just to get voices

  useEffect(() => {
    const storedApiKey = localStorage.getItem(OPENROUTER_API_KEY_STORAGE_KEY);
    if (storedApiKey && storedApiKey.trim() !== '') {
      setApiKey(storedApiKey);
    } else {
      setApiKey(DEFAULT_OPENROUTER_API_KEY);
    }
    const storedModel = localStorage.getItem(OPENROUTER_SELECTED_MODEL_STORAGE_KEY);
    if (storedModel && storedModel.trim() !== '') {
      setSelectedModel(storedModel);
    } else {
      setSelectedModel(DEFAULT_OPENROUTER_MODEL);
    }
    const storedSpeechRate = localStorage.getItem('speechRate');
    if (storedSpeechRate) {
      setSpeechRate(parseFloat(storedSpeechRate));
    }
    const storedSpeechVoice = localStorage.getItem('speechVoice');
    if (storedSpeechVoice) {
      setSpeechVoice(storedSpeechVoice);
    }
    const tableSettings = loadTableSettings();
    setPageSize(tableSettings.pageSize);
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
          Number.parseFloat(model.pricing.prompt) === 0 &&
          Number.parseFloat(model.pricing.completion) === 0
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
    saveTableSettings({ pageSize });
    const keyToSave = apiKey && apiKey.trim() !== '' ? apiKey : DEFAULT_OPENROUTER_API_KEY;
    const modelToSave = selectedModel && selectedModel.trim() !== '' ? selectedModel : DEFAULT_OPENROUTER_MODEL;
    localStorage.setItem(OPENROUTER_API_KEY_STORAGE_KEY, keyToSave);
    localStorage.setItem(OPENROUTER_SELECTED_MODEL_STORAGE_KEY, modelToSave);
    localStorage.setItem('speechRate', speechRate.toString());
    if (speechVoice === 'default') {
      localStorage.removeItem('speechVoice');
    } else {
      localStorage.setItem('speechVoice', speechVoice);
    }
    setApiKey(keyToSave);
    setSelectedModel(modelToSave);
    setMessage({ type: 'success', text: 'Settings saved successfully!' });
    if (availableModels.length === 0 && keyToSave) {
      fetchModels();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Настройки</h2>

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
        <h3 className="text-lg font-medium text-gray-800 mb-4">Настройки таблицы</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Количество записей на странице
          </label>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => setPageSize(Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите количество записей" />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 30, 50, 100, 150, 200].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size} записей
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Скорость озвучки
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-600 min-w-[3rem]">{speechRate.toFixed(1)}x</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Голос для озвучки
          </label>
          <Select
            value={speechVoice}
            onValueChange={setSpeechVoice}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите голос (по умолчанию - системный)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">По умолчанию (системный)</SelectItem>
              {availableVoices
                .filter(voice => voice.lang.includes('he') || voice.lang.includes('ru') || voice.lang.includes('en'))
                .map((voice,i) => (
                  <SelectItem key={voice.name + i} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            Показаны голоса для иврита, русского и английского языков. Выберите голос, который вам больше нравится.
          </p>
        </div>

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
                if (message) setMessage(null);
            }}
            placeholder={DEFAULT_OPENROUTER_API_KEY}
          />
          <p className="text-xs text-gray-500 mt-1">
            Your API key is stored locally in your browser&apos;s localStorage.
          </p>
        </div>

        <div>
          <label htmlFor="modelSelect" className="block text-sm font-medium text-gray-700 mb-1">
            Select LLM Model
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <Combobox
                options={filteredModels.map((model) => ({
                  value: model.id,
                  label: `${model.name} (Prompt: $${model.pricing.prompt}, Completion: $${model.pricing.completion})`
                }))}
                value={selectedModel}
                onValueChange={setSelectedModel}
                placeholder={DEFAULT_OPENROUTER_MODEL}
                searchPlaceholder="Поиск модели..."
                noResultsText="Модели не найдены"
                disabled={isLoadingModels || availableModels.length === 0}
              />
            </div>
            <button
              type="button"
              onClick={fetchModels}
              disabled={!apiKey || isLoadingModels}
              className="px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 shrink-0 w-full sm:w-auto"
            >
              {isLoadingModels ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
           <div className="flex items-center mt-2">
            <input
                id="freeOnly"
                type="checkbox"
                disabled
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

        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={handleSaveSettings}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto"
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
