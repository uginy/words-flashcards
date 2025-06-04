import type { Dialog, DialogGenerationSettings, Word } from '../types';
import { generateDialogWithOpenRouter } from './openrouter/dialog-generation';

/**
 * Main service for dialog generation with LLM integration
 */

export interface DialogGenerationOptions {
  abortController?: AbortController;
  onProgress?: (progress: number) => void;
}

export interface DialogValidationError {
  field: string;
  message: string;
}

/**
 * Generate dialog using LLM integration
 */
export async function generateDialog(
  settings: DialogGenerationSettings,
  apiKey: string,
  model: string,
  options?: DialogGenerationOptions
): Promise<Dialog> {
  if (!settings || !apiKey || !model) {
    throw new Error('Missing required parameters for dialog generation');
  }

  // Validate settings
  const validationErrors = validateDialogSettings(settings);
  if (validationErrors.length > 0) {
    throw new Error(`Invalid settings: ${validationErrors.map(e => e.message).join(', ')}`);
  }

  // Update progress
  options?.onProgress?.(10);

  try {
    // Generate dialog using OpenRouter integration
    const dialog = await generateDialogWithOpenRouter(
      settings,
      apiKey,
      model,
      options
    );

    // Update progress
    options?.onProgress?.(80);

    // Validate generated dialog
    const dialogValidation = validateDialogContent(dialog);
    if (!dialogValidation.isValid) {
      throw new Error(`Generated dialog is invalid: ${dialogValidation.errors.join(', ')}`);
    }

    // Update progress
    options?.onProgress?.(100);

    return dialog;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    throw new Error(`Dialog generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate dialog generation settings
 */
function validateDialogSettings(settings: DialogGenerationSettings): DialogValidationError[] {
  const errors: DialogValidationError[] = [];

  if (!settings.level) {
    errors.push({ field: 'level', message: 'Dialog level is required' });
  }

  if (!['אלף', 'בית', 'גימל', 'דלת', 'הא'].includes(settings.level)) {
    errors.push({ field: 'level', message: 'Invalid dialog level' });
  }

  if (!settings.participantCount || ![2, 3].includes(settings.participantCount)) {
    errors.push({ field: 'participantCount', message: 'Participant count must be 2 or 3' });
  }

  if (!settings.participants || settings.participants.length !== settings.participantCount) {
    errors.push({ 
      field: 'participants', 
      message: `Number of participants must match participantCount (${settings.participantCount})` 
    });
  }

  // Validate participants
  if (settings.participants) {
    settings.participants.forEach((participant, index) => {
      if (!participant.id) {
        errors.push({ field: `participants[${index}].id`, message: 'Participant ID is required' });
      }
      if (!participant.name) {
        errors.push({ field: `participants[${index}].name`, message: 'Participant name is required' });
      }
      if (!['male', 'female'].includes(participant.gender)) {
        errors.push({ field: `participants[${index}].gender`, message: 'Invalid participant gender' });
      }
    });
  }

  if (settings.useExistingWords && settings.wordsToUse && settings.wordsToUse.length === 0) {
    errors.push({ field: 'wordsToUse', message: 'No words selected for use in dialog' });
  }

  return errors;
}

/**
 * Validate generated dialog content
 */
export function validateDialogContent(dialog: Dialog): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!dialog.id) {
    errors.push('Dialog ID is missing');
  }

  if (!dialog.title) {
    errors.push('Dialog title is missing');
  }

  if (!dialog.titleRu) {
    errors.push('Dialog Russian title is missing');
  }

  if (!['אלף', 'בית', 'גימל', 'דלת', 'הא'].includes(dialog.level)) {
    errors.push('Invalid dialog level');
  }

  if (!dialog.participants || dialog.participants.length < 2) {
    errors.push('Dialog must have at least 2 participants');
  }

  if (!dialog.cards || dialog.cards.length === 0) {
    errors.push('Dialog must have at least one card');
  }

  // Validate participants
  if (dialog.participants) {
    const participantIds = new Set();
    dialog.participants.forEach((participant, index) => {
      if (!participant.id) {
        errors.push(`Participant ${index + 1} is missing ID`);
      } else if (participantIds.has(participant.id)) {
        errors.push(`Duplicate participant ID: ${participant.id}`);
      } else {
        participantIds.add(participant.id);
      }

      if (!participant.name) {
        errors.push(`Participant ${index + 1} is missing name`);
      }

      if (!['male', 'female'].includes(participant.gender)) {
        errors.push(`Participant ${index + 1} has invalid gender`);
      }
    });
  }

  // Validate cards
  if (dialog.cards) {
    const participantIds = new Set(dialog.participants?.map(p => p.id) || []);
    
    dialog.cards.forEach((card, index) => {
      if (!card.id) {
        errors.push(`Card ${index + 1} is missing ID`);
      }

      if (!card.hebrew) {
        errors.push(`Card ${index + 1} is missing Hebrew text`);
      }

      if (!card.russian) {
        errors.push(`Card ${index + 1} is missing Russian translation`);
      }

      if (!card.speaker) {
        errors.push(`Card ${index + 1} is missing speaker`);
      } else if (!participantIds.has(card.speaker)) {
        errors.push(`Card ${index + 1} has invalid speaker ID: ${card.speaker}`);
      }

      if (typeof card.order !== 'number' || card.order < 0) {
        errors.push(`Card ${index + 1} has invalid order`);
      }
    });

    // Check for duplicate card orders
    const orders = dialog.cards.map(c => c.order);
    const duplicateOrders = orders.filter((order, index) => orders.indexOf(order) !== index);
    if (duplicateOrders.length > 0) {
      errors.push(`Duplicate card orders found: ${duplicateOrders.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Process and clean LLM response for dialog generation
 */
export function processDialogResponse(response: string): unknown {
  try {
    // Remove any markdown formatting
    const cleanedResponse = response
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    // Parse JSON
    const parsed = JSON.parse(cleanedResponse);

    // Validate basic structure
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Response is not a valid object');
    }

    return parsed;
  } catch (error) {
    throw new Error(`Failed to process dialog response: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Build dialog generation prompt based on settings
 */
export function buildDialogPrompt(settings: DialogGenerationSettings, existingWords?: Word[]): string {
  const levelDescriptions = {
    אלף: 'Beginner (basic words and simple sentences)',
    בית: 'Elementary (common phrases and basic grammar)',
    גימל: 'Intermediate (complex sentences and varied vocabulary)',
    דלת: 'Advanced (sophisticated language and idioms)',
    הא: 'Expert (complex literary and professional language)'
  };

  const participantNames = settings.participants.map(p => `${p.name} (${p.gender})`).join(', ');
  
  let wordsContext = '';
  if (settings.useExistingWords && existingWords && existingWords.length > 0) {
    const wordsToInclude = settings.wordsToUse 
      ? existingWords.filter(w => settings.wordsToUse?.includes(w.id))
      : existingWords.slice(0, 10); // Limit to prevent prompt overflow
      
    wordsContext = `\n\nInclude these Hebrew words naturally in the dialog:\n${wordsToInclude.map(w => `- ${w.hebrew} (${w.russian})`).join('\n')}`;
  }

  const topicContext = settings.topic ? `\n\nDialog topic: ${settings.topic}` : '';

  return `Generate a Hebrew dialog for language learning with the following requirements:

**Level**: ${settings.level} - ${levelDescriptions[settings.level]}
**Participants**: ${participantNames}
**Number of exchanges**: 6-8 lines total${topicContext}${wordsContext}

**Requirements**:
1. Create natural, realistic conversation appropriate for the level
2. Each line should be meaningful and contribute to the conversation
3. Include both Hebrew text and Russian translation for each line
4. Assign each line to the appropriate participant
5. Use level-appropriate vocabulary and grammar
6. Make the dialog engaging and educational

**Output format** (JSON):
{
  "title": "Dialog title in Hebrew",
  "titleRu": "Dialog title in Russian", 
  "topic": "Brief topic description in Russian",
  "cards": [
    {
      "hebrew": "Hebrew text",
      "russian": "Russian translation",
      "speaker": "${settings.participants[0].id}",
      "order": 0
    },
    // ... more cards
  ]
}

Generate a complete, coherent dialog that flows naturally between the participants.`;
}

// Legacy export for compatibility
export const generateDialogWithLLM = generateDialog;