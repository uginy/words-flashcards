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
import { DataSettings } from './settings/DataSettings';
import { useToast } from '../hooks/use-toast';
import { useOllamaModels } from '../hooks/useOllamaModels';
import {
  type LLMSettings,
  loadLLMSettings,
  saveLLMSettings,
} from '../config/llm-settings';
import {
  type ImageGenerationSettings,
  type ImageSizeOption,
  loadImageSettings,
  saveImageSettings,
  DEFAULT_IMAGE_SETTINGS,
} from '../config/image-generation';
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

type TabType = 'table' | 'tts' | 'llm' | 'data' | 'images';
type LLMProviderTab = 'openrouter' | 'ollama' | 'lmstudio';

const Settings: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('llm');
  const [llmProviderTab, setLLMProviderTab] = useState<LLMProviderTab>('openrouter');
  const [pageSize, setPageSize] = useState<number>(10);
  
  // LLM Settings state
  const [llmSettings, setLLMSettings] = useState<LLMSettings>(() => loadLLMSettings());
  const [imageSettings, setImageSettings] = useState<ImageGenerationSettings>(() => loadImageSettings());
  const [showBananaApiKey, setShowBananaApiKey] = useState<boolean>(false);
  
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

  // LM Studio state
  const [lmStudioModels, setLmStudioModels] = useState<string[]>([]);
  const [isLoadingLmStudioModels, setIsLoadingLmStudioModels] = useState<boolean>(false);
  const [isLmStudioServerUnavailable, setIsLmStudioServerUnavailable] = useState<boolean>(false);

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
    if (activeTab === 'llm' &&
        llmSettings.provider === 'lmstudio' &&
        llmSettings.lmstudio.apiUrl &&
        lmStudioModels.length === 0 &&
        !isLoadingLmStudioModels &&
        !isLmStudioServerUnavailable) {
      fetchLmStudioModels(llmSettings.lmstudio.apiUrl);
    }
  }, [activeTab, llmSettings.provider, llmSettings.ollama.apiUrl, ollamaModels.length, isLoadingOllamaModels, isOllamaServerUnavailable, fetchOllamaModels, llmSettings.lmstudio.apiUrl, lmStudioModels.length, isLoadingLmStudioModels, isLmStudioServerUnavailable]);

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
      description: `Провайдер: ${llmSettings.provider === 'openrouter' ? 'OpenRouter' : llmSettings.provider === 'ollama' ? 'Ollama' : 'LM Studio'}`,
      variant: "default"
    });
  };

  const handleProviderTabChange = (tab: LLMProviderTab) => {
    setLLMProviderTab(tab);
    // Update provider in settings when tab changes
    setLLMSettings(prev => ({ ...prev, provider: tab }));
    
    // Auto-fetch models when switching to provider tab
    if (tab === 'ollama' &&
        llmSettings.ollama.apiUrl &&
        ollamaModels.length === 0 &&
        !isOllamaServerUnavailable) {
      fetchOllamaModels(llmSettings.ollama.apiUrl);
    }
    if (tab === 'lmstudio' &&
        llmSettings.lmstudio.apiUrl &&
        lmStudioModels.length === 0 &&
        !isLmStudioServerUnavailable) {
      fetchLmStudioModels(llmSettings.lmstudio.apiUrl);
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

  const fetchLmStudioModels = async (apiUrl: string, force = false) => {
    setIsLoadingLmStudioModels(true);
    setIsLmStudioServerUnavailable(false);
    try {
      const response = await fetch(`${apiUrl}/models`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      const data = await response.json();
      const models = data.data || [];
      setLmStudioModels(models.map((model: any) => model.id));
    } catch (error) {
      console.error('Error fetching LM Studio models:', error);
      setIsLmStudioServerUnavailable(true);
      setLmStudioModels([]);
    } finally {
      setIsLoadingLmStudioModels(false);
    }
  };

  const handleLmStudioApiUrlChange = (apiUrl: string) => {
    setLLMSettings(prev => ({
      ...prev,
      lmstudio: { ...prev.lmstudio, apiUrl }
    }));
    setIsLmStudioServerUnavailable(false);
    setLmStudioModels([]);
  };

  const handleLmStudioModelChange = (selectedModel: string) => {
    setLLMSettings(prev => ({
      ...prev,
      lmstudio: { ...prev.lmstudio, selectedModel }
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

  const handleSaveImageSettings = () => {
    saveImageSettings(imageSettings);
    toast({
      title: "Настройки изображений сохранены",
      description: "Gemini Banana готов генерировать 256×256 иконки.",
      variant: "default"
    });
  };

  const updateBananaSettings = (partial: Partial<ImageGenerationSettings['banana']>) => {
    setImageSettings(prev => ({
      ...prev,
      banana: { ...prev.banana, ...partial }
    }));
  };

  const handleImageApiKeyChange = (apiKey: string) => updateBananaSettings({ apiKey });
  const handleImageModelChange = (modelId: string) => updateBananaSettings({ modelId });
  const handleImageBaseUrlChange = (baseUrl: string) => updateBananaSettings({ baseUrl });
  const handleImageSizeChange = (size: ImageSizeOption) => updateBananaSettings({ size });
  const handleImagePromptTemplateChange = (promptTemplate: string) => {
    setImageSettings(prev => ({ ...prev, promptTemplate }));
  };
  const handleResetImagePromptTemplate = () => {
    setImageSettings(prev => ({ ...prev, promptTemplate: DEFAULT_IMAGE_SETTINGS.promptTemplate }));
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
     { id: 'images' as TabType, label: 'Изображения', icon: '🖼️' },
    { id: 'table' as TabType, label: 'Таблица', icon: '📊' },
    { id: 'data' as TabType, label: 'Данные', icon: '💾' },
  ];

  const llmProviderTabs = [
    { id: 'openrouter' as LLMProviderTab, label: 'OpenRouter', icon: '🌐' },
    { id: 'ollama' as LLMProviderTab, label: 'Ollama', icon: '🏠' },
    { id: 'lmstudio' as LLMProviderTab, label: 'LM Studio', icon: '🖥️' }
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

      case 'lmstudio':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="lmstudioApiUrl" className="block text-sm font-medium text-gray-700 mb-1">
                LM Studio API URL
              </label>
              <input
                type="url"
                id="lmstudioApiUrl"
                className="w-full px-3 py-2 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={llmSettings.lmstudio.apiUrl}
                onChange={(e) => handleLmStudioApiUrlChange(e.target.value)}
                placeholder="http://localhost:1234/v1"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL LM Studio OpenAI-совместимого API (по умолчанию http://localhost:1234/v1)
              </p>
            </div>

            <div>
              <label htmlFor="lmstudioModelSelect" className="block text-sm font-medium text-gray-700 mb-1">
                Выберите модель LM Studio
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <Combobox
                    options={lmStudioModels.map((modelName) => ({
                      value: modelName,
                      label: modelName
                    }))}
                    value={llmSettings.lmstudio.selectedModel}
                    onValueChange={handleLmStudioModelChange}
                    placeholder="Выберите модель LM Studio"
                    searchPlaceholder="Поиск модели..."
                    noResultsText="Модели не найдены"
                    disabled={isLoadingLmStudioModels || lmStudioModels.length === 0}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchLmStudioModels(llmSettings.lmstudio.apiUrl, true)}
                  disabled={!llmSettings.lmstudio.apiUrl || isLoadingLmStudioModels}
                  className="px-3 py-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-green-300 shrink-0 w-full sm:w-auto"
                >
                  {isLoadingLmStudioModels ? 'Загрузка...' : 'Проверить'}
                </button>
              </div>
              {isLmStudioServerUnavailable && (
                <div className="text-xs text-orange-600 mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                  <p className="font-medium">⚠️ Сервер LM Studio недоступен</p>
                  <p className="mt-1">Убедитесь, что LM Studio запущен и включен OpenAI-совместимый API.</p>
                </div>
              )}
              {lmStudioModels.length === 0 && !isLoadingLmStudioModels && llmSettings.lmstudio.apiUrl && !isLmStudioServerUnavailable && (
                <p className="text-xs text-red-500 mt-1">
                  Модели не найдены. Убедитесь, что LM Studio запущен и URL правильный.
                </p>
              )}
              {lmStudioModels.length > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  ✅ Найдено {lmStudioModels.length} моделей
                </p>
              )}
            </div>

            <div className="bg-blue-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Настройка LM Studio:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>Запустите LM Studio и загрузите модель</li>
                <li>Включите "OpenAI-compatible API" в настройках</li>
                <li>Убедитесь, что API доступен на http://localhost:1234/v1</li>
                <li>Используйте модели, совместимые с OpenAI API</li>
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

      case 'data':
        return <DataSettings isActive={activeTab === 'data'} />;

      case 'images':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Image Generation API</h3>
              <p className="text-sm text-gray-600">
                Генерируйте ассоциативные иконки 256×256 для слов на иврите через бесплатный тариф Gemini Nano (Banana Models).
              </p>
              <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-md p-3 text-sm text-indigo-800">
                <p className="font-medium mb-1">Gemini 2.5 Flash Image · Banana Models</p>
                <p>Модель: <code className="text-indigo-900">{imageSettings.banana.modelId}</code></p>
                <p className="mt-1">Тариф Free Tier даёт хороший лимит запросов, поэтому иконки генерируются по требованию из списка слов.</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <label htmlFor="imageApiKey" className="block text-sm font-medium text-gray-700 mb-1">
                  Banana API Key
                </label>
                <div className="relative">
                  <input
                    type={showBananaApiKey ? "text" : "password"}
                    id="imageApiKey"
                    className="w-full px-3 py-2 pr-10 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={imageSettings.banana.apiKey}
                    onChange={(e) => handleImageApiKeyChange(e.target.value)}
                    placeholder="Введите API ключ Banana"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBananaApiKey(!showBananaApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    title={showBananaApiKey ? "Скрыть ключ" : "Показать ключ"}
                  >
                    {showBananaApiKey ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Хранится локально в браузере, не отправляется на сервер.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="imageModelId" className="block text-sm font-medium text-gray-700 mb-1">
                    Модель
                  </label>
                  <input
                    type="text"
                    id="imageModelId"
                    className="w-full px-3 py-2 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={imageSettings.banana.modelId}
                    onChange={(e) => handleImageModelChange(e.target.value)}
                    placeholder="models/gemini-2.5-flash-image"
                  />
                  <p className="text-xs text-gray-500 mt-1">Рекомендуемая бесплатная модель Banana.</p>
                </div>
                <div>
                  <label htmlFor="imageBaseUrl" className="block text-sm font-medium text-gray-700 mb-1">
                    Base URL
                  </label>
                  <input
                    type="url"
                    id="imageBaseUrl"
                    className="w-full px-3 py-2 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={imageSettings.banana.baseUrl}
                    onChange={(e) => handleImageBaseUrlChange(e.target.value)}
                    placeholder="https://models.banana.dev"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Введите корень (например, https://models.banana.dev) — приложение само добавит /ai/&lt;model&gt;.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Размер изображения
                </label>
                <Select
                  value={imageSettings.banana.size}
                  onValueChange={(value) => handleImageSizeChange(value as ImageSizeOption)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите размер" />
                  </SelectTrigger>
                  <SelectContent>
                    {['256x256', '512x512', '768x768'].map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">256×256 — оптимально для карточек, другие опции пригодятся позже.</p>
              </div>

              <div>
                <label htmlFor="imagePromptTemplate" className="block text-sm font-medium text-gray-700 mb-1">
                  Prompt template
                </label>
                <textarea
                  id="imagePromptTemplate"
                  className="w-full min-h-[120px] px-3 py-2 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={imageSettings.promptTemplate}
                  onChange={(e) => handleImagePromptTemplateChange(e.target.value)}
                  placeholder={DEFAULT_IMAGE_SETTINGS.promptTemplate}
                />
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-2">
                  <span>Поддерживаются плейсхолдеры:</span>
                  <code className="px-2 py-0.5 bg-gray-100 rounded">{'{{hebrew}}'}</code>
                  <code className="px-2 py-0.5 bg-gray-100 rounded">{'{{translation}}'}</code>
                  <code className="px-2 py-0.5 bg-gray-100 rounded">{'{{category}}'}</code>
                </div>
                <button
                  type="button"
                  onClick={handleResetImagePromptTemplate}
                  className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 underline"
                >
                  Сбросить шаблон по умолчанию
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={handleSaveImageSettings}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 w-full sm:w-auto"
              >
                Сохранить настройки генерации
              </button>
            </div>
          </div>
        );

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
                <strong>Текущий провайдер:</strong> {llmSettings.provider === 'openrouter' ? 'OpenRouter (требует интернет)' : llmSettings.provider === 'ollama' ? 'Ollama (локальный)' : 'LM Studio (локальный)'}
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
