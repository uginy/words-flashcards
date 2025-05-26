import React from 'react';
import { Word } from '@/types';
import { SpeakerIcon } from './SpeakerIcon';

interface ConjugationDisplayProps {
  conjugations: NonNullable<Word['conjugations']>;
}

const ConjugationDisplay: React.FC<ConjugationDisplayProps> = ({ conjugations }) => {
  const sections: Record<string, string> = {
    past: 'Прошедшее время',
    present: 'Настоящее время',
    future: 'Будущее время',
    imperative: 'Повелительное наклонение'
  };

  return (
    <div className="grid grid-cols-4 gap-4 p-2">
      {(Object.entries(conjugations) as [string, Record<string, string>][]).map(
        ([tense, forms]) => {
          if (!forms || Object.keys(forms).length === 0) return null;

          return (
            <div key={tense} className="border rounded-lg p-4 bg-muted/50">
              <div className="font-medium mb-3 text-base text-foreground/90 border-b pb-2">
                {sections[tense]}
              </div>
              <div className="space-y-2.5">
                {Object.entries(forms).map(([person, form]) => (
                  <div key={person} className="flex flex-row gap-4 text-sm justify-between items-center">
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
          );
        }
      )}
    </div>
  );
};

export default ConjugationDisplay;
