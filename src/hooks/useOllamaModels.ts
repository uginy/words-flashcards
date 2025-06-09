import { useState, useRef } from 'react';
import { createOllamaClient } from '../services/ollama/api-client';
import { useToast } from './use-toast';

interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface UseOllamaModelsResult {
  models: OllamaModel[];
  isLoading: boolean;
  error: string | null;
  fetchModels: (apiUrl: string, force?: boolean) => Promise<void>;
  checkHealth: (apiUrl: string) => Promise<boolean>;
  clearError: () => void;
  isServerUnavailable: boolean;
}

const RETRY_COOLDOWN_MS = 30000; // 30 seconds cooldown between retry attempts
const MAX_CONSECUTIVE_FAILURES = 3; // After 3 failures, mark server as unavailable

export const useOllamaModels = (): UseOllamaModelsResult => {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isServerUnavailable, setIsServerUnavailable] = useState(false);
  const { toast } = useToast();
  
  const lastFailureTime = useRef<number>(0);
  const consecutiveFailures = useRef<number>(0);
  const failedUrls = useRef<Set<string>>(new Set());

  const checkHealth = async (apiUrl: string): Promise<boolean> => {
    try {
      const ollamaClient = createOllamaClient(apiUrl);
      return await ollamaClient.checkHealth();
    } catch (error) {
      console.error('Error checking Ollama health:', error);
      return false;
    }
  };

  const clearError = () => {
    setError(null);
    setIsServerUnavailable(false);
    consecutiveFailures.current = 0;
    lastFailureTime.current = 0;
    failedUrls.current.clear();
  };

  const canRetry = (apiUrl: string): boolean => {
    const now = Date.now();
    const timeSinceLastFailure = now - lastFailureTime.current;
    
    // If this URL has failed recently and we're in cooldown period, don't retry
    if (failedUrls.current.has(apiUrl) && timeSinceLastFailure < RETRY_COOLDOWN_MS) {
      return false;
    }
    
    // If we've had too many consecutive failures, don't retry
    if (consecutiveFailures.current >= MAX_CONSECUTIVE_FAILURES) {
      return false;
    }
    
    return true;
  };

  const recordFailure = (apiUrl: string) => {
    lastFailureTime.current = Date.now();
    consecutiveFailures.current += 1;
    failedUrls.current.add(apiUrl);
    
    if (consecutiveFailures.current >= MAX_CONSECUTIVE_FAILURES) {
      setIsServerUnavailable(true);
    }
  };

  const recordSuccess = () => {
    consecutiveFailures.current = 0;
    setIsServerUnavailable(false);
    failedUrls.current.clear();
  };

  const fetchModels = async (apiUrl: string, force = false) => {
    // Check if we should skip this attempt
    if (!force && !canRetry(apiUrl)) {
      const timeSinceLastFailure = Date.now() - lastFailureTime.current;
      const remainingCooldown = Math.ceil((RETRY_COOLDOWN_MS - timeSinceLastFailure) / 1000);
      
      if (consecutiveFailures.current >= MAX_CONSECUTIVE_FAILURES) {
        setError('Ollama server appears to be unavailable. Please check your configuration.');
      } else {
        setError(`Too many failed attempts. Retry in ${remainingCooldown} seconds.`);
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const isHealthy = await checkHealth(apiUrl);
      
      if (!isHealthy) {
        recordFailure(apiUrl);
        throw new Error('Ollama service is not available at the specified URL');
      }

      const ollamaClient = createOllamaClient(apiUrl);
      const response = await ollamaClient.listModels();
      
      if (response?.models) {
        setModels(response.models);
        recordSuccess();
        toast({
          title: "Модели загружены",
          description: `Найдено ${response.models.length} моделей Ollama`,
          variant: "default"
        });
      } else {
        setModels([]);
        toast({
          title: "Предупреждение",
          description: "Не найдено моделей Ollama",
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      recordFailure(apiUrl);
      setError(errorMessage);
      setModels([]);
      
      if (consecutiveFailures.current < MAX_CONSECUTIVE_FAILURES) {
        toast({
          title: "Ошибка подключения к Ollama",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    models,
    isLoading,
    error,
    fetchModels,
    checkHealth,
    clearError,
    isServerUnavailable
  };
};
