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

    const [categoryStr, hebrew, transcription, russian, conjugation, example] = parts;

    let category: WordCategory;
    switch (categoryStr.toLowerCase()) {
      case 'verb':
      case 'глагол':
        category = 'verb';
        break;
      case 'noun':
      case 'существительное':
        category = 'noun';
        break;
      case 'adjective':
      case 'прилагательное':
        category = 'adjective';
        break;
      default:
        category = 'other';
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
      conjugation: conjugation || undefined,
      example: example || undefined,
      learned: false,
      dateAdded: Date.now(),
    });
  });

  return newWords;
};

// CategorizeWord might be less relevant if category is always provided,
// but can be kept as a utility or for other purposes.
export const categorizeWord = (word: string): WordCategory => {
  // This logic might need adjustment or could be deprecated
  // if categories are strictly enforced by the input format.
  if (word.startsWith('ל')) {
    return 'verb';
  }
  if (/[ת]$/.test(word) || word.includes('-')) {
    return 'adjective';
  }
  return 'noun'; // Defaulting to noun, adjust as needed
};