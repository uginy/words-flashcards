import OpenAI from "openai";
import type { Word, WordCategory } from "../types";

type ToastFunction = (opts: {
  title: string;
  description: string;
  variant?: 'default' | 'destructive' | 'warning'
}) => void;

// Enhanced retry configuration interface
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

// Enhanced options interface for enrichWordsWithLLM
interface LLMEnrichmentOptions {
  retryConfig?: Partial<RetryConfig>;
  enableDetailedLogging?: boolean;
  validateJsonResponse?: boolean;
}

// Interface for the expected structure of a single item from the LLM batch response
interface LLMBatchResponseItem {
  category: WordCategory;
  hebrew: string;
  transcription: string;
  russian: string;
  conjugations?: {
    past: { [pronoun: string]: string } | null;
    present: { [pronoun: string]: string } | null;
    future: { [pronoun: string]: string } | null;
    imperative: { [pronoun: string]: string } | null;
  } | null;
  examples?: { hebrew: string; russian: string }[] | null;
}

const systemPrompt = `You are an expert linguist specializing in Hebrew. Your task is to process a list of Hebrew words or phrases and provide detailed information for each. For each item, generate a properly formatted JSON object with required fields as specified below.

IMPORTANT RULES AND FIELD FORMATS:

1.  **Original Word**:
    "hebrew": exact match with input word/phrase, no modifications allowed
    **CRITICAL: If the input Hebrew word is a verb that appears to be in a conjugated form, it should be converted to its infinitive form (לפעיל form) in the "hebrew" field. For example, if processing "עובד" (working), convert it to "לעבוד" (to work).**

2.  **Category** (one of these exact values):
    - "פועל" for verbs
    - "שם עצם" for nouns
    - "שם תואר" for adjectives
    - "פרזות" for phrases and expressions
    - "אחר" for other types

3.  **Required Fields**:
    - "transcription": romanized form
    - "russian": translation to Russian
    - "category": from the list above

4.  **Conjugations** (for verbs only):
    For category "פועל", provide conjugations in EXACTLY this format (in Hebrew only).
    For category "פרזות" (phrases), set conjugations to null as phrases don't have conjugations:
    {
      "past": {
        "אני": "...", "אתה": "...", "את": "...", "הוא": "...", "היא": "...", "אנחנו": "...", "אתם": "...", "אתן": "...", "הם": "...", "הן": "..."
      },
      "present": {
        "אני": "...", "אתה": "...", "את": "...", "הוא": "...", "היא": "...", "אנחנו": "...", "אתם": "...", "אתן": "...", "הם": "...", "הן": "..."
      },
      "future": {
        "אני": "...", "אתה": "...", "את": "...", "הוא": "...", "היא": "...", "אנחנו": "...", "אתם": "...", "אתן": "...", "הם": "...", "הן": "..."
      },
      "imperative": {
        "אתה": "...", "את": "...", "אתם": "...", "אתן": "..."
      }
    }
    - ALL four tense fields (past, present, future, imperative) should be present if applicable.
    - Within each tense, include all relevant pronouns as shown.
    - Use null for a tense if it's not applicable (e.g. imperative for some verbs or other tenses if they don't exist).
    - For non-verbs (including phrases "פרזות"), omit the "conjugations" field entirely or set it to null.

5.  **Examples**:
    - Provide 2-3 usage examples.
    - Each example must be an object with "hebrew" and "russian" string fields.
    - The "examples" field itself should be an array of these objects.
    - Use an empty array [] for the "examples" field if no examples are available.

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
        "past": { "אני": "כתבתי", "אתה": "כתבת", "הן": "כתבו" },
        "present": { "אני": "כותב", "אתה": "כותב", "הן": "כותבות" },
        "future": { "אני": "אכתוב", "אתה": "תכתוב", "הן": "יכתבו" },
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
      ]
    }
  ]
}

Ensure the entire response for the function call is a single valid JSON object.
`;

// New system prompt for models that don't support tools well or at all
const systemPromptForDirectJson = `You are an expert linguist specializing in Hebrew. Your task is to process a list of Hebrew words or phrases and provide detailed information for each.
Return a single, valid JSON object as your direct response content. This JSON object must NOT be wrapped in markdown (e.g. \\\`\\\`\\\`json ... \\\`\\\`\\\`).
This JSON object must contain a single key "processed_words". The value of "processed_words" must be an array of objects.
Each object in the "processed_words" array corresponds to one input Hebrew word/phrase and must strictly follow this structure:

{
  "hebrew": "The original Hebrew word/phrase",
  "transcription": "Romanized transcription",
  "russian": "Russian translation",
  "category": "One of: 'פועל', 'שם עצם', 'שם תואר', 'פרזות', 'אחר'",
  "conjugations": { // Or null if not a verb or no conjugations
    "past": { "אני": "...", "אתה": "...", "את": "...", "הוא": "...", "היא": "...", "אנחנו": "...", "אתם": "...", "אתן": "...", "הם": "...", "הן": "..." }, // Or null if not applicable
    "present": { "אני": "...", "אתה": "...", "את": "...", "הוא": "...", "היא": "...", "אנחנו": "...", "אתם": "...", "אתן": "...", "הם": "...", "הן": "..." }, // Or null if not applicable
    "future": { "אני": "...", "אתה": "...", "את": "...", "הוא": "...", "היא": "...", "אנחנו": "...", "אתם": "...", "אתן": "...", "הם": "...", "הן": "..." }, // Or null if not applicable
    "imperative": { "אתה": "...", "את": "...", "אתם": "...", "אתן": "..." } // Or null if not applicable
  },
  "examples": [ // Or an empty array [] if no examples
    { "hebrew": "Example sentence in Hebrew.", "russian": "Russian translation of the example." }
  ]
}

IMPORTANT RULES AND FIELD FORMATS:
1.  **"hebrew"**: Must be an exact match with the input word/phrase.
    **CRITICAL: If the input Hebrew word is a verb that appears to be in a conjugated form, it should be converted to its infinitive form (לפעיל form) in the "hebrew" field. For example, if processing "עובד" (working), convert it to "לעבוד" (to work).**
2.  **"category"**: Must be one of the exact Hebrew strings: "פועל" (verb), "שם עצם" (noun), "שם תואר" (adjective), "פרזות" (phrases), "אחר" (other).
3.  **"transcription"**, **"russian"**: Must be provided.
4.  **"conjugations"**:
    - Provide for verbs ("פועל") only. For non-verbs (including phrases "פרזות"), this field should be null.
    - If provided, it must be an object with keys: "past", "present", "future", "imperative".
    - Each tense key should map to an object of pronoun-conjugation pairs (e.g., "אני": "כתבתי") or be null if that specific tense is not applicable. All conjugations must be in Hebrew.
    - Pronouns should be the standard Hebrew pronouns as listed in the example below.
5.  **"examples"**:
    - Provide 2-3 usage examples.
    - Each example must be an object with "hebrew" and "russian" string fields.
    - The "examples" field itself should be an array of these objects. Use an empty array [] if no examples are available.

Example of the full JSON object you should return for two words "לכתוב" (verb) and "ספר" (noun):
{
  "processed_words": [
    {
      "hebrew": "לכתוב",
      "transcription": "lichtov",
      "russian": "писать",
      "category": "פועל",
      "conjugations": {
        "past": { "אני": "כתבתי", "אתה": "כתבת", "את": "כתבת", "הוא": "כתב", "היא": "כתבה", "אנחנו": "כתבנו", "אתם": "כתבתם", "אתן": "כתבתן", "הם": "כתבו", "הן": "כתבו" },
        "present": { "אני": "כותב", "אתה": "כותב", "את": "כותבת", "הוא": "כותב", "היא": "כותבת", "אנחנו": "כותבים", "אתם": "כותבים", "אתן": "כותבות", "הם": "כותבים", "הן": "כותבות" },
        "future": { "אני": "אכתוב", "אתה": "תכתוב", "את": "תכתבי", "הוא": "יכתוב", "היא": "תכתוב", "אנחנו": "נכתוב", "אתם": "תכתבו", "אתן": "תכתבנה", "הם": "יכתבו", "הן": "יכתבנה" },
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
      ]
    }
  ]
}

Ensure your entire response is ONLY this single JSON object. Do not include any other text, explanations, or markdown formatting (like \\\`\\\`\\\`json) around the JSON.
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

// Helper function to process the array of words from LLM and map to Word[]
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
    const categoryInput = String(currentItem.category || 'אחר');
    const category: WordCategory = ['פועל', 'שם עצם', 'שם תואר', 'פרזות', 'אחר'].includes(categoryInput) ? categoryInput as WordCategory : 'אחר';

    if (!hebrew) {
      console.warn('LLM item missing "hebrew" field, cannot process:', currentItem);
      continue;
    }
    if (!transcription || !russian) {
      console.warn('LLM item missing transcription or russian field:', currentItem);
    }

    const llmConjugations = currentItem.conjugations;
    let finalWordConjugations: {
      past: { [key: string]: string } | null;
      present: { [key: string]: string } | null;
      future: { [key: string]: string } | null;
      imperative: { [key: string]: string } | null;
    } | null | undefined;

    if (llmConjugations === null) {
      finalWordConjugations = null;
    } else if (llmConjugations) {
      finalWordConjugations = {
        past: llmConjugations.past || null,
        present: llmConjugations.present || null,
        future: llmConjugations.future || null,
        imperative: llmConjugations.imperative || null,
      };
    } else {
      finalWordConjugations = undefined;
    }

    const llmExamples = currentItem.examples;
    let finalWordExamples: { hebrew: string; russian: string }[] | null | undefined;
    if (llmExamples === null) {
      finalWordExamples = null;
    } else if (Array.isArray(llmExamples)) {
      finalWordExamples = llmExamples.filter((ex): ex is { hebrew: string; russian: string } =>
        ex && typeof ex === 'object' &&
        'hebrew' in ex && 'russian' in ex &&
        typeof ex.hebrew === 'string' &&
        typeof ex.russian === 'string'
      );
    } else {
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

  const finalWords: Word[] = [];
  for (const originalWord of originalWords) {
    const foundEnrichedWord = enrichedWords.find(ew => ew.hebrew === originalWord);
    if (foundEnrichedWord) {
      finalWords.push(foundEnrichedWord);
    } else {
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

// Enhanced JSON validation function with detailed analysis
function validateJsonString(jsonString: string): { isValid: boolean; issues: string[]; canAttemptFix: boolean } {
  const issues: string[] = [];
  const trimmed = jsonString.trim();
  
  // Check for empty or minimal responses
  if (trimmed === '' || trimmed === '{' || trimmed === '[') {
    issues.push(`Response is incomplete: "${trimmed}"`);
    return { isValid: false, issues, canAttemptFix: false };
  }
  
  // Check for unmatched brackets
  const openBraces = (trimmed.match(/\{/g) || []).length;
  const closeBraces = (trimmed.match(/\}/g) || []).length;
  const openBrackets = (trimmed.match(/\[/g) || []).length;
  const closeBrackets = (trimmed.match(/\]/g) || []).length;
  
  if (openBraces !== closeBraces) {
    issues.push(`Unmatched braces: ${openBraces} opening, ${closeBraces} closing`);
  }
  
  if (openBrackets !== closeBrackets) {
    issues.push(`Unmatched brackets: ${openBrackets} opening, ${closeBrackets} closing`);
  }
  
  // Check for truncated JSON (common with streaming responses)
  if (trimmed.endsWith(',') || trimmed.endsWith(':') || trimmed.match(/[{,]\s*$/)) {
    issues.push('Response appears to be truncated');
  }
  
  // Check for common incomplete patterns
  if (trimmed.includes('"processed_words":') && !trimmed.includes(']')) {
    issues.push('processed_words array appears incomplete');
  }
  
  // Try to parse
  try {
    JSON.parse(trimmed);
    return { isValid: true, issues: [], canAttemptFix: false };
  } catch (parseError) {
    issues.push(`JSON parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    
    // Determine if we can attempt to fix simple issues
    const canAttemptFix = (
      openBraces > closeBraces && openBraces - closeBraces <= 2
    ) || (
      openBrackets > closeBrackets && openBrackets - closeBrackets <= 2
    );
    
    return { isValid: false, issues, canAttemptFix };
  }
}

// Attempt to fix common JSON issues
function attemptJsonFix(jsonString: string): string {
  let fixed = jsonString.trim();
  
  // Count brackets and braces
  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;
  const openBrackets = (fixed.match(/\[/g) || []).length;
  const closeBrackets = (fixed.match(/\]/g) || []).length;
  
  // Add missing closing braces
  if (openBraces > closeBraces) {
    const missingBraces = openBraces - closeBraces;
    fixed += '}' .repeat(missingBraces);
  }
  
  // Add missing closing brackets
  if (openBrackets > closeBrackets) {
    const missingBrackets = openBrackets - closeBrackets;
    fixed += ']' .repeat(missingBrackets);
  }
  
  // Remove trailing commas
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  
  return fixed;
}

// Exponential backoff retry mechanism
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  logger?: (message: string) => void
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      if (attempt > 0 && logger) {
        logger(`Retry attempt ${attempt}/${config.maxRetries}`);
      }
      
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (logger) {
        logger(`Attempt ${attempt + 1} failed: ${lastError.message}`);
      }
      
      // Don't retry on abort errors
      if (lastError.name === 'AbortError') {
        throw lastError;
      }
      
      // Don't retry on certain critical errors
      if (lastError.message.includes('Authentication') ||
          lastError.message.includes('API key') ||
          lastError.message.includes('401')) {
        throw lastError;
      }
      
      if (attempt < config.maxRetries) {
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );
        
        if (logger) {
          logger(`Waiting ${delay}ms before retry...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

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
    // This list should be updated as new models are known.
    const knownToolSupportingModelPatterns = [
      "gpt-4", "gpt-3.5", // OpenAI
      "claude-3-opus", "claude-3-sonnet", "claude-3-haiku", // Anthropic
      "gemini", // Google
      // Add other patterns if known, e.g. specific OpenRouter model IDs that are known to be tool-capable
    ];
    effectiveModelSupportsTools = knownToolSupportingModelPatterns.some(name => modelIdentifier.toLowerCase().includes(name));
    console.log(`Model "${modelIdentifier}" determined to ${effectiveModelSupportsTools ? 'support' : 'not support'} tools based on heuristic.`);
  }

  const userContent = `Process the following Hebrew words/phrases: ${hebrewWords.join(', ')}`;

  try {
    let parsedArgs: { processed_words: LLMBatchResponseItem[] };

    // Create a new OpenAI client for each function call to avoid potential state issues
    const createOpenAIClient = () => {
      logger("Creating new OpenAI client instance");
      return new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
      });
    };

    if (effectiveModelSupportsTools) {
      // --- Logic for models supporting tools ---
      logger("Using TOOL-BASED approach for model: " + modelIdentifier);
      
      const completion = await retryWithBackoff(async () => {
        const openai = createOpenAIClient();
        
        logger("Making API call with tools...");
        return await openai.chat.completions.create({
          model: modelIdentifier,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          tools: [toolDefinition],
          tool_choice: { type: "function", function: { name: "save_hebrew_word_details" } },
          stream: false
        }, {
          signal: abortController?.signal
        });
      }, retryConfig, logger);

      if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message) {
        throw new Error('Invalid LLM response structure: No content or choices from the model (tool mode).');
      }
      const message = completion.choices[0].message;
      if (!message.tool_calls || !message.tool_calls[0] || message.tool_calls[0].type !== 'function') {
        // This can happen if the model decides not to use the tool, or if it doesn't support it well despite our heuristic.
        throw new Error('Invalid LLM response: Expected a function call, but model did not use tools as expected. Try a different model or verify tool support.');
      }
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
    } else {
      // --- Logic for models NOT supporting tools (direct JSON response) ---
      logger("Using DIRECT JSON approach for model: " + modelIdentifier);
      
      const completion = await retryWithBackoff(async () => {
        const openai = createOpenAIClient();
        
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

      if (!completion?.choices || !completion?.choices?.length || !completion?.choices[0]?.message || !completion.choices[0].message.content) {
        throw new Error('Invalid LLM response structure: No content in message from the model (direct JSON mode).');
      }
      const responseContent = completion?.choices[0].message.content;
      
      logger(`Received response content: ${responseContent.substring(0, 200)}...`);
      
      try {
        // Attempt to clean up potential markdown backticks
        const cleanedResponseContent = responseContent.replace(/^```json\s*|\s*```$/g, '');
        
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
      console.log('Request was aborted by user');
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
      category: 'אחר' as WordCategory,
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
