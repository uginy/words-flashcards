import type { Word, WordCategory, ToastFunction, LLMEnrichmentOptions, RetryConfig } from './types';
import { DEFAULT_RETRY_CONFIG } from './config';
import { refinementSystemPrompt } from './prompts';
import { retryWithBackoff, createOpenAIClient } from './api-client';

// Function to refine a single word using LLM
export async function refineWordWithLLM(
  word: Word,
  apiKey: string,
  modelIdentifier: string,
  toastFn?: ToastFunction,
  options?: LLMEnrichmentOptions
): Promise<Word> {
  if (!apiKey || !modelIdentifier) {
    throw new Error('API key or model not configured.');
  }

  // Merge default options with provided options
  const retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...options?.retryConfig };
  const enableLogging = options?.enableDetailedLogging ?? false;

  const logger = (message: string) => {
    if (enableLogging) {
      console.log(`[LLM Word Refinement] ${message}`);
    }
  };

  const showToast = (opts: Parameters<ToastFunction>[0]) => {
    if (toastFn) {
      toastFn(opts);
    }
  };

  logger(`Starting refinement for word: ${word.hebrew}`);

  // Create user prompt with current word data
  const userContent = `Проанализируй следующее Hebrew слово и его данные. Проверь корректность перевода, транскрипции, категории. Если это глагол - убедись что все спряжения корректны и полны. Дополни примеры если их мало. Исправь ошибки если найдешь.

Текущие данные:
Hebrew: ${word.hebrew}
Transcription: ${word.transcription}
Russian: ${word.russian}
Category: ${word.category}
Conjugations: ${JSON.stringify(word.conjugations)}
Examples: ${JSON.stringify(word.examples)}

Верни улучшенную версию в том же JSON формате:
{
  "hebrew": "${word.hebrew}",
  "transcription": "улучшенная транскрипция",
  "russian": "улучшенный перевод",
  "category": "категория",
  "conjugations": ${word.conjugations ? 'объект со спряжениями' : 'null'},
  "examples": "массив примеров"
}`;

  try {
    logger("Making API call for word refinement...");

    const completion = await retryWithBackoff(async () => {
      const openai = createOpenAIClient(apiKey);
      return await openai.chat.completions.create({
        model: modelIdentifier,
        messages: [
          { role: 'system', content: refinementSystemPrompt },
          { role: 'user', content: userContent }
        ],
        stream: false
      });
    }, retryConfig, logger);

    if (!completion?.choices?.length || !completion?.choices[0]?.message?.content) {
      throw new Error('Invalid LLM response structure: No content in response.');
    }

    const responseContent = completion.choices[0].message.content;
    logger(`Received response content: ${responseContent.substring(0, 200)}...`);

    // Clean and parse JSON response
    let cleanedContent = responseContent.trim();

    // Try to extract JSON from markdown code block
    const jsonBlockMatch = cleanedContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch?.[1]) {
      cleanedContent = jsonBlockMatch[1].trim();
      logger(`Extracted JSON from markdown block: ${cleanedContent.substring(0, 100)}...`);
    } else {
      // Fallback: remove markdown backticks from start/end
      cleanedContent = cleanedContent.replace(/^```json\s*|\s*```$/g, '').trim();
      // Remove any leading explanatory text
      cleanedContent = cleanedContent.replace(/^[^{]*({[\s\S]*}).*$/s, '$1');
    }

    let refinedData: any;
    try {
      refinedData = JSON.parse(cleanedContent);
      logger("Successfully parsed refinement response");
    } catch (e) {
      logger(`Failed to parse refinement response: ${e}`);
      throw new Error('Failed to parse LLM refinement response as JSON.');
    }

    // Validate and apply refinements while preserving original structure
    const refinedWord: Word = {
      ...word, // Keep all original data including ID, metadata, etc.
      hebrew: refinedData.hebrew || word.hebrew,
      transcription: refinedData.transcription || word.transcription,
      russian: refinedData.russian || word.russian,
      category: (['פועל', 'שם עצם', 'שם תואר', 'פרזות', 'אחר'].includes(refinedData.category)
        ? refinedData.category
        : word.category) as WordCategory,
      conjugations: refinedData.conjugations !== undefined ? refinedData.conjugations : word.conjugations,
      examples: Array.isArray(refinedData.examples) ? refinedData.examples : word.examples,
    };

    logger(`Refinement completed for word: ${word.hebrew}`);
    
    showToast({
      title: "Готово",
      description: `Слово "${word.hebrew}" успешно уточнено.`,
    });

    return refinedWord;

  } catch (error) {
    logger(`Error occurred during refinement: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Error refining word with LLM:', error);

    let errorMessage: string;
    
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('Authentication')) {
        errorMessage = "Ошибка аутентификации API. Проверьте ключ API.";
      } else if (error.message.includes('Failed to parse')) {
        errorMessage = "Модель вернула некорректный ответ. Попробуйте другую модель.";
      } else {
        errorMessage = error.message;
      }
    } else {
      errorMessage = "Неизвестная ошибка при уточнении слова";
    }

    showToast({
      title: "Ошибка уточнения",
      description: errorMessage,
      variant: "destructive"
    });

    throw new Error(errorMessage);
  }
}