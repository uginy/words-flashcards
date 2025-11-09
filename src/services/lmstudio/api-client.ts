import type { RetryConfig } from '../openrouter/types';
import { DEFAULT_RETRY_CONFIG } from '../openrouter/config';

// LM Studio API client (OpenAI-compatible)
export class LMStudioClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl = "http://localhost:1234/v1", timeout = 60000) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = timeout;
  }

  async chat(options: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    stream?: boolean;
    response_format?: { type: 'json_object' };
    signal?: AbortSignal;
  }) {
    const timeoutSignal = AbortSignal.timeout(this.timeout);
    const combinedSignal = options.signal ? 
      AbortSignal.any([options.signal, timeoutSignal]) : 
      timeoutSignal;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature || 0.1,
        stream: options.stream || false,
        response_format: options.response_format,
        max_tokens: 4000,
      }),
      signal: combinedSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LM Studio API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async listModels() {
    const response = await fetch(`${this.baseUrl}/models`, {
      signal: AbortSignal.timeout(this.timeout)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list LM Studio models: ${response.status}`);
    }

    return response.json();
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Retry function with exponential backoff
export async function retryWithBackoffLMStudio<T>(
  operation: () => Promise<T>,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
  logger?: (message: string) => void
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === retryConfig.maxRetries) {
        break;
      }
      
      // Check if this is a retriable error
      if (error instanceof Error) {
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error.message.includes('400') || error.message.includes('401') || 
            error.message.includes('403') || error.message.includes('404')) {
          break;
        }
      }
      
      const delay = Math.min(
        retryConfig.baseDelay * (retryConfig.backoffMultiplier ** attempt),
        retryConfig.maxDelay
      );
      
      logger?.(`Attempt ${attempt + 1} failed: ${error instanceof Error ? error.message : String(error)}`);
      logger?.(`Retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Operation failed without specific error');
}

// Create LM Studio client instance
export function createLMStudioClient(baseUrl?: string, timeout?: number): LMStudioClient {
  return new LMStudioClient(baseUrl, timeout);
}
