import { Word } from '../types';

interface LLMResponse {
  category: string;
  hebrew: string;
  transcription: string;
  russian: string;
  conjugation?: string;
  example?: string;
}

// Existing enrichWordWithLLM function remains for now,
// though it might be deprecated or refactored later if not used.
export async function enrichWordWithLLM(
  hebrewWord: string,
  apiKey: string,
  model: string
): Promise<Word | null> {
  if (!apiKey || !model) {
    throw new Error('API key or model not configured.');
  }

  const prompt = `For the Hebrew word "\${hebrewWord}", provide the following information strictly in JSON format:
{
  "category": "...",
  "hebrew": "\${hebrewWord}",
  "transcription": "...",
  "russian": "...",
  "conjugation": "...",
  "example": "..."
}
Ensure the transcription is accurate and the Russian translation is common.
The category should be one of: Noun, Verb, Adjective, Adverb, Preposition, Conjunction, Pronoun, Other.
If conjugation is not applicable or not easily determined, provide an empty string or omit the field.
If an example sentence is not easily determined, provide an empty string or omit the field.
Provide ONLY the JSON object in your response, with no other text before or after it.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        // response_format: { type: "json_object" } // Removed, as the model returns a stringified array in content
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text(); // Get body as text first
      let detail = errorBody;
      try {
        const errorJson = JSON.parse(errorBody); // Try to parse the text as JSON
        if (errorJson.error && typeof errorJson.error.message === 'string') {
          detail = errorJson.error.message;
        } else if (typeof errorJson.message === 'string') {
          detail = errorJson.message;
        }
      } catch (e) {
        // Not JSON or malformed, use the raw text (or a snippet of it if too long)
        console.warn(`Error response from API was not valid JSON. Status: ${response.status}. Body (first 500 chars):`, errorBody.substring(0, 500));
        detail = errorBody.substring(0, 200) + (errorBody.length > 200 ? '...' : ''); // Keep detail concise
      }
      throw new Error(`API request failed with status ${response.status}: ${detail}`);
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
      console.error('Invalid LLM response structure:', data);
      throw new Error('Invalid LLM response structure.');
    }

    const content = data.choices[0].message.content;
    
    let parsedContent: LLMResponse;
    try {
      parsedContent = JSON.parse(content);
    } catch (e1) {
      console.warn('Direct JSON.parse failed for LLM content. Attempting to extract JSON block.', e1 instanceof Error ? e1.message : e1);
      // Basic regex to find a JSON-like block.
      // This is a fallback if response_format: { type: "json_object" } is not respected or fails.
      const jsonMatch = content.match(/\{([\s\S]*)\}/m); // Corrected regex
      if (jsonMatch && jsonMatch[0]) {
        try {
          parsedContent = JSON.parse(jsonMatch[0]);
          console.log('Successfully parsed extracted JSON block from LLM response.');
        } catch (e2) {
          console.error('Failed to parse extracted LLM response content as JSON. Original content:', content, 'Extracted block:', jsonMatch[0], e2 instanceof Error ? e2.message : e2);
          throw new Error('LLM response was not valid JSON, even after attempting to extract a block.');
        }
      } else {
        console.error('Failed to parse LLM response content as JSON and no JSON-like block found. Original content:', content, e1 instanceof Error ? e1.message : e1);
        throw new Error('LLM response was not valid JSON and no JSON block could be extracted.');
      }
    }

    // Validate the parsed content
    if (!parsedContent.hebrew || !parsedContent.transcription || !parsedContent.russian || !parsedContent.category) {
        console.error('LLM response missing required fields:', parsedContent);
        throw new Error('LLM response missing required fields (hebrew, transcription, russian, category).');
    }
    
    return {
      id: String(Date.now()), // Simple ID generation, converted to string
      ...parsedContent,
      // Ensure optional fields are handled correctly
      conjugation: parsedContent.conjugation || undefined,
      example: parsedContent.example || undefined,
      showTranslation: false,
      isLearned: false,
      learningStage: 0,
      lastReviewed: null,
      nextReview: null,
    };

  } catch (error) {
    console.error('Error enriching word with LLM:', error);
    // Propagate the error to be handled by the caller
    if (error instanceof Error) {
        throw error;
    }
    throw new Error('An unknown error occurred during LLM enrichment.');
  }
}

interface LLMBatchResponseItem {
  category: string;
  hebrew: string;
  transcription: string;
  russian: string;
  conjugation?: string;
  example?: string;
  error?: string; 
}

export async function enrichWordsWithLLM(
  hebrewWords: string[],
  apiKey: string,
  model: string
): Promise<Word[]> {
  if (!apiKey || !model) {
    throw new Error('API key or model not configured.');
  }
  if (hebrewWords.length === 0) {
    return [];
  }

  const wordsListString = hebrewWords.map(word => `"${word}"`).join(', ');

  const prompt = `For each Hebrew word in the following list [${wordsListString}], provide the following information strictly in a JSON array format. Each item in the array should be a JSON object corresponding to one word from the list.
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
If you cannot process a specific word, you can include an "error" field in its JSON object with a brief explanation, but still try to process other words.
Provide ONLY the JSON array in your response, with no other text before or after it. The array should contain one object for each word in the input list [${wordsListString}].`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        // response_format: { type: "json_object" } // Removed this line
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let detail = errorBody;
      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.error && typeof errorJson.error.message === 'string') {
          detail = errorJson.error.message;
        } else if (typeof errorJson.message === 'string') {
          detail = errorJson.message;
        }
      } catch (e) {
        console.warn(`Error response from API was not valid JSON. Status: ${response.status}. Body (first 500 chars):`, errorBody.substring(0, 500));
        detail = errorBody.substring(0, 200) + (errorBody.length > 200 ? '...' : '');
      }
      throw new Error(`API request failed with status ${response.status}: ${detail}`);
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
      console.error('Invalid LLM response structure (batch):', data);
      throw new Error('Invalid LLM response structure (batch).');
    }

    const content = data.choices[0].message.content; // content is a string, e.g., "[{...},{...}]"
    let parsedArray: LLMBatchResponseItem[];

    try {
      // Attempt to parse the content string directly.
      const potentialObjectOrArray = JSON.parse(content);

      if (Array.isArray(potentialObjectOrArray)) {
        parsedArray = potentialObjectOrArray;
      } else if (typeof potentialObjectOrArray === 'object' && potentialObjectOrArray !== null) {
        // Handle cases where content is a stringified object that might contain the array
        // or is a single word object for a single word input.
        if (
          hebrewWords.length === 1 &&
          ('hebrew' in potentialObjectOrArray || 'russian' in potentialObjectOrArray || 'category' in potentialObjectOrArray || 'error' in potentialObjectOrArray) && 
          !Object.keys(potentialObjectOrArray).some(key => Array.isArray((potentialObjectOrArray as any)[key]))
        ) {
          parsedArray = [potentialObjectOrArray as LLMBatchResponseItem];
          console.log('LLM returned a single object (from parsed content string) for a single word input, wrapped into an array.');
        } else {
          const keys = Object.keys(potentialObjectOrArray);
          const arrayKeyFound = keys.find(key => Array.isArray((potentialObjectOrArray as any)[key]));
          if (arrayKeyFound) {
            parsedArray = (potentialObjectOrArray as any)[arrayKeyFound];
            console.log(`LLM returned an object (from parsed content string), extracted array from key: ${arrayKeyFound}`);
          } else {
            throw new Error('LLM response (from parsed content string) was an object but did not directly contain an array, and no array property was found.');
          }
        }
      } else {
         throw new Error('LLM response (from parsed content string) was not a JSON array or a JSON object.');
      }
    } catch (e1) {
      console.warn('Initial JSON.parse of LLM content string failed or structure was unexpected. Error:', e1 instanceof Error ? e1.message : String(e1), "Attempting regex fallback. Raw content string:", content);
      const jsonMatch = content.match(/\s*(\[[\s\S]*\])\s*/m); // Regex to find array string like " [...] "
      if (jsonMatch && jsonMatch[1]) { // jsonMatch[1] is the captured array string itself
        try {
          parsedArray = JSON.parse(jsonMatch[1]);
          console.log('Successfully parsed extracted JSON array block from LLM content string using regex fallback.');
        } catch (e2) {
          console.error('Failed to parse extracted LLM response (array) as JSON using regex. Original content string:', content, 'Extracted block:', jsonMatch[1], 'Error:', e2 instanceof Error ? e2.message : String(e2));
          throw new Error('LLM response content string was not valid JSON array, even after attempting to extract a block with regex.');
        }
      } else {
        console.error('Failed to parse LLM response (array) from content string and no JSON array-like block found with regex. Original content string:', content, 'Initial error:', e1 instanceof Error ? e1.message : String(e1));
        throw new Error('LLM response content string was not valid JSON array and no JSON array block could be extracted with regex.');
      }
    }

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
    console.error('Error enriching words with LLM (batch):', error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error('An unknown error occurred during LLM batch enrichment.');
  }
}
