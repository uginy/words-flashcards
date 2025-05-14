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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2 text-sm">
      {(Object.entries(conjugations) as [keyof typeof sections, Record<string, string>][]).map(
        ([tense, forms]) => forms && Object.keys(forms).length > 0 && (
          <div key={tense} className="border rounded-lg p-3 bg-gray-50">
            <div className="font-semibold mb-2 text-gray-700 border-b pb-1">{sections[tense]}:</div>
            <div className="space-y-2">
              {Object.entries(forms).map(([person, form]) => (
                <div key={person} className="grid grid-cols-[1fr,auto] gap-3 items-center">
                  <span className="text-gray-600">{person}:</span>
                  <span className="font-medium text-gray-900" dir="rtl">{form}</span>
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
