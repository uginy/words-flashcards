import { Word, WordCategory } from '../types';
import OpenAI from 'openai';

// Interface for the expected structure of a single item from the LLM batch response
interface LLMBatchResponseItem {
  category: WordCategory;
  hebrew: string;
  transcription: string;
  russian: string;
  conjugations?: {
    past?: { [pronoun: string]: string }; // Hebrew pronouns like אני, אתה, etc.
    present?: { [pronoun: string]: string };
    future?: { [pronoun: string]: string };
    imperative?: { [pronoun: string]: string };
  };
  examples?: { hebrew: string; russian: string }[]; // Now array of objects with hebrew and russian fields
  error?: string; // If the LLM reports an error for a specific word
}

export async function enrichWordsWithLLM(
  hebrewWords: string[],
  apiKey: string,
  modelIdentifier: string // e.g., "mistralai/mistral-7b-instruct"
): Promise<Word[]> {
  if (!apiKey || !modelIdentifier) {
    throw new Error('API key or model not configured.');
  }
  if (hebrewWords.length === 0) {
    return [];
  }

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });

  const wordsListString = hebrewWords.map(word => `"${word}"`).join(', ');

  const prompt = `For each Hebrew phrase (whole phrase in qotes) in the following list [${wordsListString}], provide the following information.
Your response must be a single JSON object. This object must have a key named "words", and its value must be a JSON array.
Each item in the "words" array should be a JSON object corresponding to one word or phrase from the input list.
All conjugations must be provided in Hebrew only, with Hebrew pronouns.

IMPORTANT RULES FOR PROCESSING:
1. If the input contains spaces (multiple words), translate it as a complete phrase, preserving its meaning.
2. For phrases and compound words, try to categorize them appropriately in Hebrew:
   - If it's a verbal phrase or a verb -> categorize as "פועל" (verb - po'al)
   - If it's a noun phrase -> categorize as "שם עצם" (noun - shem etzem)
   - If it describes quality -> categorize as "שם תואר" (adjective - shem to'ar)
   - If unsure -> categorize as "אחר" (other - acher)

The JSON object for each word/phrase should look like this:
{
  "id": "...", // Will be set by the app
  "hebrew": "THE_ORIGINAL_HEBREW_INPUT_HERE",
  "transcription": "...", // Romanized transcription of the full phrase
  "russian": "...", // Russian translation of the full phrase
  "category": "שם עצם", // Only one of: שם עצם, פועל, שם תואר, אחר
  "showTranslation": false,
  "isLearned": false,
  "learningStage": 0,
  "lastReviewed": null,
  "nextReview": null,
  "dateAdded": null, // Will be set by the app
  "conjugations": { // Only for verbs (פועל), provide conjugations in Hebrew only
    "past": {
      "אני": "...", // I (any gender)
      "אתה": "...", // you (m)
      "את": "...", // you (f)
      "הוא": "...", // he
      "היא": "...", // she
      "אנחנו": "...", // we
      "אתם": "...", // you (m.pl)
      "אתן": "...", // you (f.pl)
      "הם": "...", // they (m)
      "הן": "..." // they (f)
    },
    "present": {
      "אני": "...", // I (any gender)
      "אתה": "...", // you (m)
      "את": "...", // you (f)
      "הוא": "...", // he
      "היא": "...", // she
      "אנחנו": "...", // we
      "אתם": "...", // you (m.pl)
      "אתן": "...", // you (f.pl)
      "הם": "...", // they (m)
      "הן": "..." // they (f)
    },
    "future": {
      "אני": "...", // I (any gender)
      "אתה": "...", // you (m)
      "את": "...", // you (f)
      "הוא": "...", // he
      "היא": "...", // she
      "אנחנו": "...", // we
      "אתם": "...", // you (m.pl)
      "אתן": "...", // you (f.pl)
      "הם": "...", // they (m)
      "הן": "..." // they (f)
    },
    "imperative": {
      "אתה": "...", // you (m)
      "את": "...", // you (f)
      "אתם": "...", // you (m.pl)
      "אתן": "..." // you (f.pl)
    }
  },
  "examples": [
    { "hebrew": "...", "russian": "..." },
    { "hebrew": "...", "russian": "..." },
    { "hebrew": "...", "russian": "..." }
  ] // Array of 3-5 objects, each with a Hebrew example and its Russian translation
}

Focus on providing accurate hebrew, transcription, russian, and category fields.
IMPORTANT: Only include conjugation tables if the word is a verb (category="פועל"). Skip conjugations for all other word types.
When the word is a verb (פועל):
- Include complete conjugation tables using Hebrew pronouns (אני, אתה, את, הוא, היא, אנחנו, אתם, אתן, הם, הן)
- All conjugations must be in Hebrew only, do not transliterate them
For multi-word inputs, ensure the translation preserves the full meaning of the phrase.
If you cannot process a specific word/phrase, include an "error" field in its JSON object with a brief explanation, but still try to process other entries.
Provide ONLY the JSON object with the "words" array in your response, with no other text before or after it. The array should contain one object for each word in the input list you were given at the beginning of this prompt.`;

  try {
    const completion = await openai.chat.completions.create({
      model: modelIdentifier,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
      stream: false // Explicitly disable streaming
    });

    if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message || !completion.choices[0].message.content) {
      console.error('Invalid LLM response structure (batch): No content or choices.', completion);
      throw new Error('Invalid LLM response structure (batch): No content or choices.');
    }
    const content = completion.choices[0].message.content;

    // Попробуем извлечь JSON из текста ответа
    let content_clean = content.trim();
    
    // Попытка удалить возможные текстовые обертки вокруг JSON
    if (content_clean.includes('```json')) {
      content_clean = content_clean.replace(/```json/g, '').replace(/```/g, '');
    } else if (content_clean.includes('```')) {
      content_clean = content_clean.replace(/```/g, '');
    }
    
    // Пытаемся найти начало и конец JSON объекта
    const jsonStartIdx = content_clean.indexOf('{');
    const jsonEndIdx = content_clean.lastIndexOf('}');
    
    if (jsonStartIdx >= 0 && jsonEndIdx > jsonStartIdx) {
      content_clean = content_clean.substring(jsonStartIdx, jsonEndIdx + 1);
    }
    
    let responseObject: any;
    try {
      responseObject = JSON.parse(content_clean);
    } catch (e) {
      console.error('Failed to parse LLM response content as JSON (batch). Content:', content_clean, 'Error:', e);
      throw new Error('LLM response content was not valid JSON.');
    }

    if (typeof responseObject !== 'object' || responseObject === null) {
      throw new Error('LLM response is not a valid JSON object.');
    }
    
    // Проверка различных форматов ответа
    if (!responseObject.hasOwnProperty('words')) {
      console.warn('Invalid LLM response structure (batch): "words" key missing. Response:', responseObject);
      
      // Fallback 1: Проверяем, является ли сам responseObject массивом
      if (Array.isArray(responseObject)) {
         console.warn('LLM returned a direct array instead of an object with a "words" key. Processing as direct array.');
         responseObject = { words: responseObject }; // Оборачиваем его в ожидаемую структуру
      } 
      // Fallback 2: Проверяем наличие других полей, которые могут содержать наши данные
      else if (responseObject.message && responseObject.message.content) {
        try {
          const nestedContent = JSON.parse(responseObject.message.content);
          if (nestedContent && (nestedContent.words || Array.isArray(nestedContent))) {
            responseObject = nestedContent.words ? nestedContent : { words: nestedContent };
          }
        } catch (e) {
          console.error('Failed to parse nested content', e);
        }
      } 
      // Если ни один fallback не сработал
      else {
        throw new Error('LLM response does not contain expected data structure.');
      }
    }

    let wordsArray = responseObject.words;
    
    // Если words - строка, попытаемся распарсить её как JSON
    if (typeof wordsArray === 'string') {
      try {
        // Попытка очистить строку от возможных лишних символов
        const cleanString = wordsArray.trim()
          .replace(/^```json\s*/i, '')
          .replace(/```$/i, '')
          .replace(/^"/, '')
          .replace(/"$/, '');
          
        // Если это строка с экранированным JSON внутри
        if (cleanString.startsWith('[{') || cleanString.startsWith('{')) {
          wordsArray = JSON.parse(cleanString);
        } 
        // Возможно это просто строка с перечислением слов
        else if (cleanString.includes(',')) {
          wordsArray = cleanString.split(',').map(word => ({ 
            hebrew: word.trim(),
            transcription: '',
            russian: '',
            category: 'אחר'
          }));
        }
        console.log('Successfully parsed stringified "words" field from LLM response.');
      } catch (e) {
        console.error('Failed to parse stringified "words" field. Content:', responseObject.words, 'Error:', e);
        console.warn('Attempting to continue with available data');
        
        // Возвращаем хотя бы минимальную информацию вместо полного отказа
        // Используем исходные слова, которые передавались в функцию
        wordsArray = hebrewWords.map(word => ({
          hebrew: word,
          transcription: '',
          russian: '',
          category: 'אחר'
        }));
      }
    }

    if (!Array.isArray(wordsArray)) {
      console.error('Invalid LLM response structure (batch): "words" is not an array and was not a parsable stringified array. Value:', wordsArray);
      throw new Error('LLM response "words" field is not an array.');
    }
    
    const parsedArray: LLMBatchResponseItem[] = wordsArray;
    const enrichedWords: Word[] = [];

    for (const currentItem of parsedArray) {
      if (currentItem.error) {
        console.warn(`LLM reported error for word "${String(currentItem.hebrew || 'unknown')}": ${String(currentItem.error)}`);
        continue;
      }

      const hebrew = String(currentItem.hebrew || '');
      const transcription = String(currentItem.transcription || '');
      const russian = String(currentItem.russian || '');
      const category = String(currentItem.category || 'other');

      if (!hebrew || !transcription || !russian) {
        console.warn('LLM response item missing critical fields (hebrew, transcription, russian) after attempting to stringify:', {
          originalItem: currentItem,
          processed: { hebrew, transcription, russian, category }
        });
        continue;
      }

      enrichedWords.push({
        id: String(Date.now()) + Math.random().toString(36).substring(2, 9),
        hebrew: hebrew,
        transcription: transcription,
        russian: russian,
        category: category as Word['category'],
        conjugations: currentItem.conjugations,
        examples: Array.isArray(currentItem.examples)
          ? currentItem.examples
              .filter(
                (ex: any) =>
                  ex &&
                  typeof ex === 'object' &&
                  typeof ex.hebrew === 'string' &&
                  typeof ex.russian === 'string'
              )
              .map((ex: any) => ({
                hebrew: ex.hebrew,
                russian: ex.russian,
              }))
          : [],
        showTranslation: false,
        isLearned: false, // Unified to isLearned
        learningStage: 0,
        lastReviewed: null,
        nextReview: null,
        dateAdded: Date.now(),
      });
    }
    return enrichedWords;

  } catch (error) {
    console.error('Error enriching words with LLM (batch) using OpenAI SDK:', error);
    
    // Более информативная обработка ошибок
    if (error instanceof OpenAI.APIError) {
      const status = error.status || 'unknown';
      const name = error.name || 'Error';
      const message = error.message || '';
      
      // Более понятные ошибки для конечного пользователя
      if (status === 401 || status === 403) {
        throw new Error(`Ошибка авторизации API: Проверьте ваш API ключ (${status})`);
      } else if (status === 429) {
        throw new Error(`Превышен лимит запросов API. Попробуйте позже или уменьшите количество слов в запросе (${status})`);
      } else if (status >= 500) {
        throw new Error(`Сервис временно недоступен. Попробуйте позже (${status})`);
      } else {
        throw new Error(`Ошибка API: ${status} ${name} ${message}`);
      }
    }
    
    // Более дружелюбное сообщение об ошибке
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Не удалось обработать слова: ${errorMsg}`);
  }
}
