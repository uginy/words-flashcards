import { createOpenAIClient, retryWithBackoff } from './api-client';
import { useTranslation } from 'react-i18next';
import { wordSuggestionsSystemPrompt } from './prompts';
import type { RetryConfig } from './types';

interface SuggestWordsParams {
  category: string;
  level: string;
  apiKey: string;
  modelIdentifier: string;
  count: number;
}

interface WordSuggestionsOptions {
  retryConfig?: Partial<RetryConfig>;
  enableDetailedLogging?: boolean;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 8000,
  backoffMultiplier: 2,
};

// Helper function to get level description
function getLevelDescription(level: string, t: (key: string) => string): string {
  if (level.includes(t('levels.aleph')) || level.includes('א')) {
    return t('levels.beginner');
  }
  if (level.includes(t('levels.bet')) || level.includes('ב')) {
    return t('levels.elementary');
  }
  if (level.includes(t('levels.gimel')) || level.includes('ג')) {
    return t('levels.intermediate');
  }
  if (level.includes(t('levels.dalet')) || level.includes('ד')) {
    return t('levels.upperIntermediate');
  }
  if (level.includes(t('levels.hey')) || level.includes('ה')) {
    return t('levels.advanced');
  }
  if (level.includes(t('levels.vav')) || level.includes('ו')) {
    return t('levels.professional');
  }
  return t('levels.default');
}

export async function fetchSuggestedWords(
  params: SuggestWordsParams,
  options: WordSuggestionsOptions = {}
): Promise<string[]> {
  const { category, level, apiKey, modelIdentifier, count } = params;
  const { t } = useTranslation();
  const retryConfig = { ...defaultRetryConfig, ...options.retryConfig };
  const logger = options.enableDetailedLogging ? console.log : undefined;

  if (!apiKey || !modelIdentifier) {
    throw new Error(t('wordSuggestions.apiNotConfigured'));
  }

  // Special handling for phrases category
  const isPhrases = category.includes(t('categories.phrases')) || category.includes('פרזות');
  const levelDescription = getLevelDescription(level, t);
  
  const openai = createOpenAIClient(apiKey);
  
  const operation = async () => {
    const prompt = wordSuggestionsSystemPrompt(category, level, levelDescription, count, isPhrases);
    
    const response = await openai.chat.completions.create({
      model: modelIdentifier,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error(t('wordSuggestions.noContentInApiResponse'));
    }

    return content;
  };

  try {
    const response = await retryWithBackoff(operation, retryConfig, logger);
    
    // Split response and clean up words
    return response.split(',').map((word: string) => word.trim()).filter(Boolean);
  } catch (error) {
    if (logger) {
      logger(t('wordSuggestions.errorFetching'), error);
    }
    throw error;
  }
}