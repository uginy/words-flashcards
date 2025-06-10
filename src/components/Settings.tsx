import type React from 'react';
import { useState, useEffect } from 'react';
import { Combobox } from './ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { loadTableSettings, saveTableSettings } from '@/utils/tableSettings';
import { TTSSettings } from './settings/TTSSettings';
import { useToast } from '../hooks/use-toast';
import { useOllamaModels } from '../hooks/useOllamaModels';
import {
  type LLMSettings,
  loadLLMSettings,
  saveLLMSettings,
} from '../config/llm-settings';
import { OLLAMA_MODEL_RATINGS } from '../config/ollama';

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
type LLMProviderTab = 'openrouter' | 'ollama';

const Settings: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('llm');
  const [llmProviderTab, setLLMProviderTab] = useState<LLMProviderTab>('openrouter');
  const [pageSize, setPageSize] = useState<number>(10);
  
  // LLM Settings state
  const [llmSettings, setLLMSettings] = useState<LLMSettings>(() => loadLLMSettings());
  
  // OpenRouter state
  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<OpenRouterModel[]>([]);
  const [isLoadingOpenRouterModels, setIsLoadingOpenRouterModels] = useState<boolean>(false);
  const [showFreeOnly, setShowFreeOnly] = useState<boolean>(true);

  // Ollama state
  const { 
    models: ollamaModels, 
    isLoading: isLoadingOllamaModels, 
    fetchModels: fetchOllamaModels,
    clearError: clearOllamaError,
    isServerUnavailable: isOllamaServerUnavailable 
  } = useOllamaModels();

  useEffect(() => {
    const tableSettings = loadTableSettings();
    setPageSize(tableSettings.pageSize);
    
    // Set LLM provider tab based on saved settings
    setLLMProviderTab(llmSettings.provider);
  }, [llmSettings.provider]);

  useEffect(() => {
    if (llmSettings.openrouter.apiKey && llmProviderTab === 'openrouter') {
      fetchOpenRouterModels();
    }
  }, [llmSettings.openrouter.apiKey, llmProviderTab]);

  // Auto-fetch Ollama models when tab opens and URL is configured
  useEffect(() => {
    if (llmProviderTab === 'ollama' && 
        llmSettings.ollama.apiUrl && 
        ollamaModels.length === 0 && 
        !isLoadingOllamaModels &&
        !isOllamaServerUnavailable) {
      fetchOllamaModels(llmSettings.ollama.apiUrl);
    }
  }, [llmProviderTab, llmSettings.ollama.apiUrl, ollamaModels.length, isLoadingOllamaModels, isOllamaServerUnavailable, fetchOllamaModels]);

  // Auto-fetch Ollama models when user opens LLM settings tab and Ollama is the default provider
  useEffect(() => {
    if (activeTab === 'llm' && 
        llmSettings.provider === 'ollama' && 
        llmSettings.ollama.apiUrl && 
        ollamaModels.length === 0 && 
        !isLoadingOllamaModels &&
        !isOllamaServerUnavailable) {
      fetchOllamaModels(llmSettings.ollama.apiUrl);
    }
  }, [activeTab, llmSettings.provider, llmSettings.ollama.apiUrl, ollamaModels.length, isLoadingOllamaModels, isOllamaServerUnavailable, fetchOllamaModels]);

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

  const fetchOpenRouterModels = async () => {
    setIsLoadingOpenRouterModels(true);
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
        description: "Не удалось загрузить модели OpenRouter.",
        variant: "destructive"
      });
      setAvailableModels([]);
    } finally {
      setIsLoadingOpenRouterModels(false);
    }
  };

  const handleSaveTableSettings = () => {
    saveTableSettings({ pageSize });
    toast({
      title: "Настройки таблицы сохранены",
      description: "Настройки таблицы успешно сохранены!",
      variant: "default"
    });
  };

  const handleSaveLLMSettings = () => {
    saveLLMSettings(llmSettings);
    
    toast({
      title: "Настройки ИИ сохранены",
      description: `Провайдер: ${llmSettings.provider === 'openrouter' ? 'OpenRouter' : 'Ollama'}`,
      variant: "default"
    });
  };

  const handleProviderTabChange = (tab: LLMProviderTab) => {
    setLLMProviderTab(tab);
    // Update provider in settings when tab changes
    setLLMSettings(prev => ({ ...prev, provider: tab }));
    
    // Auto-fetch models when switching to Ollama tab only if server is available
    if (tab === 'ollama' && 
        llmSettings.ollama.apiUrl && 
        ollamaModels.length === 0 &&
        !isOllamaServerUnavailable) {
      fetchOllamaModels(llmSettings.ollama.apiUrl);
    }
  };

  const handleOllamaApiUrlChange = (apiUrl: string) => {
    setLLMSettings(prev => ({
      ...prev,
      ollama: { ...prev.ollama, apiUrl }
    }));
    
    // Clear previous errors when URL changes
    if (apiUrl !== llmSettings.ollama.apiUrl) {
      clearOllamaError();
    }
  };

  const handleOllamaModelChange = (selectedModel: string) => {
    setLLMSettings(prev => ({
      ...prev,
      ollama: { ...prev.ollama, selectedModel }
    }));
  };

  const handleOpenRouterApiKeyChange = (apiKey: string) => {
    setLLMSettings(prev => ({
      ...prev,
      openrouter: { ...prev.openrouter, apiKey }
    }));
  };

  const handleOpenRouterModelChange = (selectedModel: string) => {
    setLLMSettings(prev => ({
      ...prev,
      openrouter: { ...prev.openrouter, selectedModel }
    }));
  };

  // Batch settings handlers
  const handleBatchSizeChange = (batchSize: number) => {
    setLLMSettings(prev => ({
      ...prev,
      batching: { ...prev.batching, batchSize }
    }));
  };

  const handleBatchDelayChange = (batchDelay: number) => {
    setLLMSettings(prev => ({
      ...prev,
      batching: { ...prev.batching, batchDelay }
    }));
  };

  const handleProgressiveDelayChange = (progressiveDelay: boolean) => {
    setLLMSettings(prev => ({
      ...prev,
      batching: { ...prev.batching, progressiveDelay }
    }));
  };

  const handleMaxDelaySecondsChange = (maxDelaySeconds: number) => {
    setLLMSettings(prev => ({
      ...prev,
      batching: { ...prev.batching, maxDelaySeconds }
    }));
  };

  const tabs = [
    { id: 'llm' as TabType, label: 'ИИ Модель', icon: '🤖' },
    { id: 'tts' as TabType, label: 'Озвучка', icon: '🔊' },
    { id: 'table' as TabType, label: 'Таблица', icon: '📊' },
  ];

  const llmProviderTabs = [
    { id: 'openrouter' as LLMProviderTab, label: 'OpenRouter', icon: '🌐' },
    { id: 'ollama' as LLMProviderTab, label: 'Ollama', icon: '🏠' }
  ];

  const renderLLMProviderContent = () => {
    switch (llmProviderTab) {
      case 'openrouter':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="openrouterApiKey" className="block text-sm font-medium text-gray-700 mb-1">
                OpenRouter API Key
              </label>
              <input
                type="password"
                id="openrouterApiKey"
                className="w-full px-3 py-2 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={llmSettings.openrouter.apiKey}
                onChange={(e) => handleOpenRouterApiKeyChange(e.target.value)}
                placeholder="Введите ваш API ключ OpenRouter"
              />
              <p className="text-xs text-gray-500 mt-1">
                API ключ сохраняется локально в браузере
              </p>
            </div>

            <div>
              <label htmlFor="openrouterModelSelect" className="block text-sm font-medium text-gray-700 mb-1">
                Выберите модель OpenRouter
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <Combobox
                    options={filteredModels.map((model) => ({
                      value: model.id,
                      label: `${model.name} (Prompt: $${model.pricing.prompt}, Completion: $${model.pricing.completion})`
                    }))}
                    value={llmSettings.openrouter.selectedModel}
                    onValueChange={handleOpenRouterModelChange}
                    placeholder="Выберите модель"
                    searchPlaceholder="Поиск модели..."
                    noResultsText="Модели не найдены"
                    disabled={isLoadingOpenRouterModels || availableModels.length === 0}
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchOpenRouterModels}
                  disabled={!llmSettings.openrouter.apiKey || isLoadingOpenRouterModels}
                  className="px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 shrink-0 w-full sm:w-auto"
                >
                  {isLoadingOpenRouterModels ? 'Обновление...' : 'Обновить'}
                </button>
              </div>
              <div className="flex items-center mt-2">
                <input
                  id="freeOnly"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={showFreeOnly}
                  onChange={(e) => setShowFreeOnly(e.target.checked)}
                />
                <label htmlFor="freeOnly" className="ml-2 block text-sm text-gray-900">
                  Показывать только бесплатные модели ($0)
                </label>
              </div>
              {availableModels.length === 0 && !isLoadingOpenRouterModels && llmSettings.openrouter.apiKey && (
                <p className="text-xs text-red-500 mt-1">
                  Модели не загружены. Проверьте правильность API ключа.
                </p>
              )}
            </div>
          </div>
        );

      case 'ollama':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="ollamaApiUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Ollama API URL
              </label>
              <input
                type="url"
                id="ollamaApiUrl"
                className="w-full px-3 py-2 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={llmSettings.ollama.apiUrl}
                onChange={(e) => handleOllamaApiUrlChange(e.target.value)}
                placeholder="http://localhost:11434/api"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL вашего локального экземпляра Ollama
              </p>
            </div>

            <div>
              <label htmlFor="ollamaModelSelect" className="block text-sm font-medium text-gray-700 mb-1">
                Выберите модель Ollama
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <Combobox
                    options={ollamaModels.map((model) => {
                      const rating = OLLAMA_MODEL_RATINGS[model.name as keyof typeof OLLAMA_MODEL_RATINGS];
                      const label = rating 
                        ? `${model.name} - ${rating.description} (Качество: ${rating.quality}/5)`
                        : model.name;
                      
                      return {
                        value: model.name,
                        label
                      };
                    })}
                    value={llmSettings.ollama.selectedModel}
                    onValueChange={handleOllamaModelChange}
                    placeholder="Выберите модель Ollama"
                    searchPlaceholder="Поиск модели..."
                    noResultsText="Модели не найдены"
                    disabled={isLoadingOllamaModels || ollamaModels.length === 0}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchOllamaModels(llmSettings.ollama.apiUrl, true)}
                  disabled={!llmSettings.ollama.apiUrl || isLoadingOllamaModels}
                  className="px-3 py-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-green-300 shrink-0 w-full sm:w-auto"
                >
                  {isLoadingOllamaModels ? 'Загрузка...' : 'Проверить'}
                </button>
              </div>
              {isOllamaServerUnavailable && (
                <div className="text-xs text-orange-600 mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                  <p className="font-medium">⚠️ Сервер Ollama недоступен</p>
                  <p className="mt-1">Проверьте подключение или нажмите "Проверить" для повторной попытки.</p>
                </div>
              )}
              {ollamaModels.length === 0 && !isLoadingOllamaModels && llmSettings.ollama.apiUrl && !isOllamaServerUnavailable && (
                <p className="text-xs text-red-500 mt-1">
                  Модели не найдены. Убедитесь, что Ollama запущен и URL правильный.
                </p>
              )}
              {ollamaModels.length > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  ✅ Найдено {ollamaModels.length} моделей
                </p>
              )}
            </div>

            <div className="bg-blue-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Рекомендуемые модели для иврита:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li><strong>gemma3:4b</strong> - Лучший баланс качества и скорости</li>
                <li><strong>llama3.2:latest</strong> - Быстрый, но базовые категории</li>
                <li><strong>llama3.1:latest</strong> - Высокое качество, медленный</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
              <h3 className="text-lg font-medium text-gray-800 mb-4">Настройки ИИ моделей</h3>
              
              {/* Provider Tabs */}
              <div className="border-b border-gray-200 mb-4">
                <div className="flex">
                  {llmProviderTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleProviderTabChange(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        llmProviderTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {renderLLMProviderContent()}
            </div>

            {/* Batch Processing Settings */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-800 mb-4">⚙️ Настройки батчевой обработки</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="batchSize" className="block text-sm font-medium text-gray-700 mb-1">
                    Размер пачки (количество слов)
                  </label>
                  <input
                    type="number"
                    id="batchSize"
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={llmSettings.batching.batchSize}
                    onChange={(e) => handleBatchSizeChange(Number(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Количество слов для обработки за один запрос (1-20)
                  </p>
                </div>

                <div>
                  <label htmlFor="batchDelay" className="block text-sm font-medium text-gray-700 mb-1">
                    Задержка между запросами (мс)
                  </label>
                  <input
                    type="number"
                    id="batchDelay"
                    min="0"
                    max="10000"
                    step="100"
                    className="w-full px-3 py-2 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={llmSettings.batching.batchDelay}
                    onChange={(e) => handleBatchDelayChange(Number(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Пауза между запросами для предотвращения перегрузки
                  </p>
                </div>

                <div>
                  <label htmlFor="progressiveDelay" className="flex items-center text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      id="progressiveDelay"
                      className="mr-2"
                      checked={llmSettings.batching.progressiveDelay}
                      onChange={(e) => handleProgressiveDelayChange(e.target.checked)}
                    />
                    Прогрессивные задержки
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Увеличивать задержки при повторных запросах
                  </p>
                </div>

                <div>
                  <label htmlFor="maxDelaySeconds" className="block text-sm font-medium text-gray-700 mb-1">
                    Максимальная задержка (сек)
                  </label>
                  <input
                    type="number"
                    id="maxDelaySeconds"
                    min="1"
                    max="300"
                    className="w-full px-3 py-2 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={llmSettings.batching.maxDelaySeconds}
                    onChange={(e) => handleMaxDelaySecondsChange(Number(e.target.value))}
                    disabled={!llmSettings.batching.progressiveDelay}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Максимальное время ожидания при прогрессивных задержках
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={handleSaveLLMSettings}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto"
              >
                Сохранить настройки ИИ
              </button>
            </div>

            <div className="bg-yellow-50 p-3 rounded-md">
              <p className="text-xs text-yellow-800">
                <strong>Текущий провайдер:</strong> {llmSettings.provider === 'openrouter' ? 'OpenRouter (требует интернет)' : 'Ollama (локальный)'}
              </p>
            </div>
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
            type="button"
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
