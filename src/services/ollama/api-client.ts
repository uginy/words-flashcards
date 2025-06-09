import type { RetryConfig } from '../openrouter/types';
import { DEFAULT_RETRY_CONFIG } from '../openrouter/config';

// Ollama API client
export class OllamaClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl = "http://localhost:11434/api", timeout = 60000) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = timeout;
  }

  async chat(options: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    stream?: boolean;
    format?: 'json';
    signal?: AbortSignal;
  }) {
    const timeoutSignal = AbortSignal.timeout(this.timeout);
    const combinedSignal = options.signal ? 
      AbortSignal.any([options.signal, timeoutSignal]) : 
      timeoutSignal;

    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature || 0.1,
        stream: options.stream || false,
        format: options.format,
        options: {
          temperature: options.temperature || 0.1,
          num_predict: 4000,
        }
      }),
      signal: combinedSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async generate(options: {
    model: string;
    prompt: string;
    temperature?: number;
    stream?: boolean;
    format?: 'json';
    signal?: AbortSignal;
  }) {
    const timeoutSignal = AbortSignal.timeout(this.timeout);
    const combinedSignal = options.signal ? 
      AbortSignal.any([options.signal, timeoutSignal]) : 
      timeoutSignal;

    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        prompt: options.prompt,
        temperature: options.temperature || 0.1,
        stream: options.stream || false,
        format: options.format,
        options: {
          temperature: options.temperature || 0.1,
          num_predict: 4000,
        }
      }),
      signal: combinedSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async listModels() {
    const response = await fetch(`${this.baseUrl}/tags`, {
      signal: AbortSignal.timeout(this.timeout)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list Ollama models: ${response.status}`);
    }

    return response.json();
  }

  async pullModel(model: string) {
    const response = await fetch(`${this.baseUrl}/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: model }),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model ${model}: ${response.status}`);
    }

    return response.json();
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/tags`, {
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Retry function with exponential backoff
export async function retryWithBackoffOllama<T>(
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

// Create Ollama client instance
export function createOllamaClient(baseUrl?: string, timeout?: number): OllamaClient {
  return new OllamaClient(baseUrl, timeout);
}
