import React from 'react';
import { Word } from '@/types';

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
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
                  <div key={person} className="grid grid-cols-[120px,1fr] gap-4 items-center text-sm">
                    <span className="text-muted-foreground font-medium">{person}</span>
                    <span className="font-medium" dir="rtl">{form}</span>
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
