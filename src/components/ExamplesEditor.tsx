import { useState, useEffect, useCallback, useRef } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExampleWithId {
  id: string;
  hebrew: string;
  russian: string;
}

interface ExamplesEditorProps {
  examples: { hebrew: string; russian: string }[] | null;
  onExamplesChange: (examples: { hebrew: string; russian: string }[] | null) => void;
}

const ExamplesEditor = ({
  examples,
  onExamplesChange,
}: ExamplesEditorProps) => {
  const [localExamples, setLocalExamples] = useState<ExampleWithId[]>(() => {
    return (examples || []).map((example, index) => ({
      id: `example-${Date.now()}-${index}`,
      ...example,
    }));
  });
  const isInternalUpdate = useRef(false);

  // Update local state when examples prop changes (but not from internal updates)
  useEffect(() => {
    if (!isInternalUpdate.current) {
      console.log('🔍 DEBUG ExamplesEditor - External update, setting examples:', examples);
      const examplesWithIds = (examples || []).map((example, index) => ({
        id: `example-${Date.now()}-${index}`,
        ...example,
      }));
      setLocalExamples(examplesWithIds);
    }
    isInternalUpdate.current = false;
  }, [examples]);

  const handleExampleChange = useCallback((
    id: string,
    field: 'hebrew' | 'russian',
    value: string
  ) => {
    const updatedExamples = localExamples.map(example =>
      example.id === id ? { ...example, [field]: value } : example
    );

    // Mark as internal update to prevent useEffect loop
    isInternalUpdate.current = true;
    setLocalExamples(updatedExamples);
    
    // Filter out empty examples before sending to parent
    const validExamples = updatedExamples.filter(
      example => example.hebrew.trim() !== '' || example.russian.trim() !== ''
    ).map(({ id, ...example }) => example); // Remove id for parent
    
    onExamplesChange(validExamples.length > 0 ? validExamples : null);
  }, [localExamples, onExamplesChange]);

  const { toast } = useToast();

  const hasEmptyExample = useCallback(() => {
    return localExamples.some(
      example => !example.hebrew.trim() || !example.russian.trim()
    );
  }, [localExamples]);

  const addExample = useCallback(() => {
    // Проверяем, есть ли незаполненные примеры
    if (hasEmptyExample()) {
      toast({
        title: "Внимание",
        description: "Заполните текущие примеры перед добавлением нового",
        variant: "destructive"
      });
      return;
    }

    const newExample: ExampleWithId = { 
      id: `example-${Date.now()}-${Math.random()}`,
      hebrew: '', 
      russian: '' 
    };
    const updatedExamples = [...localExamples, newExample];
    
    isInternalUpdate.current = true;
    setLocalExamples(updatedExamples);
    
    // Convert to format expected by parent
    const examplesForParent = updatedExamples.map(({ id, ...example }) => example);
    onExamplesChange(examplesForParent);
  }, [localExamples, onExamplesChange, toast, hasEmptyExample]);

  const removeExample = useCallback((id: string) => {
    const updatedExamples = localExamples.filter(example => example.id !== id);
    
    isInternalUpdate.current = true;
    setLocalExamples(updatedExamples);
    
    // Convert to format expected by parent
    const examplesForParent = updatedExamples.map(({ id, ...example }) => example);
    onExamplesChange(examplesForParent.length > 0 ? examplesForParent : null);
  }, [localExamples, onExamplesChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Примеры использования</h3>
        <button
          type="button"
          onClick={addExample}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-1" />
          Добавить пример
        </button>
      </div>

      {localExamples.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Нет примеров. Нажмите "Добавить пример" чтобы создать первый.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {localExamples.map((example, index) => (
            <div key={example.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Пример {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeExample(example.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Удалить пример"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    На иврите
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    dir="rtl"
                    rows={2}
                    placeholder="Введите пример на иврите..."
                    value={example.hebrew}
                    onChange={(e) => handleExampleChange(example.id, 'hebrew', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Перевод на русский
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={2}
                    placeholder="Введите перевод на русском..."
                    value={example.russian}
                    onChange={(e) => handleExampleChange(example.id, 'russian', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExamplesEditor;
