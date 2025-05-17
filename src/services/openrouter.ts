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

  const prompt = `For each Hebrew phrase (whole phrase in qotes) in the following list [${wordsListString}], provide the following information:
- Your response must be a single JSON object (array of objects).
- Each item in the array should be a JSON object corresponding to one word or phrase from the input list.
- All conjugations must be provided in Hebrew only, with Hebrew pronouns.
- Include examples of usage in Hebrew and their Russian translations.

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
IMPORTANT: Only include conjugation tables if the word is a verb (פועל). Skip conjugations for all other word types.
When the word is a verb (פועל):
- Include complete conjugation tables using Hebrew pronouns (אני, אתה, את, הוא, היא, אנחנו, אתם, אתן, הם, הן)
- All conjugations must be in Hebrew only, do not transliterate them
For multi-word inputs, ensure the translation preserves the full meaning of the phrase.
If you cannot process a specific word/phrase, include an "error" field in its JSON object with a brief explanation, but still try to process other entries.
Provide ONLY the JSON object with the array  of items in your response, with no other text before or after it. 
The array should contain one object for each word in the input list you were given at the beginning of this prompt.`;

  try {
    // Request LLM with tool_choice to enforce structured output
    const completion = await openai.chat.completions.create({
      model: modelIdentifier,
      messages: [{ role: 'user', content: prompt }],
      tools: [{
        type: "function",
        function: {
          name: "structured_response",
          description: "Returns a structured JSON object with enriched words",
          parameters: {
            type: "object",
            properties: {
              words: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    hebrew: { type: "string" },
                    transcription: { type: "string" },
                    russian: { type: "string" },
                    conjugations: { type: ["object", "null"] },
                    examples: { type: ["array", "null"] },
                    error: { type: "string" }
                  },
                  required: ["category","hebrew","transcription","russian"]
                }
              }
            },
            required: ["words"]
          }
        }
      }],
      tool_choice: {
        type: "function",
        function: { name: "structured_response" }
      },
      stream: false
    });
      
    if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message) {
      console.error('Invalid LLM response structure (batch): No content or choices.', completion);
      throw new Error('Invalid LLM response structure (batch): No content or choices.');
    }
  
    // Extract JSON from tool call arguments for structured output
    const message = completion.choices[0].message;
    console.log('LLM response message:', message);
    
    let responseData: any;
    if (message.tool_calls && message.tool_calls[0] && message.tool_calls[0].function && message.tool_calls[0].function.arguments) {
      responseData = JSON.parse(message.tool_calls[0].function.arguments);
    } else if (message.content) {
      // Fallback to parsing raw content
      let content = message.content;
      console.log('LLM response content:', content);
      
      // First try to parse as direct JSON array
      try {
        if (content.trim().startsWith('[')) {
          const sanitized = sanitizeJsonString(content);
          responseData = { words: JSON.parse(sanitized) };
          console.log('Successfully parsed direct array response');
          return processWordsArray(responseData.words, hebrewWords);
        }
      } catch (e) {
        console.log('Failed to parse as direct array, trying other methods');
      }
      
      // Try to clean and parse the content
      let content_clean = content.trim();
      
      // Remove any markdown code blocks
      if (content_clean.includes('```json')) {
        content_clean = content_clean.replace(/```json/g, '').replace(/```/g, '');
      } else if (content_clean.includes('```')) {
        content_clean = content_clean.replace(/```/g, '');
      }
      
      // Find the first [ and last ] to get the array
      const arrayStartIdx = content_clean.indexOf('[');
      const arrayEndIdx = content_clean.lastIndexOf(']');
      
      if (arrayStartIdx >= 0 && arrayEndIdx > arrayStartIdx) {
        content_clean = content_clean.substring(arrayStartIdx, arrayEndIdx + 1);
        
        // Try to parse the cleaned content
        try {
          const sanitized = sanitizeJsonString(content_clean);
          responseData = { words: JSON.parse(sanitized) };
          console.log('Successfully parsed cleaned array response');
          return processWordsArray(responseData.words, hebrewWords);
        } catch (e) {
          console.error('Failed to parse cleaned content. Trying manual sanitization...');
          
          // Last resort - try to manually fix common issues
          try {
            const manuallySanitized = content_clean
              .replace(/\n/g, '')
              .replace(/\r/g, '')
              .replace(/\t/g, '')
              .replace(/,\s*]/g, ']'); // Remove trailing commas
              
            responseData = { words: JSON.parse(manuallySanitized) };
            console.log('Successfully parsed with manual sanitization');
            return processWordsArray(responseData.words, hebrewWords);
          } catch (e) {
            console.error('Final parsing attempt failed:', e);
          }
        }
      }
      
      // If all else fails, return minimal word entries
      console.error('Failed to parse LLM response content as JSON');
      return hebrewWords.map(word => ({
        id: String(Date.now()) + Math.random().toString(36).substring(2, 9),
        hebrew: word,
        transcription: '',
        russian: '',
        category: 'אחר',
        showTranslation: false,
        isLearned: false,
        learningStage: 0,
        lastReviewed: null,
        nextReview: null,
        dateAdded: Date.now(),
      }));
    } else {
      throw new Error('LLM response does not contain expected data structure.');
    }
    
    function sanitizeJsonString(jsonString: string): string {
      // Remove any trailing characters after last ]
      const lastBracket = jsonString.lastIndexOf(']');
      if (lastBracket >= 0) {
        jsonString = jsonString.substring(0, lastBracket + 1);
      }
      
      // Fix common Unicode escape issues
      jsonString = jsonString
        .replace(/\\u([0-9a-fA-F]{4})/g, (match, group) => {
          try {
            return String.fromCharCode(parseInt(group, 16));
          } catch {
            return match;
          }
        })
        .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
      
      return jsonString;
    }
    
    function processWordsArray(wordsArray: any[], originalWords: string[]): Word[] {
      if (!Array.isArray(wordsArray)) {
        console.error('Invalid words array:', wordsArray);
        throw new Error('LLM response is not a valid array.');
      }
      
      const enrichedWords: Word[] = [];
      
      for (const currentItem of wordsArray) {
        if (currentItem.error) {
          console.warn(`LLM reported error for word: ${String(currentItem.error)}`);
          continue;
        }
        
        const hebrew = String(currentItem.hebrew || '');
        const transcription = String(currentItem.transcription || '');
        const russian = String(currentItem.russian || '');
        const category = String(currentItem.category || 'other');
        
        if (!hebrew || !transcription || !russian) {
          console.warn('Missing required fields:', currentItem);
          continue;
        }
        
        enrichedWords.push({
          id: String(Date.now()) + Math.random().toString(36).substring(2, 9),
          hebrew,
          transcription,
          russian,
          category: category as Word['category'],
          conjugations: currentItem.conjugations,
          examples: Array.isArray(currentItem.examples) 
            ? currentItem.examples.filter((ex: { hebrew?: string; russian?: string }) => ex?.hebrew && ex?.russian)
            : [],
          showTranslation: false,
          isLearned: false,
          learningStage: 0,
          lastReviewed: null,
          nextReview: null,
          dateAdded: Date.now(),
        });
      }
      
      // Ensure we return at least minimal entries for all original words
      if (enrichedWords.length < originalWords.length) {
        const missingWords = originalWords.filter(w => !enrichedWords.some(ew => ew.hebrew === w));
        for (const word of missingWords) {
          enrichedWords.push({
            id: String(Date.now()) + Math.random().toString(36).substring(2, 9),
            hebrew: word,
            transcription: '',
            russian: '',
            category: 'אחר',
            showTranslation: false,
            isLearned: false,
            learningStage: 0,
            lastReviewed: null,
            nextReview: null,
            dateAdded: Date.now(),
          });
        }
      }
      
      return enrichedWords;
    }
    
    // Process the response data
    if (!responseData || !responseData.words) {
      console.warn('Invalid LLM response structure (batch): "words" key missing. Response:', responseData);
      
      // Fallback: return minimal word entries with default values
      return hebrewWords.map(word => ({
        id: String(Date.now()) + Math.random().toString(36).substring(2, 9),
        hebrew: word,
        transcription: '',
        russian: '',
        category: 'אחר',
        showTranslation: false,
        isLearned: false,
        learningStage: 0,
        lastReviewed: null,
        nextReview: null,
        dateAdded: Date.now(),
      }));
    }
    
    let wordsArray = responseData?.words;
    console.log('LLM response words:', responseData);
    
    // If words is a string, try to parse it as JSON
    if (typeof wordsArray === 'string') {
      try {
        const cleanString = wordsArray.trim()
          .replace(/^```json\s*/i, '')
          .replace(/```$/i, '')
          .replace(/^"/, '')
          .replace(/"$/, '');
          
        if (cleanString.startsWith('[{') || cleanString.startsWith('{')) {
          wordsArray = JSON.parse(cleanString);
        } else if (cleanString.includes(',')) {
          wordsArray = cleanString.split(',').map(word => ({
            hebrew: word.trim(),
            transcription: '',
            russian: '',
            category: 'אחר'
          }));
        }
      } catch (e) {
        console.error('Failed to parse stringified "words" field. Error:', e);
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
        throw new Error(`Превышен лимит запросов API. Попробуйте позже или уменьшите количество מילים в запросе (${status})`);
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
