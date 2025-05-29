import { useState, useEffect, useCallback, useRef } from 'react';

interface ConjugationEditorProps {
  conjugations: {
    past?: { [pronoun: string]: string } | null;
    present?: { [pronoun: string]: string } | null;
    future?: { [pronoun: string]: string } | null;
    imperative?: { [pronoun: string]: string } | null;
  } | null;
  onConjugationsChange: (conjugations: {
    past?: { [pronoun: string]: string } | null;
    present?: { [pronoun: string]: string } | null;
    future?: { [pronoun: string]: string } | null;
    imperative?: { [pronoun: string]: string } | null;
  } | null) => void;
}

const pronouns = [
  { key: 'אני', hebrew: 'אני', name: 'я' },
  { key: 'אתה', hebrew: 'אתה', name: 'ты (м.р.)' },
  { key: 'את', hebrew: 'את', name: 'ты (ж.р.)' },
  { key: 'הוא', hebrew: 'הוא', name: 'он' },
  { key: 'היא', hebrew: 'היא', name: 'она' },
  { key: 'אנחנו', hebrew: 'אנחנו', name: 'мы' },
  { key: 'אתם', hebrew: 'אתם', name: 'вы (м.р.)' },
  { key: 'אתן', hebrew: 'אתן', name: 'вы (ж.р.)' },
  { key: 'הם', hebrew: 'הם', name: 'они (м.р.)' },
  { key: 'הן', hebrew: 'הן', name: 'они (ж.р.)' },
];

// Imperative pronouns (only second person)
const imperativePronouns = [
  { key: 'אתה', hebrew: 'אתה', name: 'ты (м.р.)' },
  { key: 'את', hebrew: 'את', name: 'ты (ж.р.)' },
  { key: 'אתם', hebrew: 'אתם', name: 'вы (м.р.)' },
  { key: 'אתן', hebrew: 'אתן', name: 'вы (ж.р.)' },
];

const tenses = [
  { key: 'past', title: 'Прошедшее время' },
  { key: 'present', title: 'Настоящее время' },
  { key: 'future', title: 'Будущее время' },
  { key: 'imperative', title: 'Повелительное наклонение' },
];

const ConjugationEditor = ({
  conjugations,
  onConjugationsChange,
}: ConjugationEditorProps) => {
  const [localConjugations, setLocalConjugations] = useState(conjugations);
  const isInternalUpdate = useRef(false);

  // Update local state when conjugations prop changes (but not from internal updates)
  useEffect(() => {
    if (!isInternalUpdate.current) {
      // console.log('🔍 DEBUG ConjugationEditor - External update, setting conjugations:', conjugations);
      setLocalConjugations(conjugations);
    }
    isInternalUpdate.current = false;
  }, [conjugations]);

  const handleConjugationChange = useCallback((
    tense: string,
    pronounKey: string,
    value: string
  ) => {
    const currentConjugations = localConjugations || {};
    const currentTense = currentConjugations[tense as keyof typeof currentConjugations] || {};
    
    const updatedTense = {
      ...currentTense,
      [pronounKey]: value,
    };

    // Remove empty values
    if (value === '') {
      delete updatedTense[pronounKey];
    }

    const updatedConjugations = {
      ...currentConjugations,
      [tense]: Object.keys(updatedTense).length > 0 ? updatedTense : null,
    };

    // Clean up null tenses
    for (const key of Object.keys(updatedConjugations)) {
      if (updatedConjugations[key as keyof typeof updatedConjugations] === null) {
        delete updatedConjugations[key as keyof typeof updatedConjugations];
      }
    }

    const finalConjugations = Object.keys(updatedConjugations).length > 0 ? updatedConjugations : null;
    
    // Mark as internal update to prevent useEffect loop
    isInternalUpdate.current = true;
    setLocalConjugations(finalConjugations);
    onConjugationsChange(finalConjugations);
  }, [localConjugations, onConjugationsChange]);

  const getConjugationValue = useCallback((tense: string, pronounKey: string): string => {
    if (!localConjugations || !localConjugations[tense as keyof typeof localConjugations]) {
      return '';
    }
    const tenseConjugations = localConjugations[tense as keyof typeof localConjugations];
    return tenseConjugations?.[pronounKey] || '';
  }, [localConjugations]);

  return (
    <div className="space-y-6">
      {tenses.map((tense) => (
        <div key={tense.key} className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            {tense.title}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(tense.key === 'imperative' ? imperativePronouns : pronouns).map((pronoun) => (
              <div key={pronoun.key} className="flex items-center gap-3">
                <div className="flex items-center gap-2 min-w-[120px]">
                  <span className="text-sm font-medium text-gray-600 text-right" dir="rtl">
                    {pronoun.hebrew}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({pronoun.name})
                  </span>
                </div>
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="rtl"
                  placeholder="Введите спряжение..."
                  value={getConjugationValue(tense.key, pronoun.key)}
                  onChange={(e) =>
                    handleConjugationChange(tense.key, pronoun.key, e.target.value)
                  }
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConjugationEditor;