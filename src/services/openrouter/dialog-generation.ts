import type { Dialog, DialogGenerationSettings, DialogCard, Word } from '../../types';
import { createOpenAIClient, retryWithBackoff } from './api-client';
import { processDialogResponse, buildDialogPrompt } from '../dialogGeneration';
import type { RetryConfig } from './types';

/**
 * OpenRouter integration for dialog generation
 */

export interface DialogGenerationOptions {
  abortController?: AbortController;
  onProgress?: (progress: number) => void;
  retryConfig?: Partial<RetryConfig>;
}

// Default retry configuration for dialog generation
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};

/**
 * Generate dialog using OpenRouter API
 */
export async function generateDialogWithOpenRouter(
  settings: DialogGenerationSettings,
  apiKey: string,
  model: string,
  options?: DialogGenerationOptions
): Promise<Dialog> {
  const client = createOpenAIClient(apiKey);
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...(options?.retryConfig || {}) };

  // Get existing words for context if needed
  let existingWords: Word[] = [];
  if (settings.useExistingWords && settings.wordsToUse) {
    // In a real implementation, this would fetch from the words store
    // For now, we'll work with the provided word IDs
    existingWords = []; // TODO: fetch actual words
  }

  const prompt = buildDialogPrompt(settings, existingWords);
  
  options?.onProgress?.(30);

  const operation = async () => {
    if (options?.abortController?.signal.aborted) {
      throw new Error('Operation was aborted');
    }

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: getDialogGenerationSystemPrompt(settings.level)
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    if (!response.choices[0]?.message?.content) {
      throw new Error('Empty response from OpenRouter');
    }

    return response.choices[0].message.content;
  };

  try {
    options?.onProgress?.(50);

    const rawResponse = await retryWithBackoff(
      operation,
      retryConfig,
      (message) => console.log(`Dialog generation: ${message}`)
    );

    options?.onProgress?.(70);

    // Process the response
    const dialogData = processDialogResponse(rawResponse);
    
    // Transform to Dialog format
    const dialog = transformToDialog(dialogData, settings);

    options?.onProgress?.(90);

    return dialog;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    throw new Error(`OpenRouter dialog generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

interface DialogDataResponse {
  title: string;
  titleRu: string;
  cards: Array<{
    hebrew: string;
    russian: string;
    speaker: string;
    order?: number;
  }>;
}

/**
 * Transform API response to Dialog format
 */
function transformToDialog(dialogData: unknown, settings: DialogGenerationSettings): Dialog {
  if (!dialogData || typeof dialogData !== 'object') {
    throw new Error('Invalid dialog data structure');
  }

  const data = dialogData as DialogDataResponse;
  const { title, titleRu, cards } = data;

  if (!title || !titleRu || !Array.isArray(cards)) {
    throw new Error('Missing required dialog fields: title, titleRu, or cards');
  }

  // Generate unique ID
  const dialogId = `dialog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create name-to-ID mapping for participants
  const participantNameToId = new Map<string, string>();
  settings.participants.forEach(participant => {
    participantNameToId.set(participant.name, participant.id);
  });

  // Transform cards and map speaker names to IDs
  const dialogCards: DialogCard[] = cards.map((card, index: number) => {
    if (!card.hebrew || !card.russian || !card.speaker) {
      throw new Error(`Invalid card data at index ${index}`);
    }

    // Map speaker name to participant ID
    const speakerId = participantNameToId.get(card.speaker);
    if (!speakerId) {
      throw new Error(`Unknown speaker "${card.speaker}" in card ${index + 1}. Available participants: ${settings.participants.map(p => p.name).join(', ')}`);
    }

    return {
      id: `card_${dialogId}_${index}`,
      hebrew: card.hebrew,
      russian: card.russian,
      speaker: speakerId,
      order: card.order ?? index
    };
  });

  // Sort cards by order
  dialogCards.sort((a, b) => a.order - b.order);

  const dialog: Dialog = {
    id: dialogId,
    title,
    titleRu,
    level: settings.level,
    participants: settings.participants,
    cards: dialogCards,
    isLearned: false,
    learningStage: 0,
    dateAdded: Date.now(),
    lastReviewed: null,
    nextReview: null,
    showTranslation: false,
    usedWords: settings.wordsToUse || [],
    newWords: [] // TODO: extract new words from dialog content
  };

  return dialog;
}

/**
 * Get system prompt for dialog generation based on level
 */
function getDialogGenerationSystemPrompt(level: string): string {
  const levelInstructions = {
    אלף: 'Use very simple Hebrew words and basic sentence structures. Focus on present tense and common everyday vocabulary. Keep sentences short and clear.',
    בית: 'Use simple Hebrew with some past and future tense. Include common phrases and basic conversational patterns. Vocabulary should be elementary but practical.',
    גימל: 'Use intermediate Hebrew with varied tenses and more complex sentences. Include some idiomatic expressions and intermediate vocabulary.',
    דלת: 'Use advanced Hebrew with sophisticated grammar, complex sentences, and varied vocabulary. Include literary expressions and professional terminology.',
    הא: 'Use expert-level Hebrew with complex linguistic structures, rare vocabulary, advanced idioms, and sophisticated literary or academic language.'
  };

  return `You are a Hebrew language expert creating educational dialogs for language learners.

**Your task**: Generate a natural, educational Hebrew dialog appropriate for the specified level.

**Level-specific instructions**: ${levelInstructions[level as keyof typeof levelInstructions] || levelInstructions.אלף}

**Requirements**:
1. Create realistic, engaging conversation between the specified participants
2. Each line should feel natural and contribute to the dialog flow
3. Use vocabulary and grammar appropriate for the learning level
4. Provide accurate Russian translations for each Hebrew line
5. Ensure proper speaker attribution for each line
6. Make the dialog educational while keeping it entertaining

**Output format**: Return ONLY a valid JSON object with this exact structure:
{
  "title": "Dialog title in Hebrew",
  "titleRu": "Dialog title in Russian",
  "cards": [
    {
      "hebrew": "Hebrew text for this line",
      "russian": "Russian translation",
      "speaker": "participant_id",
      "order": 0
    }
  ]
}

**Important**:
- Use only the participant IDs provided in the user prompt
- Hebrew text should be natural and level-appropriate
- Russian translations should be accurate and natural
- Order should start from 0 and increment sequentially
- Do not include any text outside the JSON object
- Do not wrap the JSON in markdown code blocks`;
}