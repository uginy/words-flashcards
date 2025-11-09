// Main export file for LM Studio service
export { enrichWordsWithLMStudio } from './enrichment';
export { fetchSuggestedWordsWithLMStudio } from './word-suggestions';
export { createLMStudioClient, retryWithBackoffLMStudio, LMStudioClient } from './api-client';
export { systemPromptForLMStudio, directJsonPromptForLMStudio, simplePromptForLMStudio } from './prompts';

// Re-export config for convenience
export {
  DEFAULT_LMSTUDIO_API_URL,
  DEFAULT_LMSTUDIO_MODEL,
  DEFAULT_LMSTUDIO_TEMPERATURE,
  DEFAULT_LMSTUDIO_TIMEOUT,
  DEFAULT_LMSTUDIO_MAX_TOKENS,
  RECOMMENDED_LMSTUDIO_MODELS
} from '../../config/lmstudio';
