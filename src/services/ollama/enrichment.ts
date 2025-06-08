import type { Word, ToastFunction, RetryConfig, LLMBatchResponseItem } from '../openrouter/types';
import { DEFAULT_RETRY_CONFIG } from '../openrouter/config';
import { systemPromptForOllama, directJsonPromptForOllama, simplePromptForOllama } from './prompts';
import { validateJsonString, attemptJsonFix } from '../openrouter/validators';
import { processWordsArrayOllama } from './processors';
import { retryWithBackoffOllama, createOllamaClient } from './api-client';
import { DEFAULT_OLLAMA_API_URL, DEFAULT_OLLAMA_MODEL, DEFAULT_OLLAMA_TEMPERATURE } from '../../config/ollama';

export async function enrichWordsWithOllama(
  hebrewWords: string[],
  options?: {
    baseUrl?: string;
    model?: string;
    temperature?: number;
    retryConfig?: RetryConfig;
    enableDetailedLogging?: boolean;
    validateJsonResponse?: boolean;
    useSimplePrompt?: boolean;
    abortController?: AbortController;
    toastFn?: ToastFunction;
  }
): Promise<Word[]> {
  if (hebrewWords.length === 0) {
    return [];
  }

  // Merge default options with provided options
  const baseUrl = options?.baseUrl || DEFAULT_OLLAMA_API_URL;
  const model = options?.model || DEFAULT_OLLAMA_MODEL;
  const temperature = options?.temperature || DEFAULT_OLLAMA_TEMPERATURE;
  const retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...options?.retryConfig };
  const enableLogging = options?.enableDetailedLogging ?? false;
  const validateJson = options?.validateJsonResponse ?? true;
  const useSimplePrompt = options?.useSimplePrompt ?? false;
  const abortController = options?.abortController;
  const toastFn = options?.toastFn;

  const showToast = (opts: Parameters<ToastFunction>[0]) => {
    if (toastFn) {
      toastFn(opts);
    }
  };

  const logger = (message: string) => {
    if (enableLogging) {
      console.log(`[Ollama Enrichment] ${message}`);
    }
  };

  logger(`Starting enrichment for ${hebrewWords.length} words`);
  logger(`Using model: ${model} at ${baseUrl}`);
  logger(`Retry config: ${JSON.stringify(retryConfig)}`);

  showToast({
    title: "Обработка",
    description: `Обрабатываем ${hebrewWords.length} слов с помощью Ollama...`
  });

  // Check Ollama health first
  const ollamaClient = createOllamaClient(baseUrl);
  const isHealthy = await ollamaClient.checkHealth();
  
  if (!isHealthy) {
    throw new Error('Ollama service is not available. Please make sure Ollama is running on the specified URL.');
  }

  // Select appropriate prompt based on options
  const systemPrompt = useSimplePrompt ? simplePromptForOllama : 
                      (model.includes('llama3.2') || model.includes('qwen')) ? 
                        directJsonPromptForOllama : systemPromptForOllama;

  const userContent = `Process the following Hebrew words/phrases: ${hebrewWords.join(', ')}`;

  try {
    let parsedArgs: { processed_words: LLMBatchResponseItem[] };

    logger(`Using ${useSimplePrompt ? 'simple' : 'detailed'} prompt approach`);
    
    const completion = await retryWithBackoffOllama(async () => {
      logger("Making API call to Ollama...");
      
      return await ollamaClient.chat({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: temperature,
        format: 'json', // Request JSON format from Ollama
        signal: abortController?.signal
      });
    }, retryConfig, logger);

    if (!completion?.message?.content) {
      throw new Error('Invalid Ollama response structure: No content in message.');
    }
    
    const responseContent = completion.message.content;
    logger(`Received response content: ${responseContent.substring(0, 200)}...`);
    
    try {
      // Clean up potential markdown and surrounding text
      let cleanedResponseContent = responseContent.trim();
      
      // Try to extract JSON from markdown code block
      const jsonBlockMatch = cleanedResponseContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch?.[1]) {
        cleanedResponseContent = jsonBlockMatch[1].trim();
        logger(`Extracted JSON from markdown block: ${cleanedResponseContent.substring(0, 100)}...`);
      } else {
        // Fallback: remove markdown backticks from start/end
        cleanedResponseContent = cleanedResponseContent.replace(/^```json\s*|\s*```$/g, '').trim();
        logger(`Cleaned content using fallback: ${cleanedResponseContent.substring(0, 100)}...`);
      }
      
      // Additional cleanup: remove any leading explanatory text
      cleanedResponseContent = cleanedResponseContent.replace(/^[^{]*({[\s\S]*}).*$/s, '$1');
      
      // Enhanced JSON validation before parsing
      if (validateJson) {
        const validation = validateJsonString(cleanedResponseContent);
        if (!validation.isValid) {
          logger(`JSON validation failed: ${validation.issues.join(', ')}`);
          logger(`Response content preview: ${cleanedResponseContent.substring(0, 500)}...`);
          
          // Attempt to fix if possible
          if (validation.canAttemptFix) {
            logger("Attempting to fix JSON structure...");
            const fixedJson = attemptJsonFix(cleanedResponseContent);
            const revalidation = validateJsonString(fixedJson);
            
            if (revalidation.isValid) {
              logger("Successfully fixed JSON structure");
              parsedArgs = JSON.parse(fixedJson);
            } else {
              logger(`JSON fix failed: ${revalidation.issues.join(', ')}`);
              throw new Error(`Invalid JSON structure in response content. Issues: ${validation.issues.join(', ')}`);
            }
          } else {
            throw new Error(`Invalid JSON structure in response content. Issues: ${validation.issues.join(', ')}`);
          }
        } else {
          parsedArgs = JSON.parse(cleanedResponseContent);
          logger("Successfully parsed response content");
        }
      } else {
        parsedArgs = JSON.parse(cleanedResponseContent);
        logger("Successfully parsed response content (validation disabled)");
      }
    } catch (e) {
      logger(`Failed to parse response content: ${e}`);
      console.error('Failed to parse Ollama response content as JSON:', responseContent, e);
      throw new Error('Failed to parse Ollama response content as JSON. The model may not have returned valid JSON.');
    }

    if (!parsedArgs || !Array.isArray(parsedArgs.processed_words)) {
      logger("Invalid parsed args structure");
      throw new Error('Invalid Ollama response: "processed_words" array is missing or not an array in the parsed arguments.');
    }

    logger(`Found ${parsedArgs.processed_words.length} processed words in response`);
    
    const processedWordsResult = processWordsArrayOllama(parsedArgs.processed_words, hebrewWords);

    const successfullyProcessed = processedWordsResult.filter(w =>
      w.transcription && w.russian
    );
    const failedWords = processedWordsResult.filter(w =>
      !w.transcription || !w.russian
    );

    logger(`Processing complete: ${successfullyProcessed.length} successful, ${failedWords.length} failed`);

    if (failedWords.length > 0) {
      showToast({
        title: "Частичная обработка",
        description: `Обработано ${successfullyProcessed.length} из ${hebrewWords.length} слов.`,
        variant: "warning"
      });
      
      if (successfullyProcessed.length === 0) {
        throw new Error(`Failed to process words: ${failedWords.map(w => w.hebrew).join(', ')}`);
      }
    }

    if (successfullyProcessed.length === 0) {
      throw new Error('No words were processed successfully');
    }

    showToast({
      title: "Готово",
      description: `Успешно обработано ${successfullyProcessed.length} слов с помощью Ollama.`,
      variant: "default"
    });

    return processedWordsResult;

  } catch (error) {
    logger(`Error occurred: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Error enriching words with Ollama:', error);

    // Check if this is an abort error
    if (error instanceof Error && error.name === 'AbortError') {
      logger('Request was aborted by user');
      throw error; // Re-throw abort errors to be handled by the caller
    }

    let errorMessage: string;
    let isCriticalError = false;

    if (error instanceof Error) {
      if (error.message.includes('Ollama service is not available')) {
        errorMessage = "Ollama недоступен. Убедитесь, что Ollama запущен локально.";
        isCriticalError = true;
      }
      else if (error.message.includes('model not found') || error.message.includes('404')) {
        errorMessage = `Модель ${model} не найдена. Установите модель: ollama pull ${model}`;
        isCriticalError = true;
      }
      else if (
        error.message.startsWith('Invalid Ollama response') ||
        error.message.startsWith('Failed to parse') ||
        error.message.includes('No words were processed successfully')
      ) {
        errorMessage = error.message;
        isCriticalError = true;
      }
      else if (error.message.includes('Failed to process words:')) {
        errorMessage = "Некоторые слова не удалось обработать. Проверьте их корректность и попробуйте снова.";
        isCriticalError = false;
      }
      else {
        errorMessage = "Произошла непредвиденная ошибка при обработке слов с Ollama. Попробуйте позже.";
        isCriticalError = true;
      }
      throw new Error(error.message);
    }
    errorMessage = "Неизвестная ошибка при обработке слов с Ollama";
    isCriticalError = true;

    showToast({
      title: isCriticalError ? "Критическая ошибка" : "Ошибка",
      description: errorMessage,
      variant: "destructive"
    });

    if (isCriticalError) {
      return [];
    }

    // Fallback: return minimal word entries with user-friendly message
    showToast({
      title: "Частичная обработка",
      description: "Слова добавлены с минимальной информацией. Попробуйте обработать их позже.",
      variant: "warning"
    });

    return hebrewWords.map(word => ({
      id: String(Date.now()) + Math.random().toString(36).substring(2, 9),
      hebrew: word,
      transcription: '',
      russian: '',
      category: 'אחר' as const,
      showTranslation: false,
      isLearned: false,
      learningStage: 0,
      lastReviewed: null,
      nextReview: null,
      dateAdded: Date.now(),
      conjugations: undefined,
      examples: []
    }));
  }
}
