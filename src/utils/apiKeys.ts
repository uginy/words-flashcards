import { FALLBACK_OPENROUTER_API_KEY } from '../config/openrouter';
import { FALLBACK_MICROSOFT_API_KEY } from '../config/microsoft';

const OPENROUTER_API_KEY_STORAGE_KEY = 'openRouterApiKey';
const MICROSOFT_API_KEY_STORAGE_KEY = 'tts_config';

/**
 * Get OpenRouter API key with fallback support
 * Returns user's API key if set, otherwise returns fallback key for demo purposes
 */
export function getOpenRouterApiKey(): string {
  const userApiKey = localStorage.getItem(OPENROUTER_API_KEY_STORAGE_KEY);
  
  // If user has set their own key and it's not empty, use it
  if (userApiKey && userApiKey.trim() !== '') {
    return userApiKey;
  }
  
  // Otherwise use fallback key for demo/presentation
  return FALLBACK_OPENROUTER_API_KEY;
}

/**
 * Get Microsoft Cognitive Services API key with fallback support
 * Returns user's API key if set, otherwise returns fallback key for demo purposes
 */
export function getMicrosoftApiKey(): string {
  // Try to get from TTS config first
  const ttsConfigJson = localStorage.getItem(MICROSOFT_API_KEY_STORAGE_KEY);
  if (ttsConfigJson) {
    try {
      const ttsConfig = JSON.parse(ttsConfigJson);
      if (ttsConfig.microsoftApiKey && ttsConfig.microsoftApiKey.trim() !== '') {
        return ttsConfig.microsoftApiKey;
      }
    } catch {
      // Ignore parsing errors
    }
  }
  
  // Otherwise use fallback key for demo/presentation
  return FALLBACK_MICROSOFT_API_KEY;
}

/**
 * Check if user has set their own OpenRouter API key
 */
export function hasUserOpenRouterApiKey(): boolean {
  const userApiKey = localStorage.getItem(OPENROUTER_API_KEY_STORAGE_KEY);
  return Boolean(userApiKey && userApiKey.trim() !== '');
}

/**
 * Check if user has set their own Microsoft API key
 */
export function hasUserMicrosoftApiKey(): boolean {
  const ttsConfigJson = localStorage.getItem(MICROSOFT_API_KEY_STORAGE_KEY);
  if (ttsConfigJson) {
    try {
      const ttsConfig = JSON.parse(ttsConfigJson);
      return Boolean(ttsConfig.microsoftApiKey && ttsConfig.microsoftApiKey.trim() !== '');
    } catch {
      return false;
    }
  }
  return false;
}
