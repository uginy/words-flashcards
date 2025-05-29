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
      if (
        lastError.message.includes('Authentication') ||
        lastError.message.includes('API key') ||
        /401/.test(lastError.message) // Check for 401 status code in the message
      ) {
        // Check if the error message indicates a 401 error specifically
        if (/401/.test(lastError.message) || (lastError instanceof OpenAI.APIError && lastError.status === 401)) {
          throw new Error(
            'Authentication failed. Please check your OpenRouter API key. It might be invalid, missing, or your credits might have run out.'
          );
        }
        throw lastError; // Re-throw other critical errors as is
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