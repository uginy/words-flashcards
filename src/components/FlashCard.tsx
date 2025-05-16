import React, { useState } from 'react';
import { Word } from '../types';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import ConjugationDisplay from './ConjugationDisplay';
import CompactConjugation from './CompactConjugation';

interface FlashCardProps {
  word: Word;
  onMarkLearned: (id: string) => void;
  onNext: () => void;
  reverse?: boolean;
  forceFlipped?: boolean;
}

const FlashCard: React.FC<FlashCardProps> = ({ word, onMarkLearned, onNext, reverse, forceFlipped }) => {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    setFlipped(!flipped);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleFlip();
    }
  };

  const handleMarkLearned = () => {
    onMarkLearned(word.id);
    setFlipped(false);
    onNext();
  };

  const handleSkip = () => {
    setFlipped(false);
    onNext();
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
                </>
              ) : (
                <>
                  <h2 className="text-5xl font-bold mb-2 text-gray-800">{word.hebrew}</h2>
                  <p className="text-xl text-gray-600 mb-3">[{word.transcription}]</p>
                  <p className="text-sm text-gray-500 mt-2">Нажмите, чтобы увидеть перевод</p>
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
                </>
              ) : (
                <>
                  <h3 className="text-4xl font-medium mb-1 text-gray-700">{word.russian}</h3>
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
                Следующее
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashCard;