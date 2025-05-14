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
  'להתלבט בין לבין': { russian: 'колебаться между', transcription: 'леитлабет бейн лебейн', category: 'verb', conjugation: 'מתלבט, התלבט, יתלבט' },
  'להתחרט על': { russian: 'сожалеть о', transcription: 'леитхарет аль', category: 'verb', conjugation: 'מתחרט, התחרט, יתחרט' },
  'להציע את ל': { russian: 'предлагать кому-либо', transcription: 'леациа эт ле', category: 'verb', conjugation: 'מציע, הציע, יציע' },
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
  // Basic parsing - split by whitespace and filter out empty strings
  const hebrewWords = text
    .split(/\s+/)
    .filter(word => word.trim().length > 0 && /[\u0590-\u05FF]/.test(word)); // Filter Hebrew characters
  
  return hebrewWords.map(hebrew => {
    const translation = sampleTranslations[hebrew] || {
      russian: `[Нужен перевод]`,
      transcription: `[Нужна транскрипция]`,
      category: 'other',
    };
    
    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      hebrew,
      russian: translation.russian,
      transcription: translation.transcription,
      category: translation.category,
      conjugation: translation.conjugation,
      learned: false,
      dateAdded: Date.now(),
    };
  });
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