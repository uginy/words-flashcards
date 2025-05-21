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
    <div className="space-y-3 text-sm">
      {(Object.entries(conjugations) as [string, Record<string, string>][])
        .filter(([, forms]) => forms && Object.keys(forms).length > 0)
        .map(([tense, forms]) => (
          <div key={tense}>
            <div className="font-medium mb-1">
              {sections[tense]}
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
              {Object.entries(forms).map(([person, form]) => (
                <div key={person} className="flex justify-between items-center text-sm">
                  <span className="flex-1 text-muted-foreground font-medium">{person}</span>
                  <span>
                    {form}
                  </span>
                  <span className="font-medium" dir="rtl">
                    <SpeakerIcon
                      text={`${person} ${form}`}
                      className="ml-6 hover:text-blue-600"
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
