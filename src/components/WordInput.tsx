import React, { useState } from 'react';
import { parseAndTranslateWords } from '../utils/translation';

interface WordInputProps {
  onAddWords: (text: string) => void;
}

const WordInput: React.FC<WordInputProps> = ({ onAddWords }) => {
  const [inputText, setInputText] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onAddWords(inputText);
      setInputText('');
      setIsOpen(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const paste = e.clipboardData.getData('text');
    setInputText(paste);
  };

  const sampleText = `ניסיון מוצר מידע כמות אחריות יכולת

שמות פועל

להשפיע על לבחור ב, את להתלבט בין לבין להתחרט על להציע את ל להתבגר להתווכח להתרכז

שמות תואר
מתבגר-ת אחראי-ת מוכשר-ת מבולבל-ת מרוכז-ת

אחר
היכן`;

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      {!isOpen ? (
        <button
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
          onClick={() => setIsOpen(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              onClick={() => setIsOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="wordInput" className="block text-sm font-medium text-gray-700 mb-1">
                Введите или вставьте ивритские слова:
              </label>
              <textarea
                id="wordInput"
                rows={6}
                className="w-full px-3 py-2 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onPaste={handlePaste}
                dir="rtl"
                placeholder="Введите ивритские слова..."
              />
            </div>
            
            <div className="flex items-center space-x-2 text-sm mb-3">
              <button 
                type="button" 
                className="text-blue-500 hover:text-blue-700"
                onClick={() => setInputText(sampleText)}
              >
                Использовать пример
              </button>
              <span className="text-gray-400">|</span>
              <button 
                type="button" 
                className="text-blue-500 hover:text-blue-700"
                onClick={() => setInputText('')}
              >
                Очистить
              </button>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
              >
                Добавить
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default WordInput;