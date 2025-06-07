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
import { TTSSettings } from './settings/TTSSettings';
import { useToast } from '../hooks/use-toast';

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

type TabType = 'table' | 'tts' | 'llm';

const Settings: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('table');
  const [apiKey, setApiKey] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<OpenRouterModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [showFreeOnly, setShowFreeOnly] = useState<boolean>(true);

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
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models');
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      const data = await response.json();
      setAvailableModels(data.data || []);
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить модели. Проверьте консоль для деталей.",
        variant: "error"
      });
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSaveTableSettings = () => {
    saveTableSettings({ pageSize });
    toast({
      title: "Настройки таблицы сохранены",
      description: "Настройки таблицы успешно сохранены!",
      variant: "success"
    });
  };

  const handleSaveLLMSettings = () => {
    const keyToSave = apiKey && apiKey.trim() !== '' ? apiKey : DEFAULT_OPENROUTER_API_KEY;
    const modelToSave = selectedModel && selectedModel.trim() !== '' ? selectedModel : DEFAULT_OPENROUTER_MODEL;
    localStorage.setItem(OPENROUTER_API_KEY_STORAGE_KEY, keyToSave);
    localStorage.setItem(OPENROUTER_SELECTED_MODEL_STORAGE_KEY, modelToSave);
    setApiKey(keyToSave);
    setSelectedModel(modelToSave);
    
    toast({
      title: "Настройки LLM сохранены",
      description: "Настройки LLM успешно сохранены!",
      variant: "success"
    });
    
    if (availableModels.length === 0 && keyToSave) {
      fetchModels();
    }
  };

  const tabs = [
    { id: 'table' as TabType, label: 'Таблица', icon: '📊' },
    { id: 'tts' as TabType, label: 'Озвучка', icon: '🔊' },
    { id: 'llm' as TabType, label: 'ИИ Модель', icon: '🤖' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'table':
        return (
          <div className="space-y-6">
            <div>
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
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={handleSaveTableSettings}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto"
              >
                Сохранить настройки таблицы
              </button>
            </div>
          </div>
        );

      case 'tts':
        return <TTSSettings />;

      case 'llm':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">Настройки LLM (OpenRouter)</h3>
              
              <div className="space-y-4">
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
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={handleSaveLLMSettings}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto"
              >
                Сохранить настройки LLM
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              Note: Using LLMs can incur costs. Please check OpenRouter&apos;s pricing for details.
              This application is not responsible for any charges.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Настройки</h2>

      {/* Tab Navigation */}
      <div className="flex flex-wrap border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Settings;
