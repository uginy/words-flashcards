import type { LLMEnrichmentOptions } from './types';

// Full tool definition for complex models
export const toolDefinition = {
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
              category: { type: "string" as const, enum: ["פועל", "שם עצם", "שם תואר", "פרזות", "אחר"], description: "Category of the word: פועל (verb), שם עצם (noun), שם תואר (adjective), פרזות (phrases), אחר (other)." },
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
                additionalProperties: false
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

// Simplified tool definition for better compatibility
export const simpleToolDefinition = {
  type: "function" as const,
  function: {
    name: "save_hebrew_word_details",
    description: "Saves the translations, transcriptions, categories, conjugations, and examples for a list of Hebrew words.",
    parameters: {
      type: "object" as const,
      properties: {
        processed_words: {
          type: "array" as const,
          description: "An array of objects with Hebrew word details.",
          items: {
            type: "object" as const,
            properties: {
              hebrew: { type: "string" as const, description: "The original Hebrew word/phrase." },
              transcription: { type: "string" as const, description: "Romanized transcription." },
              russian: { type: "string" as const, description: "Russian translation." },
              category: { type: "string" as const, description: "Word category." },
              conjugations: { type: "object" as const, description: "Hebrew conjugations for verbs." },
              examples: { type: "array" as const, description: "Usage examples." }
            },
            required: ["hebrew", "transcription", "russian", "category"]
          }
        }
      },
      required: ["processed_words"]
    }
  }
};

// Function to get optimal tools configuration based on model
export function getOptimalToolsConfig(modelIdentifier: string, options?: LLMEnrichmentOptions) {
  const lowerModel = modelIdentifier.toLowerCase();
  
  // Claude models work better without tool_choice
  const isClaudeModel = lowerModel.includes('claude');
  
  // GPT models support tool_choice well
  const isGPTModel = lowerModel.includes('gpt');
  
  // Gemini models have mixed support
  const isGeminiModel = lowerModel.includes('gemini');
  
  // Use simple schema for better compatibility unless explicitly disabled
  const useSimpleSchema = options?.preferSimpleToolSchema !== false;
  
  // Force tool choice only when explicitly requested or for models known to work well with it
  const shouldUseToolChoice = options?.forceToolChoice === true ||
    (options?.forceToolChoice !== false && (isGPTModel || lowerModel.includes('llama-4')));
  
  return {
    toolDefinition: useSimpleSchema ? simpleToolDefinition : toolDefinition,
    useToolChoice: shouldUseToolChoice,
    modelType: isClaudeModel ? 'claude' : isGPTModel ? 'gpt' : isGeminiModel ? 'gemini' : 'other'
  };
}