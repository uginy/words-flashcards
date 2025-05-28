import React from 'react';
import { Word } from '@/types';
import { SpeakerIcon } from './SpeakerIcon';

interface CompactConjugationProps {
  conjugations: NonNullable<Word['conjugations']>;
}

const CompactConjugation: React.FC<CompactConjugationProps> = ({ conjugations }) => {
  const sections: Record<string, string> = {
    past: 'Прошедшее время',
    present: 'Настоящее время',
    future: 'Будущее время',
    imperative: 'Повелительное наклонение'
  };

  return (
    <div className="text-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-x-8">
      {(Object.entries(conjugations) as [string, Record<string, string>][])
        .filter(([, forms]) => forms && Object.keys(forms).length > 0)
        .map(([tense, forms]) => (
          <div key={tense} className="min-w-0">
            <div className="font-medium bg-slate-300 px-3 py-1 rounded-sm text-center mb-2">
              {sections[tense]}
            </div>
            <div className="space-y-1">
              {Object.entries(forms).map(([person, form]) => (
                <div key={person} className="flex justify-between items-center text-sm gap-2">
                  <span className="flex-1 text-muted-foreground font-medium text-left min-w-0 truncate">
                    {person}
                  </span>
                  <span className="text-center font-medium min-w-0 truncate" dir="rtl">
                    {form}
                  </span>
                  <span className="flex-shrink-0">
                    <SpeakerIcon
                      text={`${person} ${form}`}
                      className="hover:text-blue-600"
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
};

export default CompactConjugation;
