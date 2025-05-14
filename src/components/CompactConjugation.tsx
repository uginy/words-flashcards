import React from 'react';
import { Word } from '@/types';

interface CompactConjugationProps {
  conjugations: NonNullable<Word['conjugations']>;
}

const CompactConjugation: React.FC<CompactConjugationProps> = ({ conjugations }) => {
  const sections = {
    past: 'Прошедшее',
    present: 'Настоящее',
    future: 'Будущее',
    imperative: 'Повелительное'
  };

  // Наиболее важные формы для каждого времени
  const mainForms = {
    past: ['אני', 'אתה', 'הוא', 'אנחנו'],
    present: ['אני', 'אתה', 'הוא', 'אנחנו'], 
    future: ['אני', 'אתה', 'הוא', 'אנחנו'],
    imperative: ['אתה']
  };

  return (
    <div className="space-y-3 text-sm">
      {(Object.entries(conjugations) as [keyof typeof sections, Record<string, string>][])
        .filter(([, forms]) => forms && Object.keys(forms).length > 0)
        .map(([tense, forms]) => (
          <div key={tense}>
            <div className="font-medium mb-1">{sections[tense]}:</div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
              {Object.entries(forms)
                // .filter(([person]) => mainForms[tense].includes(person))
                .map(([person, form]) => (
                  <div key={person} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{person}:</span>
                    <span className="text-gray-900" dir="rtl">{form}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
    </div>
  );
};

export default CompactConjugation;
