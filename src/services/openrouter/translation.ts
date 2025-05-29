import { createOpenAIClient, retryWithBackoff } from './api-client';
import { translationSystemPrompt } from './prompts';
import { DEFAULT_OPENROUTER_API_KEY, DEFAULT_OPENROUTER_MODEL } from '../../config/openrouter';
import type { RetryConfig } from './types';

interface TranslationOptions {
  retryConfig?: Partial<RetryConfig>;
  enableDetailedLogging?: boolean;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 8000,
  backoffMultiplier: 2,
};

export async function translateToHebrew(
  russianText: string,
  apiKey: string = localStorage.getItem('openRouterApiKey') || DEFAULT_OPENROUTER_API_KEY,
  modelIdentifier: string = localStorage.getItem('openRouterModel') || DEFAULT_OPENROUTER_MODEL,
  options: TranslationOptions = {}
): Promise<string[]> {
  if (!apiKey || !modelIdentifier) {
    throw new Error('API key or model not configured.');
  }

  const retryConfig = { ...defaultRetryConfig, ...options.retryConfig };
  const logger = options.enableDetailedLogging ? console.log : undefined;

  const openai = createOpenAIClient(apiKey);

  const operation = async () => {
    const completion = await openai.chat.completions.create({
      model: modelIdentifier,
      messages: [
        { role: 'system', content: translationSystemPrompt },
        { role: 'user', content: russianText }
      ],
      stream: false
    });

    if (!completion.choices || !completion.choices[0]?.message?.content) {
      throw new Error('Invalid translation response');
    }

    return completion.choices[0].message.content;
  };

  try {
    const response = await retryWithBackoff(operation, retryConfig, logger);
    
    // Split response into lines and process each line's translations
    return response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .flatMap(line =>
        line.split(',').map(word => word.trim()).filter(word => word.length > 0)
      );
  } catch (error) {
    if (logger) {
      logger('Translation error:', error);
    }
    throw error;
  }
}