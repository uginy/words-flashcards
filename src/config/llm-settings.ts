import { DEFAULT_OPENROUTER_API_KEY, DEFAULT_OPENROUTER_MODEL } from './openrouter';
import { DEFAULT_OLLAMA_API_URL, DEFAULT_OLLAMA_MODEL } from './ollama';

// Storage keys for LLM settings
export const LLM_PROVIDER_STORAGE_KEY = 'llmProvider';
export const OPENROUTER_API_KEY_STORAGE_KEY = 'openRouterApiKey';
export const OPENROUTER_SELECTED_MODEL_STORAGE_KEY = 'openRouterModel';
export const OLLAMA_API_URL_STORAGE_KEY = 'ollamaApiUrl';
export const OLLAMA_SELECTED_MODEL_STORAGE_KEY = 'ollamaModel';

// LLM Provider types
export type LLMProvider = 'openrouter' | 'ollama';

// Default settings
export const DEFAULT_LLM_PROVIDER: LLMProvider = 'openrouter';

export interface LLMSettings {
  provider: LLMProvider;
  openrouter: {
    apiKey: string;
    selectedModel: string;
  };
  ollama: {
    apiUrl: string;
    selectedModel: string;
  };
}

export const getDefaultLLMSettings = (): LLMSettings => ({
  provider: DEFAULT_LLM_PROVIDER,
  openrouter: {
    apiKey: DEFAULT_OPENROUTER_API_KEY,
    selectedModel: DEFAULT_OPENROUTER_MODEL,
  },
  ollama: {
    apiUrl: DEFAULT_OLLAMA_API_URL,
    selectedModel: DEFAULT_OLLAMA_MODEL,
  },
});

export const loadLLMSettings = (): LLMSettings => {
  const defaults = getDefaultLLMSettings();
  
  try {
    return {
      provider: (localStorage.getItem(LLM_PROVIDER_STORAGE_KEY) as LLMProvider) || defaults.provider,
      openrouter: {
        apiKey: localStorage.getItem(OPENROUTER_API_KEY_STORAGE_KEY) || defaults.openrouter.apiKey,
        selectedModel: localStorage.getItem(OPENROUTER_SELECTED_MODEL_STORAGE_KEY) || defaults.openrouter.selectedModel,
      },
      ollama: {
        apiUrl: localStorage.getItem(OLLAMA_API_URL_STORAGE_KEY) || defaults.ollama.apiUrl,
        selectedModel: localStorage.getItem(OLLAMA_SELECTED_MODEL_STORAGE_KEY) || defaults.ollama.selectedModel,
      },
    };
  } catch (error) {
    console.error('Error loading LLM settings:', error);
    return defaults;
  }
};

export const saveLLMSettings = (settings: LLMSettings): void => {
  try {
    localStorage.setItem(LLM_PROVIDER_STORAGE_KEY, settings.provider);
    localStorage.setItem(OPENROUTER_API_KEY_STORAGE_KEY, settings.openrouter.apiKey);
    localStorage.setItem(OPENROUTER_SELECTED_MODEL_STORAGE_KEY, settings.openrouter.selectedModel);
    localStorage.setItem(OLLAMA_API_URL_STORAGE_KEY, settings.ollama.apiUrl);
    localStorage.setItem(OLLAMA_SELECTED_MODEL_STORAGE_KEY, settings.ollama.selectedModel);
  } catch (error) {
    console.error('Error saving LLM settings:', error);
  }
};
