import React from 'react';
import { Word } from '@/types';

interface CompactConjugationProps {
  conjugations: NonNullable<Word['conjugations']>;
}

const CompactConjugation: React.FC<CompactConjugationProps> = ({ conjugations }) => {
  const sections = {
    present: 'Настоящее',
    past: 'Прошедшее',
    future: 'Будущее',
    imperative: 'Повелительное'
  };

  // Приоритет отображения форм для компактного вида
  const priorityForms = ['я (м)', 'ты (м)', 'он', 'мы'];

  return (
    <div className="grid grid-cols-1 gap-2 text-sm">
      {(Object.entries(conjugations) as [keyof typeof sections, Record<string, string>][])
        .filter(([tense, forms]) => forms && Object.keys(forms).length > 0)
        .map(([tense, forms]) => (
          <div key={tense} className="text-gray-600">
            <div className="font-medium mb-0.5">{sections[tense]}:</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {Object.entries(forms)
                .filter(([person]) => priorityForms.includes(person))
                .map(([person, form]) => (
                  <div key={person} className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs">{person}:</span>
                    <span className="font-medium" dir="rtl">{form}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
    </div>
  );
};

export default CompactConjugation;
