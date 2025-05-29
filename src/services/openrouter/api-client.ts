import OpenAI from "openai";
import type { RetryConfig } from './types';

// Exponential backoff retry mechanism
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  logger?: (message: string) => void
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      if (attempt > 0 && logger) {
        logger(`Retry attempt ${attempt}/${config.maxRetries}`);
      }
      
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (logger) {
        logger(`Attempt ${attempt + 1} failed: ${lastError.message}`);
      }
      
      // Don't retry on abort errors
      if (lastError.name === 'AbortError') {
        throw lastError;
      }
      
      // Don't retry on certain critical errors
      if (lastError.message.includes('Authentication') ||
          lastError.message.includes('API key') ||
          lastError.message.includes('401')) {
        throw lastError;
      }
      
      if (attempt < config.maxRetries) {
        const delay = Math.min(
          config.baseDelay * (config.backoffMultiplier ** attempt),
          config.maxDelay
        );
        
        if (logger) {
          logger(`Waiting ${delay}ms before retry...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

// Create OpenAI client for OpenRouter
export function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });
}