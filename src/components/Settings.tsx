import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
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
      toast({
        title: t('settings.modelsFetchError'),
        description: t('settings.modelsFetchErrorDesc'),
        variant: "error"
      });
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
    setApiKey(keyToSave);
    setSelectedModel(modelToSave);
    
    toast({
      title: t('settings.settingsSaved'),
      description: t('settings.settingsSavedDescription'),
      variant: "success"
    });
    
    if (availableModels.length === 0 && keyToSave) {
      fetchModels();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">{t('settings.title')}</h2>


      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">{t('settings.tableSettings')}</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('settings.recordsPerPage')}
          </label>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => setPageSize(Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('settings.recordsPerPagePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 30, 50, 100, 150, 200].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size} {t('settings.recordsText')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* TTS Settings */}
        <TTSSettings />

        {/* OpenRouter Settings */}
        <h3 className="text-lg font-medium text-gray-800 mb-4">{t('settings.llmSettings')}</h3>
        
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
            {t('settings.apiKeyLabel')}
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
            {t('settings.apiKeyHint')}
          </p>
        </div>

        <div>
          <label htmlFor="modelSelect" className="block text-sm font-medium text-gray-700 mb-1">
            {t('settings.modelSelectLabel')}
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
                searchPlaceholder={t('settings.searchModelPlaceholder')}
                noResultsText={t('settings.noModelsFound')}
                disabled={isLoadingModels || availableModels.length === 0}
              />
            </div>
            <button
              type="button"
              onClick={fetchModels}
              disabled={!apiKey || isLoadingModels}
              className="px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 shrink-0 w-full sm:w-auto"
            >
              {isLoadingModels ? t('settings.refreshingButton') : t('settings.refreshButton')}
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
                {t('settings.showFreeOnlyLabel')}
            </label>
          </div>
          {availableModels.length === 0 && !isLoadingModels && apiKey && (
            <p className="text-xs text-red-500 mt-1">
              {t('settings.noModelsError')}
            </p>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={handleSaveSettings}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto"
          >
            {t('settings.saveButton')}
          </button>
        </div>
      </div>
       <p className="text-xs text-gray-500 mt-6">
        {t('settings.costWarning')}
      </p>
    </div>
  );
};

export default Settings;
