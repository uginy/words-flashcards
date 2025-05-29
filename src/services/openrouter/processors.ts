import type { Word, WordCategory, LLMBatchResponseItem } from './types';

// Helper function to process the array of words from LLM and map to Word[]
export function processWordsArray(llmItems: LLMBatchResponseItem[], originalWords: string[]): Word[] {
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