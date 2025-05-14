import React, { useState } from 'react';
import { Word } from '../types';

interface FlashCardProps {
  word: Word;
  onMarkLearned: (id: string) => void;
  onNext: () => void;
}

const FlashCard: React.FC<FlashCardProps> = ({ word, onMarkLearned, onNext }) => {
  const [flipped, setFlipped] = useState(false);
  
  const handleFlip = () => {
    setFlipped(!flipped);
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
    <div className="w-full max-w-md mx-auto">
      <div className="card-container h-64">
        <div className={`card h-full ${flipped ? 'flipped' : ''}`}>
          {/* Front side - Hebrew */}
          <div 
            className="card-front bg-white rounded-xl p-6 flex flex-col justify-between items-center shadow-lg"
            onClick={handleFlip}
          >
            <div className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(word.category)}`}>
              {word.category === 'verb' ? 'глагол' : 
               word.category === 'noun' ? 'существительное' : 
               word.category === 'adjective' ? 'прилагательное' : 'другое'}
            </div>
            
            <div className="text-center">
              <h2 className="text-4xl font-bold mb-2 text-gray-800" dir="rtl">{word.hebrew}</h2>
              <p className="text-sm text-gray-500">Нажмите, чтобы увидеть перевод</p>
            </div>
            
            <div className="w-full flex justify-between items-center">
              <button 
                className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 text-sm hover:bg-gray-300 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkip();
                }}
              >
                Пропустить
              </button>
              
              <button
                className="px-3 py-1 rounded-md bg-green-500 text-white text-sm hover:bg-green-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkLearned();
                }}
              >
                Знаю
              </button>
            </div>
          </div>
          
          {/* Back side - Russian */}
          <div 
            className="card-back bg-white rounded-xl p-6 flex flex-col justify-between items-center shadow-lg"
            onClick={handleFlip}
          >
            <div className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(word.category)}`}>
              {word.category === 'verb' ? 'глагол' : 
               word.category === 'noun' ? 'существительное' : 
               word.category === 'adjective' ? 'прилагательное' : 'другое'}
            </div>
            
            <div className="text-center">
              <h3 className="text-xl font-medium mb-1 text-gray-700">{word.russian}</h3>
              <p className="text-sm text-gray-500">[{word.transcription}]</p>
              {word.conjugation && (
                <div className="mt-2 text-xs text-gray-600">
                  <p>Спряжение:</p>
                  <p dir="rtl" className="font-medium mt-1">{word.conjugation}</p>
                </div>
              )}
            </div>
            
            <div className="w-full flex justify-between items-center">
              <button 
                className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 text-sm hover:bg-gray-300 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkip();
                }}
              >
                Пропустить
              </button>
              
              <button
                className="px-3 py-1 rounded-md bg-green-500 text-white text-sm hover:bg-green-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkLearned();
                }}
              >
                Знаю
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashCard;