import { createOpenAIClient, retryWithBackoff } from './api-client';
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
function getLevelDescription(level: string): string {
  if (level.includes('Алеф') || level.includes('א')) {
    return 'начальный уровень - самые базовые, простые слова для новичков';
  }
  if (level.includes('Бет') || level.includes('ב')) {
    return 'элементарный уровень - простые повседневные слова';
  }
  if (level.includes('Гимель') || level.includes('ג')) {
    return 'средний уровень - более сложные слова, требующие хорошего знания языка';
  }
  if (level.includes('Далет') || level.includes('ד')) {
    return 'выше среднего уровень - продвинутые слова для опытных изучающих';
  }
  if (level.includes('Һей') || level.includes('ה')) {
    return 'высокий уровень - сложные академические и специализированные термины';
  }
  if (level.includes('Вав') || level.includes('ו')) {
    return 'профессиональный уровень - очень сложные слова, литературная лексика, архаизмы, высокий иврит';
  }
  return 'средний уровень';
}

export async function fetchSuggestedWords(
  params: SuggestWordsParams,
  options: WordSuggestionsOptions = {}
): Promise<string[]> {
  const { category, level, apiKey, modelIdentifier, count } = params;
  const retryConfig = { ...defaultRetryConfig, ...options.retryConfig };
  const logger = options.enableDetailedLogging ? console.log : undefined;

  if (!apiKey || !modelIdentifier) {
    throw new Error('API key or model not configured.');
  }

  // Special handling for phrases category
  const isPhrases = category.includes('Фразы') || category.includes('פרזות');
  const levelDescription = getLevelDescription(level);
  
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
      throw new Error('No content in API response');
    }

    return content;
  };

  try {
    const response = await retryWithBackoff(operation, retryConfig, logger);
    
    // Split response and clean up words
    return response.split(',').map((word: string) => word.trim()).filter(Boolean);
  } catch (error) {
    if (logger) {
      logger('Error fetching word suggestions:', error);
    }
    throw error;
  }
}