import { useState, useEffect } from 'react';
import { loadLLMSettings, type LLMSettings } from '../config/llm-settings';

export const useLLMSettings = () => {
  const [settings, setSettings] = useState<LLMSettings>(() => loadLLMSettings());

  // Listen for storage changes to sync across tabs
  useEffect(() => {
    const handleStorageChange = () => {
      setSettings(loadLLMSettings());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const refreshSettings = () => {
    setSettings(loadLLMSettings());
  };

  return {
    settings,
    refreshSettings,
    // Convenience getters
    currentProvider: settings.provider,
    openRouterApiKey: settings.openrouter.apiKey,
    openRouterModel: settings.openrouter.selectedModel,
    ollamaApiUrl: settings.ollama.apiUrl,
    ollamaModel: settings.ollama.selectedModel,
    // Check if provider is properly configured
    isOpenRouterConfigured: settings.openrouter.apiKey.trim() !== '',
    isOllamaConfigured: settings.ollama.apiUrl.trim() !== '' && settings.ollama.selectedModel.trim() !== '',
    isCurrentProviderConfigured: settings.provider === 'openrouter' 
      ? settings.openrouter.apiKey.trim() !== ''
      : settings.ollama.apiUrl.trim() !== '' && settings.ollama.selectedModel.trim() !== ''
  };
};
