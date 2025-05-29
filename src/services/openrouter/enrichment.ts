import type { Word, ToastFunction, LLMEnrichmentOptions, RetryConfig, LLMBatchResponseItem } from './types';
import { DEFAULT_RETRY_CONFIG } from './config';
import { systemPrompt, systemPromptForDirectJson } from './prompts';
import { getOptimalToolsConfig } from './tools';
import { validateJsonString, attemptJsonFix } from './validators';
import { processWordsArray } from './processors';
import { retryWithBackoff, createOpenAIClient } from './api-client';

export async function enrichWordsWithLLM(
  hebrewWords: string[],
  apiKey: string,
  modelIdentifier: string,
  toastFn?: ToastFunction,
  modelSupportsToolsExplicit?: boolean,
  abortController?: AbortController,
  options?: LLMEnrichmentOptions
): Promise<Word[]> {
  if (!apiKey || !modelIdentifier) {
    throw new Error('API key or model not configured.');
  }
  if (hebrewWords.length === 0) {
    return [];
  }

  // Merge default options with provided options
  const retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...options?.retryConfig };
  const enableLogging = options?.enableDetailedLogging ?? false;
  const validateJson = options?.validateJsonResponse ?? true;
  
  // Get optimal tools configuration for this model
  const toolsConfig = getOptimalToolsConfig(modelIdentifier, options);

  const showToast = (opts: Parameters<ToastFunction>[0]) => {
    if (toastFn) {
      toastFn(opts);
    }
  };

  const logger = (message: string) => {
    if (enableLogging) {
      console.log(`[LLM Enrichment] ${message}`);
    }
  };

  logger(`Starting enrichment for ${hebrewWords.length} words`);
  logger(`Retry config: ${JSON.stringify(retryConfig)}`);

  showToast({
    title: "Обработка",
    description: `Обрабатываем ${hebrewWords.length} слов...`
  });

  let effectiveModelSupportsTools: boolean;
  if (modelSupportsToolsExplicit !== undefined) {
    effectiveModelSupportsTools = modelSupportsToolsExplicit;
  } else {
    // Heuristic: Check if modelIdentifier contains known tool-supporting model names/patterns
    const knownToolSupportingModelPatterns = [
      "gpt-4", "gpt-3.5", // OpenAI
      "claude-3-opus", "claude-3-sonnet", "claude-3-haiku", // Anthropic
      "gemini", // Google
      "llama-4-maverick", "llama-4-scout", // Meta LLaMA 4 specific models
      "llama-4", // Meta LLaMA 4 series (general pattern)
      "llama-3.3", // Meta LLaMA 3.3 series
      "devstral", // Mistral Devstral series
    ];
    effectiveModelSupportsTools = knownToolSupportingModelPatterns.some(name => modelIdentifier.toLowerCase().includes(name));
    // console.log(`Model "${modelIdentifier}" determined to ${effectiveModelSupportsTools ? 'support' : 'not support'} tools based on heuristic.`);
  }

  const userContent = `Process the following Hebrew words/phrases: ${hebrewWords.join(', ')}`;

  try {
    let parsedArgs: { processed_words: LLMBatchResponseItem[] };

    if (effectiveModelSupportsTools) {
      // --- Logic for models supporting tools ---
      logger(`Using TOOL-BASED approach for model: ${modelIdentifier}`);
      
      const completion = await retryWithBackoff(async () => {
        const openai = createOpenAIClient(apiKey);
        
        logger(`Making API call with tools (${toolsConfig.modelType} model, tool_choice: ${toolsConfig.useToolChoice})...`);
        
        const baseParams = {
          model: modelIdentifier,
          messages: [
            { role: 'system' as const, content: systemPrompt },
            { role: 'user' as const, content: userContent }
          ],
          tools: [toolsConfig.toolDefinition],
          stream: false as const
        };
        
        // Add tool_choice only when configured to do so
        const requestParams = toolsConfig.useToolChoice
          ? { ...baseParams, tool_choice: { type: "function" as const, function: { name: "save_hebrew_word_details" } } }
          : baseParams;
        
        return await openai.chat.completions.create(requestParams, {
          signal: abortController?.signal
        });
      }, retryConfig, logger);

      if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message) {
        throw new Error('Invalid LLM response structure: No content or choices from the model (tool mode).');
      }
      
      const message = completion.choices[0].message;
      logger(`Received message with tool_calls: ${!!message.tool_calls}, content: ${!!message.content}`);
      
      // Flexible response handling: try tool_calls first, then fallback to content
      if (message.tool_calls?.[0]?.type === 'function') {
        // Standard tool_calls response
        const functionCall = message.tool_calls[0].function;
        if (functionCall.name !== "save_hebrew_word_details") {
          throw new Error(`Invalid LLM response: Expected function call to "save_hebrew_word_details", but got "${functionCall.name}".`);
        }
        
        logger(`Received function call arguments: ${functionCall.arguments.substring(0, 200)}...`);
        
        // Enhanced JSON validation before parsing
        if (validateJson) {
          const validation = validateJsonString(functionCall.arguments);
          if (!validation.isValid) {
            logger(`JSON validation failed for function arguments: ${validation.issues.join(', ')}`);
            logger(`Function arguments preview: ${functionCall.arguments.substring(0, 500)}...`);
            
            // Attempt to fix if possible
            if (validation.canAttemptFix) {
              logger("Attempting to fix function arguments JSON structure...");
              const fixedJson = attemptJsonFix(functionCall.arguments);
              const revalidation = validateJsonString(fixedJson);
              
              if (revalidation.isValid) {
                logger("Successfully fixed function arguments JSON structure");
                parsedArgs = JSON.parse(fixedJson);
              } else {
                logger(`Function arguments JSON fix failed: ${revalidation.issues.join(', ')}`);
                throw new Error(`Invalid JSON structure in function call arguments. Issues: ${validation.issues.join(', ')}`);
              }
            } else {
              throw new Error(`Invalid JSON structure in function call arguments. Issues: ${validation.issues.join(', ')}`);
            }
          } else {
            parsedArgs = JSON.parse(functionCall.arguments);
            logger("Successfully parsed function call arguments");
          }
        } else {
          try {
            parsedArgs = JSON.parse(functionCall.arguments);
            logger("Successfully parsed function call arguments (validation disabled)");
          } catch (e) {
            logger(`Failed to parse function call arguments: ${e}`);
            console.error('Failed to parse function call arguments as JSON (tool mode):', functionCall.arguments, e);
            throw new Error('Failed to parse LLM function call arguments. The response may not be valid JSON (tool mode).');
          }
        }
      } else if (message.content) {
        // Fallback: try to parse JSON from content (some models return JSON in content instead of tool_calls)
        logger("No tool_calls found, attempting to parse JSON from message content...");
        
        try {
          // Attempt to clean up potential markdown backticks and surrounding text
          let cleanedContent = message.content;
          
          // Try to extract JSON from markdown code block
          const jsonBlockMatch = cleanedContent.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonBlockMatch?.[1]) {
            cleanedContent = jsonBlockMatch[1].trim();
            logger(`Extracted JSON from markdown block: ${cleanedContent.substring(0, 100)}...`);
          } else {
            // Fallback: remove markdown backticks from start/end
            cleanedContent = cleanedContent.replace(/^```json\s*|\s*```$/g, '').trim();
            logger(`Cleaned content using fallback: ${cleanedContent.substring(0, 100)}...`);
          }
          
          // Additional cleanup: remove any leading explanatory text
          cleanedContent = cleanedContent.replace(/^[^{]*({[\s\S]*}).*$/s, '$1');
          
          if (validateJson) {
            const validation = validateJsonString(cleanedContent);
            if (!validation.isValid) {
              logger(`JSON validation failed for content: ${validation.issues.join(', ')}`);
              
              if (validation.canAttemptFix) {
                logger("Attempting to fix content JSON structure...");
                const fixedJson = attemptJsonFix(cleanedContent);
                const revalidation = validateJsonString(fixedJson);
                
                if (revalidation.isValid) {
                  logger("Successfully fixed content JSON structure");
                  parsedArgs = JSON.parse(fixedJson);
                } else {
                  throw new Error(`Invalid JSON structure in content. Issues: ${validation.issues.join(', ')}`);
                }
              } else {
                throw new Error(`Invalid JSON structure in content. Issues: ${validation.issues.join(', ')}`);
              }
            } else {
              parsedArgs = JSON.parse(cleanedContent);
              logger("Successfully parsed JSON from message content");
            }
          } else {
            parsedArgs = JSON.parse(cleanedContent);
            logger("Successfully parsed JSON from message content (validation disabled)");
          }
        } catch (e) {
          logger(`Failed to parse JSON from content: ${e}`);
          throw new Error('Failed to parse JSON from message content. The model may not have returned valid JSON.');
        }
      } else {
        // No tool_calls and no content - this is an error
        throw new Error('Invalid LLM response: No tool_calls or content found in the message.');
      }
    } else {
      // --- Logic for models NOT supporting tools (direct JSON response) ---
      logger(`Using DIRECT JSON approach for model: ${modelIdentifier}`);
      
      const completion = await retryWithBackoff(async () => {
        const openai = createOpenAIClient(apiKey);
        
        logger("Making API call without tools...");
        try {
          return await openai.chat.completions.create({
            model: modelIdentifier,
            messages: [
              { role: 'system', content: systemPromptForDirectJson },
              { role: 'user', content: userContent }
            ],
            // No tools or tool_choice here
            stream: false
          }, {
            signal: abortController?.signal
          });
        } catch (e: unknown) {
          if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 401) {
            const errorMessage = e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string'
              ? (e as { message: string }).message
              : 'Authentication or Api key error found';
            throw new Error(errorMessage);
          }
          throw e;
        }
      }, retryConfig, logger);

      if (!completion?.choices?.length || !completion?.choices[0]?.message?.content) {
        throw new Error('Invalid LLM response structure: No content in message from the model (direct JSON mode).');
      }
      const responseContent = completion.choices[0].message.content;
      
      logger(`Received response content: ${responseContent.substring(0, 200)}...`);
      
      try {
        // Attempt to clean up potential markdown backticks and surrounding text
        let cleanedResponseContent = responseContent;
        
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
        console.error('Failed to parse message content as JSON (direct JSON mode):', responseContent, e);
        throw new Error('Failed to parse LLM response content as JSON. The model may not have returned valid JSON (direct JSON mode).');
      }
    }

    if (!parsedArgs || !Array.isArray(parsedArgs.processed_words)) {
      logger("Invalid parsed args structure");
      throw new Error('Invalid LLM response: "processed_words" array is missing or not an array in the parsed arguments.');
    }

    logger(`Found ${parsedArgs.processed_words.length} processed words in response`);
    
    const processedWordsResult = processWordsArray(parsedArgs.processed_words, hebrewWords);

    const successfullyProcessed = processedWordsResult.filter(w =>
      w.transcription && w.russian && w.category !== 'אחר'
    );
    const failedWords = processedWordsResult.filter(w =>
      !w.transcription || !w.russian || w.category === 'אחר'
    );

    logger(`Processing complete: ${successfullyProcessed.length} successful, ${failedWords.length} failed`);

    if (failedWords.length > 0) {
      showToast({
        title: "Ошибка обработки",
        description: `Не удалось обработать ${failedWords.length} слов корректно.`,
        variant: "destructive"
      });
      throw new Error(`Failed to process words: ${failedWords.map(w => w.hebrew).join(', ')}`);
    }

    if (successfullyProcessed.length === 0) {
      throw new Error('No words were processed successfully');
    }

    showToast({
      title: "Готово",
      description: `Успешно обработано ${successfullyProcessed.length} слов.`,
      variant: "default"
    });

    return processedWordsResult;

  } catch (error) {
    logger(`Error occurred: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Error enriching words with LLM:', error);

    // Check if this is an abort error
    if (error instanceof Error && error.name === 'AbortError') {
      logger('Request was aborted by user');
      // console.log('Request was aborted by user');
      throw error; // Re-throw abort errors to be handled by the caller
    }

    let errorMessage: string;
    let isCriticalError = false;

    if (error instanceof Error) {

      if (error.message.includes('Expected a function call')) {
        errorMessage = "Модель не поддерживает необходимые функции. Попробуйте другую модель или отключите использование инструментов.";
        isCriticalError = true;
      }
      else if (error.message === "Provider returned error" && 'metadata' in error) {
        interface ProviderMetadata {
          provider_name?: string;
          raw?: string;
        }
        const metadata = (error as { metadata: ProviderMetadata }).metadata;
        const provider = metadata.provider_name || 'Unknown';

        if (metadata?.raw?.includes?.("tools field exceeds max depth limit")) {
          errorMessage = `Модель ${provider} не поддерживает расширенные функции. Выберите другую модель.`;
          isCriticalError = true;
        } else if (metadata?.raw) {
          try {
            const rawError = JSON.parse(metadata.raw);
            errorMessage = `Ошибка от ${provider}: ${rawError.detail || rawError.message || error.message}`;
          } catch {
            errorMessage = `Ошибка от ${provider}: ${error.message}`;
          }
          isCriticalError = true;
        } else {
          errorMessage = `Ошибка от ${provider}: ${error.message}`;
          isCriticalError = true;
        }
      }
      else if (
        error.message.startsWith('Invalid LLM response') ||
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
        errorMessage = "Произошла непредвиденная ошибка при обработке слов. Попробуйте позже.";
        isCriticalError = true;
      }
      throw new Error(error.message)
    }
    errorMessage = "Неизвестная ошибка при обработке слов";
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