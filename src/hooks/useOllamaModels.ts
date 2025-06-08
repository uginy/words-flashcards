import { useState } from 'react';
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
  fetchModels: (apiUrl: string) => Promise<void>;
  checkHealth: (apiUrl: string) => Promise<boolean>;
}

export const useOllamaModels = (): UseOllamaModelsResult => {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const checkHealth = async (apiUrl: string): Promise<boolean> => {
    try {
      const ollamaClient = createOllamaClient(apiUrl);
      return await ollamaClient.checkHealth();
    } catch (error) {
      console.error('Error checking Ollama health:', error);
      return false;
    }
  };

  const fetchModels = async (apiUrl: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const isHealthy = await checkHealth(apiUrl);
      
      if (!isHealthy) {
        throw new Error('Ollama service is not available at the specified URL');
      }

      const ollamaClient = createOllamaClient(apiUrl);
      const response = await ollamaClient.listModels();
      
      if (response?.models) {
        setModels(response.models);
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
      setError(errorMessage);
      setModels([]);
      
      toast({
        title: "Ошибка подключения к Ollama",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    models,
    isLoading,
    error,
    fetchModels,
    checkHealth
  };
};
