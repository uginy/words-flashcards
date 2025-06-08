// Main export file for Ollama service
export { enrichWordsWithOllama } from './enrichment';
export { createOllamaClient, retryWithBackoffOllama, OllamaClient } from './api-client';
export { systemPromptForOllama, directJsonPromptForOllama, simplePromptForOllama } from './prompts';

// Re-export config for convenience
export {
  DEFAULT_OLLAMA_API_URL,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_TEMPERATURE,
  DEFAULT_OLLAMA_TIMEOUT,
  DEFAULT_OLLAMA_MAX_TOKENS,
  RECOMMENDED_OLLAMA_MODELS
} from '../../config/ollama';
