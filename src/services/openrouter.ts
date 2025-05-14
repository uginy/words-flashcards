import { Word } from '../types';

interface LLMResponse {
  category: string;
  hebrew: string;
  transcription: string;
  russian: string;
  conjugation?: string;
  example?: string;
}

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
        temperature: 0.3, // Lower temperature for more deterministic output
        response_format: { type: "json_object" } // Request JSON output if supported by model
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
