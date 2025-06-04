import React, { useState, useEffect } from 'react';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import CompactConjugation from './CompactConjugation';
import { SpeakerIcon } from './SpeakerIcon';
import { useWordsStore } from '../store/wordsStore';
import { getCurrentWord } from '../store/wordsStore';

import type { Word } from '../types';

interface FlashCardProps {
  word?: Word;
  reverse?: boolean;
  onMarkAsLearned?: (id: string) => void;
  onNext?: () => void;
  currentIndex?: number;
  totalWords?: number;
}


const FlashCard: React.FC<FlashCardProps> = ({ word: propWord, reverse, onMarkAsLearned, onNext, currentIndex: propCurrentIndex, totalWords: propTotalWords }) => {

  const words = useWordsStore((state) => state.words);
  const currentIndex = useWordsStore((state) => state.currentIndex);
  const markAsLearned = useWordsStore((state) => state.markAsLearned);
  const nextWord = useWordsStore((state) => state.nextWord);
  const resetWordProgress = useWordsStore((state) => state.resetWordProgress);


  const word = propWord ?? getCurrentWord(words, currentIndex);

  const [flipped, setFlipped] = useState(false);
  
  const { speak, error: speechError } = useSpeechSynthesis({
    text: word?.hebrew || '',
    lang: 'he-IL'
  });

  // Automatically speak when card appears or changes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;
    
    if (!flipped && word?.hebrew) {
      timeoutId = setTimeout(() => {
        speak();
      }, 1000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [word?.hebrew, flipped, speak]);


  const renderExamples = (examples: Array<{ hebrew?: string, russian?: string } | string>) => {
    return (
      <div className="mt-4 text-left">
        <h4 className="text-md font-semibold text-gray-600 mb-1">Примеры:</h4>
        <ul className="list-none list-inside text-sm text-gray-500">
          {examples.map((example, index) => {

            if (
              typeof example === 'object' &&
              example !== null &&
              typeof example.hebrew === 'string' &&
              typeof example.russian === 'string'
            ) {
              return (
                <li key={`example-${index}-${example.hebrew}`} className='flex flex-row gap-2 items-center flex-0'>
                  <span>
                    <SpeakerIcon
                      text={example.hebrew}
                      className="ml-2 h-8 w-8 hover:text-blue-600"
                    />
                  </span>
                  <span className="font-medium text-black flex items-center">
                    {example.hebrew}

                  </span>
                  <span className="ml-2 text-gray-400">— {example.russian}</span>
                </li>
              );
            }

            if (typeof example === 'string') {
              return <li key={`example-${index}-${example}`}>{example}</li>;
            }
            return null;
          })}
        </ul>
      </div>
    );
  };

  const handleFlip = () => {
    setFlipped(!flipped);
    // Stop any ongoing speech when flipping to reverse side
    if (!flipped) {
      window.speechSynthesis.cancel();
    }
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
    if (onNext) {
      onNext();
    } else {
      nextWord();
    }
  };

  const handleSkip = () => {
    setFlipped(false);
    if (onNext) {
      onNext();
    } else {
      nextWord();
    }
  };

  const handleResetProgress = (e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем срабатывание onClick карточки (переворот)
    if (!word) return;
    resetWordProgress(word.id);
  };

  // Цветовая карта для категорий

  const getCategoryColor = (category: string) => {

    const cat = category?.toLowerCase();
    if (["adjective", "прилагательное", "תואר"].includes(cat)) {
      return { bg: "bg-purple-100", text: "text-purple-800" };
    }
    if (["verb", "глагол", "פועל"].includes(cat)) {
      return { bg: "bg-blue-100", text: "text-blue-800", category: "bg-blue-300" };
    }
    if (["noun", "существительное", "שם עצם"].includes(cat)) {
      return { bg: "bg-green-100", text: "text-green-800", category: "bg-green-300" };
    }
    if (["phrase", "фраза", "פרזות"].includes(cat)) {
      return { bg: "bg-orange-100", text: "text-orange-800", category: "bg-orange-300" };
    }
    return { bg: "bg-gray-100", text: "text-gray-800", category: "bg-gray-300" };
  };


  if (!word) return null;

  const categoryColors = getCategoryColor(word.category);

  return (
    <div>
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-0">
        <div className="w-full flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center pb-6">
          <div className="flex gap-2">
            <button
              type="button"
              className="w-full sm:w-auto px-3 py-2 rounded-md bg-green-500 text-white text-base sm:text-lg hover:bg-green-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleMarkLearned();
              }}
            >
              Знаю
            </button>
            {!!word.learningStage && word.learningStage > 0 && (
              <button
                type="button"
                className="w-full sm:w-auto px-3 py-2 rounded-md bg-blue-500 text-white text-sm hover:bg-blue-600 transition-colors"
                onClick={handleResetProgress}
                title="Сбросить прогресс изучения"
              >
                Сбросить уровень ({word.learningStage})
              </button>
            )}
          </div>
          {/* Progress indicator */}
          <div className="text-lg font-semibold text-gray-700">
            {(propCurrentIndex !== undefined ? propCurrentIndex : currentIndex) + 1} / {propTotalWords !== undefined ? propTotalWords : words.length}
          </div>
          <button
            type="button"
            className="w-full sm:w-auto px-3 py-2 rounded-md bg-orange-500 text-white text-base sm:text-lg hover:bg-orange-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleSkip();
            }}
          >
            Далее
          </button>
        </div>
        <div className="card-container relative">
          <div className="absolute top-3 right-4 z-10">
            {word.isLearned ? (
              <span
                title={`Уровень знания: ${word.learningStage || 1} из 5`}
                className="inline-flex items-center text-green-600"
              >
                <div className="relative">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="bg-green-100 rounded-full p-1">
                    <circle cx="12" cy="12" r="11" stroke="currentColor" fill="#dcfce7" />
                    <path d="M7 13l3 3 6-6" stroke="currentColor" />
                  </svg>
                  {word.learningStage && word.learningStage > 0 && (
                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {word.learningStage}
                    </div>
                  )}
                </div>
              </span>
            ) : (
              <span title="Не изучено" className="inline-flex items-center text-gray-400">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="bg-gray-100 rounded-full p-1">
                  <circle cx="12" cy="12" r="11" stroke="currentColor" fill="#f3f4f6" />
                  <path d="M8 7h8m-8 10h8m-7-2c0-2 3-2 3-4s-3-2-3-4m6 8c0-2-3-2-3-4s3-2 3-4" />
                </svg>
              </span>
            )}
          </div>
          <div className={`card ${flipped ? 'flipped' : ''}`}>
            <div
              className={`card-front rounded-xl p-4 sm:p-6 flex flex-col justify-between items-center shadow-lg cursor-pointer ${categoryColors.bg}`}
              onClick={handleFlip}
              onKeyDown={handleKeyDown}
              role="button"
              tabIndex={0}
            >
              <div className="text-center w-full">
                <div className={`inline-block px-2 py-1 rounded-full text-sm ${categoryColors.bg} ${categoryColors.text} ${categoryColors.category} mb-2`}>
                  {word.category}
                </div>
                {reverse ? (
                  <>
                    <h2 className={`text-4xl font-bold mb-2 ${categoryColors.text}`}>{word.russian}</h2>
                    <p className={`text-xl ${categoryColors.text} mb-3`}>[Переведите на иврит]</p>
                    <p className="text-sm text-gray-500 mt-2">Нажмите, чтобы увидеть ответ</p>

                    {word.examples && word.examples.length > 0 && renderExamples(word.examples)}
                  </>
                ) : (
                  <>
                    <h2 className={`text-5xl font-bold mb-2 ${categoryColors.text} flex items-center justify-center`}>
                      {word.hebrew}
                      <span>
                        <SpeakerIcon
                          text={word.hebrew}
                          size="speaker"
                          className="ml-6 hover:text-blue-600"
                        />
                      </span>
                    </h2>
                    <p className={`text-xl ${categoryColors.text} mb-3`}>[{word.transcription}]</p>
                    <p className="text-sm text-gray-500 mt-2">Нажмите, чтобы увидеть перевод</p>
                    {word.examples && word.examples.length > 0 && renderExamples(word.examples)}
                  </>
                )}
              </div>
            </div>

            <div
              className={`card-back rounded-xl p-4 sm:p-6 flex flex-col justify-between items-center shadow-lg cursor-pointer ${categoryColors.bg}`}
              onClick={handleFlip}
              onKeyDown={handleKeyDown}
              role="button"
              tabIndex={0}
            >
              <div className="text-center w-full">
                {reverse ? (
                  <>
                    <h2 className={`text-5xl font-bold mb-2 ${categoryColors.text}`}>{word.hebrew}</h2>
                    <p className={`text-xl ${categoryColors.text} mb-3`}>[{word.transcription}]</p>
                    <p className={`text-lg ${categoryColors.text} mt-2`}>{word.russian}</p>

                    {word.examples && word.examples.length > 0 && renderExamples(word.examples)}
                  </>
                ) : (
                  <>
                    <h3 className={`text-4xl font-medium mb-1 ${categoryColors.text}`}>{word.russian}</h3>

                    {word.examples && word.examples.length > 0 && renderExamples(word.examples)}
                    {word.category === "פועל" && word.conjugations && (
                      <div className="text-left mx-auto w-full px-2 my-4">
                        <div className={`font-medium text-lg mb-2 ${categoryColors.text}`}>Спряжения:</div>
                        <CompactConjugation conjugations={word.conjugations} />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            {speechError && (
              <div className="mt-4 text-center text-red-500 text-sm">
                {speechError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashCard;