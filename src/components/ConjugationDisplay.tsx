import React from 'react';
import { Word } from '@/types';

interface ConjugationDisplayProps {
  conjugations: NonNullable<Word['conjugations']>;
}

const ConjugationDisplay: React.FC<ConjugationDisplayProps> = ({ conjugations }) => {
  const sections = {
    past: 'Прошедшее',
    present: 'Настоящее',
    future: 'Будущее',
    imperative: 'Повелительное'
  };

  return (
    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
      {(Object.entries(conjugations) as [keyof typeof sections, Record<string, string>][]).map(
        ([tense, forms]) => forms && Object.keys(forms).length > 0 && (
          <div key={tense} className="border rounded p-2">
            <div className="font-semibold mb-1">{sections[tense]}:</div>
            <div className="space-y-1">
              {Object.entries(forms).map(([person, form]) => (
                <div key={person} className="grid grid-cols-2 gap-1">
                  <span className="text-gray-500">{person}:</span>
                  <span dir="rtl">{form}</span>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default ConjugationDisplay;
