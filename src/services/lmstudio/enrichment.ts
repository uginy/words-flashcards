import type { Word, ToastFunction, RetryConfig, LLMBatchResponseItem } from '../openrouter/types';
import { DEFAULT_RETRY_CONFIG } from '../openrouter/config';
import { systemPromptForLMStudio, directJsonPromptForLMStudio, simplePromptForLMStudio, strictHebrewPromptForLMStudio } from './prompts';
import { validateJsonString, attemptJsonFix } from '../openrouter/validators';
import { processWordsArrayLMStudio } from './processors';
import { retryWithBackoffLMStudio, createLMStudioClient } from './api-client';
import { DEFAULT_LMSTUDIO_API_URL, DEFAULT_LMSTUDIO_MODEL, DEFAULT_LMSTUDIO_TEMPERATURE } from '../../config/lmstudio';

export async function enrichWordsWithLMStudio(
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
  const baseUrl = options?.baseUrl || DEFAULT_LMSTUDIO_API_URL;
  const model = options?.model || DEFAULT_LMSTUDIO_MODEL;
  const temperature = options?.temperature || DEFAULT_LMSTUDIO_TEMPERATURE;
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
      console.log(`[LM Studio Enrichment] ${message}`);
    }
  };

  logger(`Starting enrichment for ${hebrewWords.length} words`);
  logger(`Using model: ${model} at ${baseUrl}`);
  logger(`Retry config: ${JSON.stringify(retryConfig)}`);

  showToast({
    title: "Обработка",
    description: `Обрабатываем ${hebrewWords.length} слов с помощью LM Studio...`
  });

  // Check LM Studio health first
  const lmStudioClient = createLMStudioClient(baseUrl);
  
  try {
    const isHealthy = await lmStudioClient.checkHealth();
    
    if (!isHealthy) {
      showToast({
        title: "Ошибка подключения",
        description: "LM Studio сервер недоступен. Проверьте настройки подключения.",
        variant: "destructive"
      });
      throw new Error('LM Studio service is not available. Please make sure LM Studio is running on the specified URL.');
    }
  } catch (error) {
    showToast({
      title: "Ошибка подключения",
      description: "Не удается подключиться к серверу LM Studio.",
      variant: "destructive"
    });
    throw error;
  }

  // Select appropriate prompt based on options and model type
  let systemPrompt: string;
  
  if (useSimplePrompt) {
    systemPrompt = simplePromptForLMStudio;
    logger("Using simple prompt for basic processing");
  } else if (model.includes('gemma') || model.includes('phi') || model.includes('mistral')) {
    // Models that tend to mix languages in conjugations need strict prompts
    systemPrompt = strictHebrewPromptForLMStudio;
    logger("Using strict Hebrew prompt for conjugation-prone model");
  } else if (model.includes('llama') || model.includes('qwen')) {
    systemPrompt = directJsonPromptForLMStudio;
    logger("Using direct JSON prompt for structured models");
  } else {
    systemPrompt = systemPromptForLMStudio;
    logger("Using standard system prompt");
  }

  const userContent = `Process the following Hebrew words/phrases: ${hebrewWords.join(', ')}`;

  try {
    let parsedArgs: { processed_words: LLMBatchResponseItem[] };

    logger(`Using ${useSimplePrompt ? 'simple' : 'detailed'} prompt approach`);
    
    const completion = await retryWithBackoffLMStudio(async () => {
      logger("Making API call to LM Studio...");
      
      return await lmStudioClient.chat({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: temperature,
        response_format: { type: 'json_object' }, // Request JSON format from LM Studio
        signal: abortController?.signal
      });
    }, retryConfig, logger);

    if (!completion?.choices?.[0]?.message?.content) {
      throw new Error('Invalid LM Studio response structure: No content in message.');
    }
    
    const responseContent = completion.choices[0].message.content;
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
      console.error('Failed to parse LM Studio response content as JSON:', responseContent, e);
      throw new Error('Failed to parse LM Studio response content as JSON. The model may not have returned valid JSON.');
    }

    if (!parsedArgs || !Array.isArray(parsedArgs.processed_words)) {
      logger("Invalid parsed args structure");
      throw new Error('Invalid LM Studio response: "processed_words" array is missing or not an array in the parsed arguments.');
    }

    logger(`Found ${parsedArgs.processed_words.length} processed words in response`);
    
    const processedWordsResult = processWordsArrayLMStudio(parsedArgs.processed_words, hebrewWords);

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
      description: `Успешно обработано ${successfullyProcessed.length} слов с помощью LM Studio.`,
      variant: "default"
    });

    return processedWordsResult;

  } catch (error) {
    logger(`Error occurred: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Error enriching words with LM Studio:', error);

    // Check if this is an abort error
    if (error instanceof Error && error.name === 'AbortError') {
      logger('Request was aborted by user');
      throw error; // Re-throw abort errors to be handled by the caller
    }

    let errorMessage: string;
    let isCriticalError = false;

    if (error instanceof Error) {
      if (error.message.includes('LM Studio service is not available')) {
        errorMessage = "LM Studio недоступен. Убедитесь, что LM Studio запущен локально.";
        isCriticalError = true;
      }
      else if (error.message.includes('model not found') || error.message.includes('404')) {
        errorMessage = `Модель ${model} не найдена. Загрузите модель в LM Studio.`;
        isCriticalError = true;
      }
      else if (
        error.message.startsWith('Invalid LM Studio response') ||
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
        errorMessage = "Произошла непредвиденная ошибка при обработке слов с LM Studio. Попробуйте позже.";
        isCriticalError = true;
      }
      throw new Error(error.message);
    }
    errorMessage = "Неизвестная ошибка при обработке слов с LM Studio";
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
