import React, { useState, useEffect } from 'react';
import { parseAndTranslateWords } from '../utils/translation';
import { enrichWordsWithLLM } from '../services/openrouter';
import { Word } from '../types';
import { toast } from 'react-hot-toast';

interface WordInputProps {
  onAddWords: (words: Word[]) => void;
}

const WordInput: React.FC<WordInputProps> = ({ onAddWords }) => {
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
      toast.success('Импортированные слова загружены в форму. Нажмите "Добавить" для завершения импорта.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);
    let wordsToAdd: Word[] = [];
    let pathTaken: 'structured' | 'llm' | 'none' = 'none';
    let hebrewWordsForLlm: string[] = []; // Declare here for wider scope

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
        const apiKey = localStorage.getItem('openRouterApiKey');
        const model = localStorage.getItem('openRouterModel');

        if (!apiKey || !model) {
          setError('OpenRouter API key or model not configured in Settings.');
          setIsLoading(false);
          return;
        }

        // Assign to the higher-scoped variable
        // console.log('[WordInput] Raw inputText before split:', JSON.stringify(inputText)); // DEBUG RAW INPUT - Removed for brevity
        hebrewWordsForLlm = inputText
          .split(/\r\n|\r|\n/) // Split by any common newline sequence
          .map(line => line.trim())
          .filter(line => line.length > 0);
        console.log('[WordInput] Number of lines after split, trim, filter:', hebrewWordsForLlm.length, hebrewWordsForLlm); // DEBUG - Renamed log for clarity
        if (hebrewWordsForLlm.length === 0) {
          setError('No Hebrew words provided for enrichment. Please enter some words.');
          setIsLoading(false);
          return;
        }
        
        try {
          // Use the higher-scoped variable
          const enrichedWordsArray = await enrichWordsWithLLM(hebrewWordsForLlm, apiKey, model);
          console.log('[WordInput] Number of words received from LLM processing:', enrichedWordsArray.length, enrichedWordsArray); // DEBUG - Renamed log for clarity
          wordsToAdd = enrichedWordsArray;

          if (wordsToAdd.length < hebrewWordsForLlm.length) {
            const successfullyProcessedCount = wordsToAdd.length;
            const failedCount = hebrewWordsForLlm.length - successfullyProcessedCount;
            setError(
              `Processed ${hebrewWordsForLlm.length} words. ` +
              `${successfullyProcessedCount} added successfully. ` +
              `${failedCount} word(s) could not be enriched (e.g., missing info or LLM error). Check console for details.`
            );
          } else if (wordsToAdd.length === 0 && hebrewWordsForLlm.length > 0) {
             setError('LLM processing completed, but no information could be generated for any of the words. Please check the words or try a different LLM model.');
          }

        } catch (batchError) {
          console.error('Error enriching words in batch:', batchError);
          setError(`Batch LLM enrichment failed: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`);
        }
      }

      if (wordsToAdd.length > 0) {
        onAddWords(wordsToAdd);
        setInputText('');
      } else { // wordsToAdd is empty
        if (!error) { // And no specific error was set during the process
          if (pathTaken === 'llm') {
            setError('LLM processing completed, but no information could be generated for any of the words. Please check the words or try a different LLM model.');
          } else if (pathTaken === 'structured') {
            setError('Input was processed, but no words could be extracted. Please check your input format, e.g., Категория - Иврит - Транскрипция - Русский - [Спряжение] - [Пример]');
          } else {
            setError('No words were processed. Please check your input.');
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
ללמוד`;

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
              Добавляйте список слов, каждое слово должно להיות на новой строке. Мы сами проанализируем его и корректно добавим в базу.
            </label>
            <textarea
              id="wordInput"
              rows={6}
              className="w-full px-3 py-2 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onPaste={handlePaste}
              dir="auto" // Changed to auto to better support mixed LTR/RTL for instructions and RTL for Hebrew
              placeholder="שלום&#10;תודה רבה&#10;ספר טוב&#10;ללמוד"
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
