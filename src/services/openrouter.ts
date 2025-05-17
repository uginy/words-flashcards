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
  conjugations?: { // Field is optional
    past: { [pronoun: string]: string } | null; // Tense keys are mandatory if conjugations object exists, value can be object or null
    present: { [pronoun: string]: string } | null;
    future: { [pronoun: string]: string } | null;
    imperative: { [pronoun: string]: string } | null;
  } | null; // Value of conjugations itself can be an object or null
  examples?: { hebrew: string; russian: string }[] | null; // Field is optional, value can be array or null
}

const systemPrompt = `You are an expert linguist specializing in Hebrew. Your task is to process a list of Hebrew words or phrases and provide detailed information for each. For each item, generate a properly formatted JSON object with required fields as specified below.

IMPORTANT RULES AND FIELD FORMATS:

1.  **Original Word**:
    "hebrew": exact match with input word/phrase, no modifications allowed

2.  **Category** (one of these exact values):
    - "פועל" for verbs
    - "שם עצם" for nouns
    - "שם תואר" for adjectives
    - "אחר" for other types

3.  **Required Fields**:
    - "transcription": romanized form
    - "russian": translation to Russian
    - "category": from the list above

4.  **Conjugations** (for verbs only):
    For category "פועל", provide conjugations in EXACTLY this format (in Hebrew only):
    {
      "past": {
        "אני": "...",
        "אתה": "...",
        "את": "...",
        "הוא": "...",
        "היא": "...",
        "אנחנו": "...",
        "אתם": "...",
        "אתן": "...",
        "הם": "...",
        "הן": "..."
      },
      "present": {
        "אני": "...",
        "אתה": "...",
        "את": "...",
        "הוא": "...",
        "היא": "...",
        "אנחנו": "...",
        "אתם": "...",
        "אתן": "...",
        "הם": "...",
        "הן": "..."
      },
      "future": {
        "אני": "...",
        "אתה": "...",
        "את": "...",
        "הוא": "...",
        "היא": "...",
        "אנחנו": "...",
        "אתם": "...",
        "אתן": "...",
        "הם": "...",
        "הן": "..."
      },
      "imperative": {
        "אתה": "...",
        "את": "...",
        "אתם": "...",
        "אתן": "..."
      }
    }
    - ALL four tense fields (past, present, future, imperative) should be present if applicable.
    - Within each tense, include all relevant pronouns as shown.
    - Use null for a tense if it's not applicable (e.g. imperative for some verbs or other tenses if they don't exist).
    - For non-verbs, omit the "conjugations" field entirely or set it to null.

5.  **Examples**:
    - Provide 2-3 usage examples.
    - Each example must be an object with "hebrew" and "russian" string fields.
    - The "examples" field itself should be an array of these objects.
    - Use emprty array [] for the "examples" field if no examples are available.

Return a single JSON object as arguments to the 'save_hebrew_word_details' function. This object must contain a single key "processed_words", which is an array of objects. Each object in the "processed_words" array corresponds to one input Hebrew word/phrase and must strictly follow this structure:

{
  "hebrew": "המקורית",
  "transcription": "hamekorit",
  "russian": "оригинальное слово",
  "category": "שם עצם",
  "conjugations": null,
  "examples": [
    { "hebrew": "דוגמה בעברית 1", "russian": "пример на русском 1" },
    { "hebrew": "דוגמה בעברית 2", "russian": "пример на русском 2" }
  ]
}

Example of the full argument for 'save_hebrew_word_details' for two words "לכתוב" (verb) and "ספר" (noun):
{
  "processed_words": [
    {
      "hebrew": "לכתוב",
      "transcription": "lichtov",
      "russian": "писать",
      "category": "פועל",
      "conjugations": {
        "past": { "אני": "כתבתי", "אתה": "כתבת", /* ...other pronouns... */ "הן": "כתבו" },
        "present": { "אני": "כותב", "אתה": "כותב", /* ...other pronouns... */ "הן": "כותבות" },
        "future": { "אני": "אכתוב", "אתה": "תכתוב", /* ...other pronouns... */ "הן": "יכתבו" },
        "imperative": { "אתה": "כתוב", "את": "כתבי", "אתם": "כתבו", "אתן": "כתבנה" }
      },
      "examples": [
        { "hebrew": "אני אוהב לכתוב סיפורים.", "russian": "Я люблю писать рассказы." },
        { "hebrew": "הוא כתב מכתב לחבר שלו.", "russian": "Он написал письмо своему другу." }
      ]
    },
    {
      "hebrew": "ספר",
      "transcription": "sefer",
      "russian": "книга",
      "category": "שם עצם",
      "conjugations": null,
      "examples": [
        { "hebrew": "קראתי ספר מעניין.", "russian": "Я прочитал интересную книгу." },
        { "hebrew": "יש לי הרבה ספרים בבית.", "russian": "У меня дома много книг." }
      ],
    }
  ]
}

Ensure the entire response for the function call is a single valid JSON object.
`;

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
                properties: {
                  past: {
                    type: ["object", "null"] as ["object", "null"],
                    additionalProperties: { type: "string" as const }
                  },
                  present: {
                    type: ["object", "null"] as ["object", "null"],
                    additionalProperties: { type: "string" as const }
                  },
                  future: {
                    type: ["object", "null"] as ["object", "null"],
                    additionalProperties: { type: "string" as const }
                  },
                  imperative: {
                    type: ["object", "null"] as ["object", "null"],
                    additionalProperties: { type: "string" as const }
                  }
                },
                additionalProperties: false // Disallow other tense keys
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

  // Показываем тוסט о начале обработки
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

    // console.log("Raw functionCall.arguments from LLM:", functionCall.arguments);

    let parsedArgs: { processed_words: LLMBatchResponseItem[] };
    try {
      parsedArgs = JSON.parse(functionCall.arguments);
      // console.log("Parsed arguments (parsedArgs):", JSON.stringify(parsedArgs, null, 2));
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

    const hebrew = String(currentItem.hebrew || '');
    const transcription = String(currentItem.transcription || '');
    const russian = String(currentItem.russian || '');
    // Ensure category is one of the allowed WordCategory types, default to 'אחר'
    const categoryInput = String(currentItem.category || 'אחר');
    const category: WordCategory = ['פועל', 'שם עצם', 'שם תואר', 'אחר'].includes(categoryInput) ? categoryInput as WordCategory : 'אחר';


    if (!hebrew) { // hebrew is the most critical key from LLM to match with original
      console.warn('LLM item missing "hebrew" field, cannot process:', currentItem);
      continue;
    }
     if (!transcription || !russian) {
      console.warn('LLM item missing transcription or russian field:', currentItem);
      // Decide if we add it with empty fields or skip. For now, add with empty.
    }

    const llmConjugations = currentItem.conjugations;
    let finalWordConjugations;
    if (llmConjugations === null) {
      finalWordConjugations = null;
    } else if (llmConjugations) { // it's an object
      finalWordConjugations = {
        past: llmConjugations.past || null,
        present: llmConjugations.present || null,
        future: llmConjugations.future || null,
        imperative: llmConjugations.imperative || null,
      };
    } else { // it's undefined
      finalWordConjugations = undefined;
    }

    const llmExamples = currentItem.examples;
    let finalWordExamples;
    if (llmExamples === null) {
      finalWordExamples = null;
    } else if (Array.isArray(llmExamples)) {
      finalWordExamples = llmExamples.filter((ex: { hebrew: string; russian: string; }) => ex && typeof ex.hebrew === 'string' && typeof ex.russian === 'string');
    } else { // it's undefined
      finalWordExamples = undefined; 
    }

    enrichedWords.push({
      id: String(Date.now()) + Math.random().toString(36).substring(2, 9),
      hebrew,
      transcription,
      russian,
      category: category,
      conjugations: finalWordConjugations,
      examples: finalWordExamples,
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
        conjugations: undefined, // Default for missing words
        examples: [],          // Default for missing words (empty array is compatible with examples?: Type[] | null)
      });
    }
  }
  return finalWords;
}

// The rest of the file (if any)
