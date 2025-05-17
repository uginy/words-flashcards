import { DEFAULT_OPENROUTER_API_KEY, DEFAULT_OPENROUTER_MODEL } from '../config/openrouter';
import React, { useState, useEffect } from 'react';
import { parseAndTranslateWords } from '../utils/translation';
import { enrichWordsWithLLM } from '../services/openrouter';
import { Word } from '../types';
import { useToast } from '../hooks/use-toast';
import { useWordsStore } from '../store/wordsStore';

 
function chunkArray<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
}

 
function validateLLMWordsResponse(data: unknown): Word[] {
  if (Array.isArray(data)) {
    return data.filter((w: unknown) =>
      w !== null &&
      typeof w === 'object' &&
      typeof (w as any).hebrew === 'string' &&
      typeof (w as any).russian === 'string' &&
      typeof (w as any).transcription === 'string' &&
      typeof (w as any).category === 'string'
    ) as Word[];
  }
  if (!data || typeof data !== 'object' || !Array.isArray((data as any).words)) return [];
  return (data as any).words.filter((w: unknown) =>
    w !== null &&
    typeof w === 'object' &&
    typeof (w as any).hebrew === 'string' &&
    typeof (w as any).russian === 'string' &&
    typeof (w as any).transcription === 'string' &&
    typeof (w as any).category === 'string'
  ) as Word[];
}

const WordInput: React.FC = () => {
  const existingWords = useWordsStore(state => state.words);
  const addWords = useWordsStore(state => state.addWords);
  const { toast } = useToast();

  // Adapter for toast to map 'destructive' to 'error' and filter allowed variants
  const toastAdapter = (opts: { title: string; description: string; variant?: string }) => {
    const allowedVariants = [
      'default', 'success', 'error', 'info', 'warning', 'neutral',
      'primary', 'secondary', 'accent', 'successAlt', 'errorAlt',
      'infoAlt', 'warningAlt', 'neutralAlt', 'primaryAlt', 'secondaryAlt', 'accentAlt'
    ] as const;
    let mappedVariant: typeof allowedVariants[number] | undefined = undefined;
    if (opts.variant === 'destructive') mappedVariant = 'error';
    else if (opts.variant && allowedVariants.includes(opts.variant as any)) mappedVariant = opts.variant as typeof allowedVariants[number];
    toast({ ...opts, variant: mappedVariant });
  };
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedWordsText, setImportedWordsText] = useState<string | null>(null);

  // Check for imported words from Settings
  useEffect(() => {
    const importedWords = localStorage.getItem('importedWords');
    if (importedWords) {
      setImportedWordsText(importedWords);
    }
  }, []);

  const handleImportWords = () => {
    if (importedWordsText) {
      setInputText(importedWordsText);
      localStorage.removeItem('importedWords');
      setImportedWordsText(null);
      toast({
        title: "Успех!",
        description: 'Импортированные слова загружены в форму. Нажмите "Добавить" для завершения импорта.',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError(null);
    let wordsToAdd: Word[] = [];
    let failedWords: string[] = [];
    let pathTaken: 'structured' | 'llm' | 'none' = 'none';

    try {
      if (inputText.includes(' - ')) {
        pathTaken = 'structured';
        try {
          wordsToAdd = parseAndTranslateWords(inputText);
          if (!Array.isArray(wordsToAdd)) {
            throw new Error('Failed to parse words');
          }
        } catch (error) {
          setError('Failed to parse the input text. Please check the format.');
          setIsLoading(false);
          return;
        }
      } else {
        pathTaken = 'llm';
        const apiKey = localStorage.getItem('openRouterApiKey') || DEFAULT_OPENROUTER_API_KEY;
        const model = localStorage.getItem('openRouterModel') || DEFAULT_OPENROUTER_MODEL;
        if (!apiKey || !model || apiKey === "YOUR_DEFAULT_API_KEY_HERE" || model === "YOUR_DEFAULT_MODEL_ID_HERE") {
          setError('OpenRouter API key or model не настроены. Укажите их в Settings или пропишите значения по умолчанию.');
          setIsLoading(false);
          return;
        }
        // Split and clean input
        let hebrewWordsForLlm = inputText
          .split(/\r\n|\r|\n/)
          .map(line => line.trim())
          .filter(line => line.length > 0);
        if (hebrewWordsForLlm.length === 0) {
          setError('Нет слов для добавления. Пожалуйста, введите слова.');
          setIsLoading(false);
          return;
        }
        // Filter out duplicates
        const uniqueWords = hebrewWordsForLlm.filter(newWord =>
          !existingWords.some(existingWord => existingWord.hebrew === newWord)
        );
        if (uniqueWords.length === 0) {
          setError('Все указанные слова уже существуют в вашей коллекции.');
          setIsLoading(false);
          return;
        }
        if (uniqueWords.length < hebrewWordsForLlm.length) {
          const skippedCount = hebrewWordsForLlm.length - uniqueWords.length;
          toast({
            title: 'Информация',
            description: `Пропущено ${skippedCount} повторяющихся слов`,
          });
        }
        // Use only unique words for processing
        hebrewWordsForLlm = uniqueWords;

        // --- Новый блок: пакетная обработка чанками ---
        const chunkSize = 5;
        const chunks = chunkArray(hebrewWordsForLlm, chunkSize);
        let allValidWords: Word[] = [];
        let allFailed: string[] = [];
        for (const chunk of chunks) {
          try {
            const result = await enrichWordsWithLLM(chunk, apiKey, model);
            // enrichWordsWithLLM теперь всегда возвращает массив слов или выбрасывает ошибку
            const valid = validateLLMWordsResponse(result);
            
            if (valid.length === 0) {
              console.warn('LLM вернул пустой или невалидный ответ для чанка:', chunk);
              toast({
                title: 'Предупреждение',
                description: `Не удалось обработать некоторые слова корректно: ${chunk.join(', ')}`,
                variant: 'warning'
              });
            }
            
            const chunkFailed = chunk.filter(w => !valid.some(v => v.hebrew === w));
            allValidWords = allValidWords.concat(valid);
            allFailed = allFailed.concat(chunkFailed);
          } catch (err) {
            console.error('Ошибка при обработке чанка:', chunk, err);
            toast({
              title: 'Предупреждение',
              description: `Ошибка при обработке: ${err instanceof Error ? err.message : String(err)}`,
              variant: 'warning'
            });
            allFailed = allFailed.concat(chunk);
          }
        }
        wordsToAdd = allValidWords;
        failedWords = allFailed;
      }

      if (wordsToAdd.length > 0) {
        await addWords(wordsToAdd, toastAdapter);
        setInputText('');
        if (failedWords.length === 0) {
          toast({
            title: 'Успех!',
            variant: 'success',
            description: `Все ${wordsToAdd.length} слов успешно добавлены!`,
            duration: 5000,
          });
        } else {
          toast({
            title: 'Частичный успех',
            description: `Добавлено ${wordsToAdd.length} слов, не удалось обработать: ${failedWords.join(', ')}`,
            duration: 6000,
          });
        }
      }
      if (failedWords.length > 0) {
        setError(`Не удалось обработать: ${failedWords.join(', ')}`);
      } else if (wordsToAdd.length === 0) {
        if (!error) {
          if (pathTaken === 'llm') {
            setError('LLM processing completed, but no information could be generated for any of the words. Пожалуйста, проверьте слова или попробуйте другую модель.');
          } else if (pathTaken === 'structured') {
            setError('Input was processed, but no words could be extracted. Проверьте формат ввода.');
          } else {
            setError('No words were processed. Пожалуйста, проверьте ввод.');
          }
        }
      }
    } catch (err) {
      console.error('Error processing words:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault(); // Prevent default paste behavior
    const paste = e.clipboardData.getData('text');
    setInputText(paste);
  };

  const sampleText = `שלום
תודה רבה
ספר טוב
ללמוד
ללכת
לאכול
לשתות
לדבר
`;

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      {importedWordsText && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 mb-2">Обнаружены импортированные слова!</p>
          <button
            type="button"
            onClick={handleImportWords}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Импортировать слова
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium text-gray-800">Добавить слова</h3>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-3 p-3 bg-red-100 text-red-700 border border-red-400 rounded-md">
              <p className="font-semibold">Ошибка:</p>
              <p>{error}</p>
            </div>
          )}
          <div className="mb-3">
            <label htmlFor="wordInput" className="block text-sm font-medium text-gray-700 mb-1">
              Добавляйте список слов, каждое слово должно быть на новой строке. Мы сами проанализируем его и корректно добавим в базу.
            </label>
            <textarea
              id="wordInput"
              rows={6}
              className="w-full px-3 py-2 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onPaste={handlePaste}
              dir="auto" // Changed to auto to better support mixed LTR/RTL for instructions and RTL for Hebrew
              placeholder="Введите слова на иврите, каждое слово на новой строке..."
            />
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm mb-3">
            <button
              type="button"
              className="text-blue-500 hover:text-blue-700"
              onClick={() => {
                setInputText(sampleText);
                setError(null); // Clear error when using sample
              }}
            >
              Использовать пример
            </button>
            <span className="text-gray-400">|</span>
            <button
              type="button"
              className="text-blue-500 hover:text-blue-700"
              onClick={() => {
                setInputText('');
                setError(null); // Clear error when clearing input
              }}
            >
              Очистить
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="py-2 px-4 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
              disabled={isLoading || !inputText.trim()}
            >
              {isLoading ? 'Обработка...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WordInput;
