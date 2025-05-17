import OpenAI from "openai";
import { Word, WordCategory } from "../types";

type ToastFunction = {
  (opts: { title: string; description: string; variant?: 'default' | 'destructive' | 'warning' }): void;
};

// Interface for the expected structure of a single item from the LLM batch response
interface LLMBatchResponseItem {
  category: WordCategory;
  hebrew: string;
  transcription: string;
  russian: string;
  conjugations?: {
    past?: { [pronoun: string]: string };
    present?: { [pronoun: string]: string };
    future?: { [pronoun: string]: string };
    imperative?: { [pronoun: string]: string };
  };
  examples?: { hebrew: string; russian: string }[];
  error?: string;
}

const systemPrompt = `You are an expert linguist specializing in Hebrew. Your task is to process a list of Hebrew words or phrases and provide detailed information for each. For each item in the input list, you must generate a JSON object with the following fields: "hebrew" (the original input word/phrase), "transcription", "russian" (translation), "category", "conjugations" (only for verbs), and "examples".

IMPORTANT RULES:
1.  **Original Word**: The "hebrew" field in your output MUST EXACTLY match the word/phrase from the input list.
2.  **Category**:
    *   Assign "פועל" (verb) for verbs and verbal phrases.
    *   Assign "שם עצם" (noun) for nouns and noun phrases.
    *   Assign "שם תואר" (adjective) for adjectives and adjectival phrases.
    *   Assign "אחר" (other) if unsure or for other types of phrases.
3.  **Conjugations**:
    *   Provide conjugations ONLY if the category is "פועל". For all other categories, the "conjugations" field should be null or omitted.
    *   All conjugations must be in Hebrew, using Hebrew pronouns (e.g., אני, אתה, את, הוא, היא, אנחנו, אתם, אתן, הם, הן).
    *   Include past, present, future, and imperative tenses where applicable.
4.  **Examples**:
    *   Provide 2-3 usage examples for each word/phrase.
    *   Each example must have a "hebrew" sentence and its "russian" translation.
    *   If no examples can be found, this field can be null or an empty array.
5.  **Phrases**: If the input item contains multiple words (a phrase), translate and categorize it as a complete unit, preserving its meaning.
6.  **Error Handling**: If you cannot process a specific word/phrase, include an "error" field in its JSON object with a brief explanation (e.g., "Word not found" or "Unable to categorize"). Still, try to provide as much information as possible for other fields.

You MUST call the "save_hebrew_word_details" function with an array of these JSON objects in the "processed_words" parameter. Ensure one object is returned for EACH word/phrase in the original input list.`;

const toolDefinition = {
  type: "function" as const,
  function: {
    name: "save_hebrew_word_details",
    description: "Saves the translations, transcriptions, categories, conjugations, and examples for a list of Hebrew words.",
    parameters: {
      type: "object" as const,
      properties: {
        processed_words: {
          type: "array" as const,
          description: "An array of objects, where each object contains the enriched details for a single Hebrew word or phrase.",
          items: {
            type: "object" as const,
            properties: {
              hebrew: { type: "string" as const, description: "The original Hebrew word/phrase provided in the input." },
              transcription: { type: "string" as const, description: "Romanized transcription of the Hebrew word/phrase." },
              russian: { type: "string" as const, description: "Russian translation of the Hebrew word/phrase." },
              category: { type: "string" as const, enum: ["פועל", "שם עצם", "שם תואר", "אחר"], description: "Category of the word: פועל (verb), שם עצם (noun), שם תואר (adjective), אחר (other)." },
              conjugations: {
                type: ["object", "null"] as ["object", "null"],
                description: "Hebrew conjugations if the word is a verb (פועל). Null otherwise. Structure should be { 'tenseName': { 'pronoun': 'conjugation' } }, e.g., { 'past': { 'אני': 'עשיתי' } }. All conjugations must be in Hebrew with Hebrew pronouns.",
                additionalProperties: { // Represents tense keys like "past", "present"
                  type: "object" as const, // The value for each tense key is an object
                  additionalProperties: { type: "string" as const } // Represents pronoun keys like "אני"
                }
              },
              examples: {
                type: ["array", "null"] as ["array", "null"],
                description: "Array of 2-3 usage examples. Null if no examples. Each example should have 'hebrew' and 'russian' translations.",
                items: {
                  type: "object" as const,
                  properties: {
                    hebrew: { type: "string" as const, description: "Example sentence in Hebrew." },
                    russian: { type: "string" as const, description: "Russian translation of the example." }
                  },
                  required: ["hebrew", "russian"]
                }
              },
              error: { type: ["string", "null"] as ["string", "null"], description: "If an error occurred processing this specific word, a brief explanation. Null otherwise." }
            },
            required: ["hebrew", "transcription", "russian", "category"]
          }
        }
      },
      required: ["processed_words"]
    }
  }
};

export async function enrichWordsWithLLM(
  hebrewWords: string[],
  apiKey: string,
  modelIdentifier: string,
  toastFn?: ToastFunction // Опциональный параметр для тостов
): Promise<Word[]> {
  if (!apiKey || !modelIdentifier) {
    throw new Error('API key or model not configured.');
  }
  if (hebrewWords.length === 0) {
    return [];
  }

  // Вспомогательная функция для показа тостов
  const showToast = (opts: Parameters<ToastFunction>[0]) => {
    if (toastFn) {
      toastFn(opts);
    }
  };

  // Показываем тост о начале обработки
  showToast({
    title: "Обработка",
    description: `Обрабатываем ${hebrewWords.length} слов...`
  });

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });

  const userContent = `Process the following Hebrew words/phrases: ${hebrewWords.join(', ')}`;

  try {
    const completion = await openai.chat.completions.create({
      model: modelIdentifier,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      tools: [toolDefinition],
      tool_choice: { type: "function", function: { name: "save_hebrew_word_details" } },
      stream: false
    });

    if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message) {
      console.error('Invalid LLM response structure: No content or choices.', completion);
      showToast({
        title: "Ошибка",
        description: "Не удалось получить ответ от сервиса.",
        variant: "destructive",
      });
      throw new Error('Invalid LLM response structure: No content or choices.');
    }

    const message = completion.choices[0].message;

    if (!message.tool_calls || !message.tool_calls[0] || message.tool_calls[0].type !== 'function') {
      console.error('Invalid LLM response: Expected a function call.', message);
      showToast({
        title: "Ошибка",
        description: "Некорректный формат ответа от сервиса.",
        variant: "destructive",
      });
      throw new Error('Invalid LLM response: Expected a function call.');
    }

    const functionCall = message.tool_calls[0].function;
    if (functionCall.name !== "save_hebrew_word_details") {
      console.error(`Invalid LLM response: Expected function call to "save_hebrew_word_details", got "${functionCall.name}".`, message);
      showToast({
        title: "Ошибка",
        description: "Неверный тип ответа от сервиса.",
        variant: "destructive",
      });
      throw new Error(`Invalid LLM response: Expected function call to "save_hebrew_word_details".`);
    }

    let parsedArgs;
    try {
      parsedArgs = JSON.parse(functionCall.arguments);
    } catch (e) {
      console.error('Failed to parse function call arguments as JSON:', functionCall.arguments, e);
      showToast({
        title: "Ошибка",
        description: "Не удалось обработать ответ сервиса.",
        variant: "destructive",
      });
      throw new Error('Failed to parse LLM function call arguments.');
    }

    if (!parsedArgs || !Array.isArray(parsedArgs.processed_words)) {
      console.error('Invalid LLM response: "processed_words" array missing or not an array in function arguments.', parsedArgs);
      showToast({
        title: "Ошибка",
        description: "Некорректный формат данных в ответе.",
        variant: "destructive",
      });
      throw new Error('Invalid LLM response: "processed_words" array missing or malformed.');
    }

    const processedWords = processWordsArray(parsedArgs.processed_words, hebrewWords);
    
    // Анализируем результаты обработки
    const successfullyProcessed = processedWords.filter(w => 
      w.transcription && w.russian && w.category !== 'אחר'
    ).length;
    
    // Показываем результат обработки
    showToast({
      title: "Готово",
      description: `Успешно обработано ${successfullyProcessed} из ${hebrewWords.length} слов.`,
      variant: successfullyProcessed === hebrewWords.length ? "default" : "warning"
    });

    return processedWords;

  } catch (error) {
    console.error('Error enriching words with LLM:', error);
    showToast({
      title: "Ошибка",
      description: "Произошла ошибка при обработке слов. Проверьте консоль для деталей.",
      variant: "destructive",
    });
    
    // Fallback: return minimal word entries with default values
    return hebrewWords.map(word => ({
      id: String(Date.now()) + Math.random().toString(36).substring(2, 9),
      hebrew: word,
      transcription: '',
      russian: '',
      category: 'אחר' as WordCategory,
      showTranslation: false,
      isLearned: false,
      learningStage: 0,
      lastReviewed: null,
      nextReview: null,
      dateAdded: Date.now(),
      conjugations: undefined,
      examples: [],
    }));
  }
}

// Helper function to process the array of words from LLM and map to Word[]
// This function was previously an inner function and its logic is largely preserved.
function processWordsArray(llmItems: LLMBatchResponseItem[], originalWords: string[]): Word[] {
  const enrichedWords: Word[] = [];

  for (const currentItem of llmItems) {
    if (!currentItem || typeof currentItem !== 'object') {
      console.warn('Skipping invalid item in LLM response:', currentItem);
      continue;
    }
    if (currentItem.error) {
      console.warn(`LLM reported error for word "${currentItem.hebrew || 'unknown'}": ${String(currentItem.error)}`);
      // We might still want to add a minimal entry for this word if it's in originalWords
      // For now, we'll rely on the post-loop check to add missing words.
      continue; 
    }

    const hebrew = String(currentItem.hebrew || '');
    const transcription = String(currentItem.transcription || '');
    const russian = String(currentItem.russian || '');
    // Ensure category is one of the allowed WordCategory types, default to 'אחר'
    const categoryInput = String(currentItem.category || 'אחר') as any;
    const category: WordCategory = ['פועל', 'שם עצם', 'שם תואר', 'אחר'].includes(categoryInput) ? categoryInput : 'אחר';


    if (!hebrew) { // hebrew is the most critical key from LLM to match with original
      console.warn('LLM item missing "hebrew" field, cannot process:', currentItem);
      continue;
    }
     if (!transcription || !russian) {
      console.warn('LLM item missing transcription or russian field:', currentItem);
      // Decide if we add it with empty fields or skip. For now, add with empty.
    }


    enrichedWords.push({
      id: String(Date.now()) + Math.random().toString(36).substring(2, 9),
      hebrew,
      transcription,
      russian,
      category: category,
      conjugations: currentItem.conjugations || undefined,
      examples: Array.isArray(currentItem.examples)
        ? currentItem.examples.filter((ex: any) => ex && typeof ex.hebrew === 'string' && typeof ex.russian === 'string')
        : [],
      showTranslation: false,
      isLearned: false,
      learningStage: 0,
      lastReviewed: null,
      nextReview: null,
      dateAdded: Date.now(),
    });
  }

  // Ensure we return entries for all original words, even if LLM missed some or returned errors
  // or if the LLM provided a hebrew word not in the original list (which it shouldn't based on prompt)
  const finalWords: Word[] = [];
  for (const originalWord of originalWords) {
    const foundEnrichedWord = enrichedWords.find(ew => ew.hebrew === originalWord);
    if (foundEnrichedWord) {
      finalWords.push(foundEnrichedWord);
    } else {
      // LLM did not return this word or it was filtered out due to error/missing fields. Add a minimal entry.
      console.warn(`Word "${originalWord}" not found in LLM response or was invalid. Adding minimal entry.`);
      finalWords.push({
        id: String(Date.now()) + Math.random().toString(36).substring(2, 9),
        hebrew: originalWord,
        transcription: '',
        russian: '',
        category: 'אחר' as WordCategory,
        showTranslation: false,
        isLearned: false,
        learningStage: 0,
        lastReviewed: null,
        nextReview: null,
        dateAdded: Date.now(),
        conjugations: undefined,
        examples: [],
      });
    }
  }
  return finalWords;
}

// The rest of the file (if any)
