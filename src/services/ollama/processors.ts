import type { Word, WordCategory, LLMBatchResponseItem } from '../openrouter/types';

// Ollama-specific processor that matches by array position instead of hebrew field
export function processWordsArrayOllama(llmItems: LLMBatchResponseItem[], originalWords: string[]): Word[] {
  const finalWords: Word[] = [];

  for (let i = 0; i < originalWords.length; i++) {
    const originalWord = originalWords[i];
    const llmItem = llmItems[i]; // Match by position instead of hebrew field

    if (!llmItem || typeof llmItem !== 'object') {
      console.warn(`No LLM item at position ${i} for word "${originalWord}". Adding minimal entry.`);
      finalWords.push(createMinimalWord(originalWord));
      continue;
    }

    const transcription = String(llmItem.transcription || '').trim();
    const russian = String(llmItem.russian || '').trim();
    const categoryInput = String(llmItem.category || 'אחר');
    const category: WordCategory = ['פועל', 'שם עצם', 'שם תואר', 'פרזות', 'אחר'].includes(categoryInput) ? categoryInput as WordCategory : 'אחר';

    // Validate that we have meaningful transcription and russian
    if (!transcription || !russian) {
      console.warn(`LLM item at position ${i} missing transcription (${transcription}) or russian (${russian}) for word "${originalWord}". Adding minimal entry.`);
      finalWords.push(createMinimalWord(originalWord));
      continue;
    }

    // Process conjugations with validation to filter out non-Hebrew conjugations
    const llmConjugations = llmItem.conjugations;
    let finalWordConjugations: {
      past: { [key: string]: string } | null;
      present: { [key: string]: string } | null;
      future: { [key: string]: string } | null;
      imperative: { [key: string]: string } | null;
    } | null | undefined;

    // Helper function to check if text contains Hebrew characters
    const hasHebrewCharacters = (text: string): boolean => {
      return /[\u0590-\u05FF]/.test(text);
    };

    // Helper function to check if text contains Cyrillic characters (Russian)
    const hasCyrillicCharacters = (text: string): boolean => {
      return /[\u0400-\u04FF]/.test(text);
    };

    // Helper function to validate and clean conjugation object
    const validateConjugationObject = (obj: { [key: string]: string } | null): { [key: string]: string } | null => {
      if (!obj || typeof obj !== 'object') return null;
      
      const cleaned: { [key: string]: string } = {};
      let hasValidConjugations = false;
      
      for (const [pronoun, conjugation] of Object.entries(obj)) {
        if (typeof conjugation === 'string' && conjugation.trim()) {
          const cleanConjugation = conjugation.trim();
          // Only accept conjugations that contain Hebrew and don't contain Cyrillic
          if (hasHebrewCharacters(cleanConjugation) && !hasCyrillicCharacters(cleanConjugation)) {
            cleaned[pronoun] = cleanConjugation;
            hasValidConjugations = true;
          } else {
            console.warn(`Filtered out invalid conjugation for ${pronoun}: "${cleanConjugation}" (contains non-Hebrew characters)`);
          }
        }
      }
      
      return hasValidConjugations ? cleaned : null;
    };

    if (llmConjugations === null) {
      finalWordConjugations = null;
    } else if (llmConjugations && typeof llmConjugations === 'object') {
      finalWordConjugations = {
        past: validateConjugationObject(llmConjugations.past),
        present: validateConjugationObject(llmConjugations.present),
        future: validateConjugationObject(llmConjugations.future),
        imperative: validateConjugationObject(llmConjugations.imperative),
      };
      
      // If all conjugation objects are null, set the whole thing to null
      const hasAnyValidConjugations = Object.values(finalWordConjugations).some(tense => tense !== null);
      if (!hasAnyValidConjugations) {
        console.warn(`All conjugations filtered out for word "${originalWord}" - setting conjugations to null`);
        finalWordConjugations = null;
      }
    } else {
      finalWordConjugations = undefined;
    }

    // Process examples
    const llmExamples = llmItem.examples;
    let finalWordExamples: { hebrew: string; russian: string }[] | null | undefined;
    if (llmExamples === null) {
      finalWordExamples = null;
    } else if (Array.isArray(llmExamples)) {
      finalWordExamples = llmExamples.filter((ex): ex is { hebrew: string; russian: string } =>
        ex && typeof ex === 'object' &&
        'hebrew' in ex && 'russian' in ex &&
        typeof ex.hebrew === 'string' &&
        typeof ex.russian === 'string' &&
        ex.hebrew.trim() !== '' && ex.russian.trim() !== ''
      );
    } else {
      finalWordExamples = [];
    }

    console.log(`Successfully processed word "${originalWord}" at position ${i}: transcription="${transcription}", russian="${russian}", category="${category}"`);

    finalWords.push({
      id: String(Date.now()) + Math.random().toString(36).substring(2, 9),
      hebrew: originalWord, // Use original word instead of LLM response
      transcription,
      russian,
      category,
      conjugations: finalWordConjugations,
      examples: finalWordExamples || [],
      showTranslation: false,
      isLearned: false,
      learningStage: 0,
      lastReviewed: null,
      nextReview: null,
      dateAdded: Date.now(),
    });
  }

  return finalWords;
}

// Helper function to create minimal word entry
function createMinimalWord(hebrew: string): Word {
  return {
    id: String(Date.now()) + Math.random().toString(36).substring(2, 9),
    hebrew,
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
  };
}
