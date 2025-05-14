import React, { useState } from 'react';
import { parseAndTranslateWords } from '../utils/translation';
import { enrichWordWithLLM } from '../services/openrouter';
import { Word } from '../types';

interface WordInputProps {
  onAddWords: (words: Word[]) => void; // Changed to accept Word[]
}

const WordInput: React.FC<WordInputProps> = ({ onAddWords }) => {
  const [inputText, setInputText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      let wordsToAdd: Word[] = [];
      if (inputText.includes(' - ')) { // Heuristic for structured input
        wordsToAdd = parseAndTranslateWords(inputText);
      } else {
        const apiKey = localStorage.getItem('openRouterApiKey');
        const model = localStorage.getItem('openRouterModel');

        if (!apiKey || !model) {
          setError('OpenRouter API key or model not configured in Settings.');
          setIsLoading(false);
          return;
        }

        const hebrewWords = inputText.split('\\n').map(word => word.trim()).filter(word => word);
        if (hebrewWords.length === 0) {
          setError('No Hebrew words provided for enrichment.');
          setIsLoading(false);
          return;
        }
        
        // Process words sequentially to avoid overwhelming the API or hitting rate limits quickly.
        // For a better UX with many words, consider parallel requests with a concurrency limit.
        for (const hebrewWord of hebrewWords) {
          try {
            const enrichedWord = await enrichWordWithLLM(hebrewWord, apiKey, model);
            if (enrichedWord) {
              wordsToAdd.push(enrichedWord);
            }
          } catch (enrichError: any) {
            console.error(`Error enriching word "${hebrewWord}":`, enrichError);
            setError(`Failed to enrich "${hebrewWord}": ${enrichError.message}. Some words may not have been added.`);
            // Optionally, decide if you want to stop or continue with other words
          }
        }
      }

      if (wordsToAdd.length > 0) {
        onAddWords(wordsToAdd);
        setInputText('');
        setIsOpen(false); // Close accordion on successful submission
      } else if (!error) { // If no words were added and no specific error was set for enrichment
        setError('No words were processed or added. Please check your input or API configuration.');
      }

    } catch (err: any) {
      console.error('Error processing words:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const paste = e.clipboardData.getData('text');
    setInputText(paste);
  };

  const sampleText = `שלום
תודה רבה
ספר טוב
ללמוד`;

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      {!isOpen ? (
        <button
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
          onClick={() => {
            setIsOpen(true);
            setError(null); // Clear previous errors when opening
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <title>Add Words Icon</title>
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          <span>Добавить новые слова</span>
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-gray-800">Добавить слова</h3>
            <button 
              className="text-gray-400 hover:text-gray-500"
              onClick={() => {
                setIsOpen(false);
                setError(null); // Clear errors when closing
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <title>Close Icon</title>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
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
      )}
    </div>
  );
};

export default WordInput;