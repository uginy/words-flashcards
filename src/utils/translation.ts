import { Word, WordCategory } from '../types';

// Function to parse and translate a list of Hebrew words from a structured text input
export const parseAndTranslateWords = (text: string): Word[] => {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const newWords: Word[] = [];

  lines.forEach(line => {
    const parts = line.split(' - ').map(part => part.trim());
    if (parts.length < 4) {
      console.warn(`Skipping malformed line: ${line}`);
      return; // Expect at least category, hebrew, transcription, russian
    }

    const [categoryStr, hebrew, transcription, russian, conjugations, example] = parts;

    let category: WordCategory;
    switch (categoryStr.toLowerCase()) {
      case 'verb':
      case 'глагол':
        category = 'פועל';
        break;
      case 'noun':
      case 'существительное':
        category = 'שם עצם';
        break;
      case 'adjective':
      case 'прилагательное':
        category = 'שם תואר';
        break;
      default:
        category = 'אחר';
    }

    // Basic validation for Hebrew characters in the Hebrew field
    if (!/[\u0590-\u05FF]/.test(hebrew)) {
      console.warn(`Skipping line with potentially non-Hebrew word in 'hebrew' field: ${line}`);
      return;
    }

    newWords.push({
      id: Date.now().toString() + Math.random().toString(36).substring(2, 11), // Ensure unique ID
      hebrew,
      russian,
      transcription,
      category,
      conjugations: conjugations ? JSON.parse(conjugations) as Word['conjugations'] : undefined,
      examples: example ? [{ hebrew: hebrew, russian: example }] : undefined,
      isLearned: false, // Corrected from 'learned' to 'isLearned'
      dateAdded: Date.now(),
    });
  });

  return newWords;
};

// Removed categorizeWord function as it is no longer used.