import React, { useState } from 'react';
import CompactConjugation from './CompactConjugation';

import { useWordsStore } from '../store/wordsStore';
import { getCurrentWord } from '../store/wordsStore';

interface FlashCardProps {
  reverse?: boolean;
  onMarkAsLearned?: (id: string) => void;
  onNextWord?: () => void;
}

// FlashCard now gets word and actions from Zustand store, only reverse is a prop
const FlashCard: React.FC<FlashCardProps> = ({ reverse, onMarkAsLearned, onNextWord }) => {
  // Подписка на words и currentIndex из стора
  const words = useWordsStore((state) => state.words);
  const currentIndex = useWordsStore((state) => state.currentIndex);
  const markAsLearned = useWordsStore((state) => state.markAsLearned);
  const nextWord = useWordsStore((state) => state.nextWord);

  // Локально вычисляем текущий word
  const word = getCurrentWord(words, currentIndex);

  const [flipped, setFlipped] = useState(false);

  // Helper to render examples for both string[] and object[] formats
  // If example is a string, just render it; if object, render text and translation
  const renderExamples = (examples: any[]) => {
    return (
      <div className="mt-4 text-left">
        <h4 className="text-md font-semibold text-gray-600 mb-1">Примеры:</h4>
        <ul className="list-disc list-inside text-sm text-gray-500">
          {examples.map((example, index) => {
            if (typeof example === 'string') {
              return <li key={index}>{example}</li>;
            } else if (typeof example === 'object' && example !== null) {
              // Ожидается структура: { text: string, translation?: string }
              return (
                <li key={index}>
                  {example.text}
                  {example.translation && (
                    <span className="ml-2 text-gray-400">— {example.translation}</span>
                  )}
                </li>
              );
            }
            return null;
          })}
        </ul>
      </div>
    );
  };

  const handleFlip = () => {
    setFlipped(!flipped);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleFlip();
    }
  };

  const handleMarkLearned = () => {
    if (!word) return;
    if (onMarkAsLearned) {
      onMarkAsLearned(word.id);
    } else {
      markAsLearned(word.id);
    }
    setFlipped(false);
    if (onNextWord) {
      onNextWord();
    } else {
      nextWord();
    }
  };

  const handleSkip = () => {
    setFlipped(false);
    nextWord();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'verb':
        return 'bg-blue-100 text-blue-800';
      case 'noun':
        return 'bg-green-100 text-green-800';
      case 'adjective':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // If no word, render nothing
  if (!word) return null;

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="card-container relative">
        <div className={`card ${flipped ? 'flipped' : ''}`}>
          {/* Front side */}
          <div
            className="card-front bg-white rounded-xl p-6 flex flex-col justify-between items-center shadow-lg"
            onClick={handleFlip}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
          >
            <div className="text-center">
              <div className={`inline-block px-2 py-1 rounded-full text-sm ${getCategoryColor(word.category)} mb-2`}>
                {word.category}
              </div>
              {reverse ? (
                <>
                  <h2 className="text-4xl font-bold mb-2 text-gray-800">{word.russian}</h2>
                  <p className="text-xl text-gray-600 mb-3">[Переведите на иврит]</p>
                  <p className="text-sm text-gray-500 mt-2">Нажмите, чтобы увидеть ответ</p>
                  {/* Примеры на лицевой стороне */}
                  {word.examples && word.examples.length > 0 && renderExamples(word.examples)}
                </>
              ) : (
                <>
                  <h2 className="text-5xl font-bold mb-2 text-gray-800">{word.hebrew}</h2>
                  <p className="text-xl text-gray-600 mb-3">[{word.transcription}]</p>
                  <p className="text-sm text-gray-500 mt-2">Нажмите, чтобы увидеть перевод</p>
                  {/* Примеры на лицевой стороне */}
                  {word.examples && word.examples.length > 0 && renderExamples(word.examples)}
                </>
              )}
            </div>
            <div className="w-full flex justify-between items-center pt-10">

              <button
                className="px-3 py-1 rounded-md bg-green-500 text-white text-lg hover:bg-green-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkLearned();
                }}
              >
                Знаю
              </button>

              <button
                className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 text-lg hover:bg-gray-300 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkip();
                }}
              >
                Далее
              </button>

            </div>
          </div>
          {/* Back side */}
          <div
            className="card-back bg-white rounded-xl p-6 flex flex-col justify-between items-center shadow-lg"
            onClick={handleFlip}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
          >
            <div className="text-center">
              {reverse ? (
                <>
                  <h2 className="text-5xl font-bold mb-2 text-gray-800">{word.hebrew}</h2>
                  <p className="text-xl text-gray-600 mb-3">[{word.transcription}]</p>
                  <p className="text-lg text-gray-700 mt-2">{word.russian}</p>
                  {/* Display usage examples if they exist */}
                  {word.examples && word.examples.length > 0 && renderExamples(word.examples)}
                </>
              ) : (
                <>
                  <h3 className="text-4xl font-medium mb-1 text-gray-700">{word.russian}</h3>
                  {/* Display usage examples if they exist */}
                  {word.examples && word.examples.length > 0 && renderExamples(word.examples)}
                  {word.category === "פועל" && word.conjugations && (
                    <div className="text-left mx-auto max-w-[400px] px-2 my-4">
                      <div className="font-medium text-lg mb-2 text-gray-700">Спряжения:</div>
                      <CompactConjugation conjugations={word.conjugations} />
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="w-full flex justify-between items-center pt-10">


              <button
                className="px-3 py-1 rounded-md bg-green-500 text-white text-lg hover:bg-green-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkLearned();
                }}
              >
                Знаю
              </button>

              <button
                className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 text-lg hover:bg-gray-300 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkip();
                }}
              >
                Далее
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashCard;