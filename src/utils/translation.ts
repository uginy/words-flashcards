import { Word, WordCategory } from '../types';

// Sample translations for the provided words
const sampleTranslations: Record<string, { russian: string; transcription: string; category: WordCategory; conjugation?: string }> = {
  'ניסיון': { russian: 'опыт', transcription: 'нисайон', category: 'noun' },
  'מוצר': { russian: 'продукт', transcription: 'муцар', category: 'noun' },
  'מידע': { russian: 'информация', transcription: 'мэйда', category: 'noun' },
  'כמות': { russian: 'количество', transcription: 'камут', category: 'noun' },
  'אחריות': { russian: 'ответственность', transcription: 'ахрают', category: 'noun' },
  'יכולת': { russian: 'способность', transcription: 'йехолет', category: 'noun' },
  'להשפיע על': { russian: 'влиять на', transcription: 'леашпиа аль', category: 'verb', conjugation: 'משפיע, השפיע, ישפיע' },
  'לבחור ב, את': { russian: 'выбирать', transcription: 'ливхор', category: 'verb', conjugation: 'בוחר, בחר, יבחר' },
  'להתלבט בין לבין': { russian: 'колебаться между', transcription: 'להתלבט בין לבין', category: 'verb', conjugation: 'מתלבט, התלבט, יתלבט' },
  'להתחרט על': { russian: 'сожалеть о', transcription: 'להתחרט על', category: 'verb', conjugation: 'מתחרט, התחרט, יתחרט' },
  'להציע את ל': { russian: 'предлагать кому-либо', transcription: 'להציע את ל', category: 'verb', conjugation: 'מציע, הציע, יציע' },
  'להתבגר': { russian: 'взрослеть', transcription: 'леитבагер', category: 'verb', conjugation: 'מתבגר, התבגר, יתבגר' },
  'להתווכח': { russian: 'спорить', transcription: 'леитвакеах', category: 'verb', conjugation: 'מתווכח, התווכח, יתווכח' },
  'להתרכז': { russian: 'концентрироваться', transcription: 'леитракез', category: 'verb', conjugation: 'מתרכז, התרכז, יתרכז' },
  'מתבגר-ת': { russian: 'взрослеющий(-ая)', transcription: 'митбагер-эт', category: 'adjective' },
  'אחראי-ת': { russian: 'ответственный(-ая)', transcription: 'ахраи-т', category: 'adjective' },
  'מוכשר-ת': { russian: 'талантливый(-ая)', transcription: 'мухшар-эт', category: 'adjective' },
  'מבולבל-ת': { russian: 'запутанный(-ая)', transcription: 'мевульбаль-эт', category: 'adjective' },
  'מרוכז-ת': { russian: 'сосредоточенный(-ая)', transcription: 'меруказ-эт', category: 'adjective' },
  'היכן': { russian: 'где', transcription: 'эйхан', category: 'other' },
};

// Function to parse and translate a list of Hebrew words
export const parseAndTranslateWords = (text: string): Word[] => {
  let remainingText = text;
  const foundWords: Word[] = [];
  const phraseKeys = Object.keys(sampleTranslations).sort((a, b) => b.length - a.length); // Sort by length to match longer phrases first

  phraseKeys.forEach(phrase => {
    // Use a regex to find whole word matches of the phrase
    // The regex \\b might not work well with Hebrew characters on its own, 
    // so we ensure spaces or start/end of string around the phrase.
    // We also need to escape special regex characters in the phrase.
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    const regex = new RegExp(`(^|\\\\s)${escapedPhrase}(\\\\s|$)`, 'g');
    let match;
    while ((match = regex.exec(remainingText)) !== null) {
      const translation = sampleTranslations[phrase];
      if (translation) {
        foundWords.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          hebrew: phrase,
          russian: translation.russian,
          transcription: translation.transcription,
          category: translation.category,
          conjugation: translation.conjugation,
          learned: false,
          dateAdded: Date.now(),
        });
        // Replace the found phrase with spaces to mark it as processed
        // and maintain indices for subsequent matches, then collapse multiple spaces.
        remainingText = remainingText.substring(0, match.index) + ' '.repeat(phrase.length) + remainingText.substring(match.index + phrase.length);
      }
    }
  });
  remainingText = remainingText.replace(/\\s+/g, ' ').trim();


  // Process remaining single words
  const singleWords = remainingText
    .split(/\\s+/)
    .filter(word => word.trim().length > 0 && /[\\u0590-\\u05FF]/.test(word)); // Filter Hebrew characters

  singleWords.forEach(hebrew => {
    // Avoid adding if it was part of a phrase already processed (or if it's a placeholder space)
    if (foundWords.some(fw => fw.hebrew.includes(hebrew)) && sampleTranslations[hebrew] === undefined) {
        // This check is a bit tricky because a single word might also be a phrase.
        // We only skip if it's truly just a part of an already processed longer phrase.
        // However, the replacement with spaces should mostly handle this.
        // A more robust way would be to check if the original text at this word's position was part of a longer phrase.
        // For now, we assume that if a single word is also a key in sampleTranslations, it should be added.
    }

    const translation = sampleTranslations[hebrew] || {
      russian: `[Нужен перевод]`,
      transcription: `[Нужна транскрипция]`,
      category: categorizeWord(hebrew), // Use categorizeWord for single words not in phrases
    };
    
    // Ensure not to add duplicates if a word is both a standalone entry and part of a phrase that wasn't fully matched.
    if (!foundWords.some(fw => fw.hebrew === hebrew)) {
      foundWords.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        hebrew,
        russian: translation.russian,
        transcription: translation.transcription,
        category: translation.category,
        conjugation: translation.conjugation,
        learned: false,
        dateAdded: Date.now(),
      });
    }
  });
  
  return foundWords;
};

// Categorize a word based on its features (simplified for demo)
export const categorizeWord = (word: string): WordCategory => {
  if (word.startsWith('ל')) {
    return 'verb';
  } else if (/ת$/.test(word) || word.includes('-')) {
    return 'adjective';
  } else {
    return 'noun';
  }
};