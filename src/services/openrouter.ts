import { Word } from '../types';
import OpenAI from 'openai';

// Interface for the expected structure of a single item from the LLM batch response
interface LLMBatchResponseItem {
  category: string;
  hebrew: string;
  transcription: string;
  russian: string;
  conjugation?: string;
  example?: string;
  error?: string; // If the LLM reports an error for a specific word
}

// Interface for the expected structure of a single item from the LLM single word response
interface LLMSingleResponse {
  category?: string;
  hebrew?: string;
  transcription?: string;
  russian?: string;
  conjugation?: string;
  example?: string;
  error?: string; // If the LLM cannot process the word
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

  const prompt = `For each Hebrew word in the following list [${wordsListString}], provide the following information.
Your response must be a single JSON object. This object must have a key named "words", and its value must be a JSON array.
Each item in the "words" array should be a JSON object corresponding to one word from the input list.
The JSON object for each word should look like this:
{
  "category": "...", // Noun, Verb, Adjective, Adverb, Preposition, Conjunction, Pronoun, Other
  "hebrew": "THE_ORIGINAL_HEBREW_WORD_HERE",
  "transcription": "...",
  "russian": "...",
  "conjugation": "...", // Optional, empty string or omit if not applicable
  "example": "..."     // Optional, empty string or omit if not applicable
}
Ensure the transcription is accurate and the Russian translation is common.
If conjugation or an example sentence is not easily determined, provide an empty string or omit the field.
If you cannot process a specific word, include an "error" field in its JSON object with a brief explanation, but still try to process other words.
Provide ONLY the JSON object with the "words" array in your response, with no other text before or after it. The array should contain one object for each word in the input list [${wordsListString}].`;

  try {
    const completion = await openai.chat.completions.create({
      model: modelIdentifier,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message || !completion.choices[0].message.content) {
      console.error('Invalid LLM response structure (batch): No content or choices.', completion);
      throw new Error('Invalid LLM response structure (batch): No content or choices.');
    }
    const content = completion.choices[0].message.content;

    let responseObject: any;
    try {
      responseObject = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse LLM response content as JSON (batch). Content:', content, 'Error:', e);
      throw new Error('LLM response content was not valid JSON.');
    }

    if (typeof responseObject !== 'object' || responseObject === null || !responseObject.hasOwnProperty('words')) {
      console.error('Invalid LLM response structure (batch): "words" key missing or response is not an object. Response:', responseObject);
      // Fallback: check if the responseObject itself is the array (LLM misunderstood prompt)
      if (Array.isArray(responseObject)) {
         console.warn('LLM returned a direct array instead of an object with a "words" key. Processing as direct array.');
         responseObject = { words: responseObject }; // Wrap it to fit expected structure
      } else {
        throw new Error('LLM response is not an object or does not contain a "words" key, and is not a direct array.');
      }
    }

    let wordsArray = responseObject.words;
    if (typeof wordsArray === 'string') {
      try {
        wordsArray = JSON.parse(wordsArray);
        console.log('Successfully parsed stringified "words" field from LLM response.');
      } catch (e) {
        console.error('Failed to parse stringified "words" field. Content:', responseObject.words, 'Error:', e);
        throw new Error('LLM response had a "words" field, but it was a string that could not be parsed into an array.');
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
        conjugation: currentItem.conjugation ? String(currentItem.conjugation) : undefined,
        example: currentItem.example ? String(currentItem.example) : undefined,
        showTranslation: false,
        isLearned: false,
        learningStage: 0,
        lastReviewed: null,
        nextReview: null,
        dateAdded: Date.now(),
      });
    }
    return enrichedWords;

  } catch (error) {
    console.error('Error enriching words with LLM (batch) using OpenAI SDK:', error);
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API Error: ${error.status} ${error.name} ${error.message}`);
    }
    throw error;
  }
}

export async function enrichWordWithLLM(
  hebrewWord: string,
  apiKey: string,
  modelIdentifier: string
): Promise<Word | null> {
  if (!apiKey || !modelIdentifier) {
    throw new Error('API key or model not configured.');
  }

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });

  const prompt = `For the Hebrew word "${hebrewWord}", provide the following information strictly in JSON format.
Your response must be a single JSON object.
The JSON object should look like this:
{
  "category": "...", // Noun, Verb, Adjective, Adverb, Preposition, Conjunction, Pronoun, Other
  "hebrew": "${hebrewWord}",
  "transcription": "...",
  "russian": "...",
  "conjugation": "...", // Optional, empty string or omit if not applicable
  "example": "..."     // Optional, empty string or omit if not applicable
}
Ensure the transcription is accurate and the Russian translation is common.
The category should be one of: Noun, Verb, Adjective, Adverb, Preposition, Conjunction, Pronoun, Other.
If conjugation is not applicable or not easily determined, provide an empty string or omit the field.
If an example sentence is not easily determined, provide an empty string or omit the field.
If you cannot process the word or find the required information, your JSON response should be an object with an "error" key, like this: { "error": "Could not process the word [reason]" }.
Provide ONLY the JSON object in your response, with no other text before or after it.`;

  try {
    const completion = await openai.chat.completions.create({
      model: modelIdentifier,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message || !completion.choices[0].message.content) {
      console.error(`Invalid LLM response structure (single for "${hebrewWord}"): No content or choices.`, completion);
      throw new Error(`Invalid LLM response structure (single for "${hebrewWord}"): No content or choices.`);
    }
    const content = completion.choices[0].message.content;

    let wordObject: LLMSingleResponse;
    try {
      wordObject = JSON.parse(content);
    } catch (e) {
      console.error(`Failed to parse LLM response content as JSON (single for "${hebrewWord}"). Content:`, content, 'Error:', e);
      throw new Error(`LLM response content for "${hebrewWord}" was not valid JSON.`);
    }

    if (wordObject.error) {
      console.warn(`LLM reported error for word "${hebrewWord}": ${String(wordObject.error)}`);
      return null;
    }

    const hebrew = String(wordObject.hebrew || '');
    const transcription = String(wordObject.transcription || '');
    const russian = String(wordObject.russian || '');
    const category = String(wordObject.category || 'other');

    if (!hebrew || !transcription || !russian) {
      console.warn(`LLM response for "${hebrewWord}" missing critical fields (hebrew, transcription, russian) after stringification:`, {
        originalObject: wordObject,
        processed: { hebrew, transcription, russian, category }
      });
      return null;
    }

    return {
      id: String(Date.now()) + Math.random().toString(36).substring(2, 9),
      hebrew: hebrew,
      transcription: transcription,
      russian: russian,
      category: category as Word['category'],
      conjugation: wordObject.conjugation ? String(wordObject.conjugation) : undefined,
      example: wordObject.example ? String(wordObject.example) : undefined,
      showTranslation: false,
      isLearned: false,
      learningStage: 0,
      lastReviewed: null,
      nextReview: null,
      dateAdded: Date.now(),
    };

  } catch (error) {
    console.error(`Error enriching word "${hebrewWord}" with LLM (single):`, error);
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API Error for "${hebrewWord}": ${error.status} ${error.name} ${error.message}`);
    }
    // Ensure a generic error is thrown if it's not already an Error instance
    if (error instanceof Error) {
        throw error;
    }
    throw new Error(`An unknown error occurred during LLM single word enrichment for "${hebrewWord}".`);
  }
}
