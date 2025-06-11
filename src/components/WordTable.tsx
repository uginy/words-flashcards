import type { FC } from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Word } from '../types';
import { useWordsStore } from '../store/wordsStore';
import EditWordDialog from './EditWordDialog';
import ConjugationEditDialog from './ConjugationEditDialog';
import ExamplesEditDialog from './ExamplesEditDialog';
import { DataTable } from './DataTable';
import { getColumns } from './columns';
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { DeleteButton } from './DeleteButton';

interface WordTableProps {
  words: Word[];
  onMarkLearned: (id: string) => void;
  onMarkNotLearned: (id: string) => void;
  onDeleteWord: (id: string) => void;
  onEditWord?: (word: Word) => void;
}

const WordTable: FC<WordTableProps> = ({ onEditWord }) => {
  const allWords = useWordsStore(state => state.words);
  const replaceAllWords = useWordsStore(state => state.replaceAllWords);
  const clearAllWords = useWordsStore(state => state.clearAllWords);
  const markAsLearned = useWordsStore(state => state.markAsLearned);
  const markAsNotLearned = useWordsStore(state => state.markAsNotLearned);
  const deleteWord = useWordsStore(state => state.deleteWord);
  const refineWord = useWordsStore(state => state.refineWord);
  const refiningWords = useWordsStore(state => state.refiningWords);
  const { toast } = useToast();
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [editingConjugations, setEditingConjugations] = useState<Word | null>(null);
  const [editingExamples, setEditingExamples] = useState<Word | null>(null);
  const [filteredWordCount, setFilteredWordCount] = useState<number>(allWords.length);

  // Update filteredWordCount when allWords changes
  useEffect(() => {
    setFilteredWordCount(allWords.length);
  }, [allWords]);

  // Create a wrapper for toast with correct types
  const toastWrapper = useCallback((opts: { title: string; description: string; variant?: string }) => {
    toast({
      title: opts.title,
      description: opts.description,
      variant: opts.variant as "default" | "destructive" | undefined
    });
  }, [toast]);

  // Memoize refine function to prevent recreating on each render
  const handleRefineWord = useCallback((id: string) => {
    refineWord(id, toastWrapper);
  }, [refineWord, toastWrapper]);

  // Create a stable function to check if word is refining
  const isWordRefining = useCallback((id: string) => refiningWords.has(id), [refiningWords]);

  // Memoize columns to prevent table flickering
  const columns = useMemo(() => getColumns(
    setEditingWord,
    markAsLearned,
    markAsNotLearned,
    deleteWord,
    handleRefineWord,
    isWordRefining,
    setEditingConjugations,
    setEditingExamples
  ), [markAsLearned, markAsNotLearned, deleteWord, handleRefineWord, isWordRefining]);

  // Function to handle saving edited word
  const handleSaveEdit = useCallback((editedWord: Word) => {
    const updatedWords = allWords.map(word =>
      word.id === editedWord.id ? editedWord : word
    );
    replaceAllWords(updatedWords);
    if (onEditWord) {
      onEditWord(editedWord);
    }
    toast({ title: "Успех", description: 'Слово успешно обновлено.' });
  }, [allWords, replaceAllWords, onEditWord, toast]);

  const performClearAllWords = useCallback(() => {
    clearAllWords();
    localStorage.removeItem('hebrew-flashcards-data');
    toast({ title: "Успех", description: 'Все слова удалены.' });
  }, [clearAllWords, toast]);

  return (
    <div className="w-full min-w-0">
      {editingWord && (
        <EditWordDialog
          word={editingWord}
          isOpen={true}
          onClose={() => setEditingWord(null)}
          onSave={handleSaveEdit}
        />
      )}

      {editingConjugations && (
        <ConjugationEditDialog
          word={editingConjugations}
          isOpen={true}
          onClose={() => setEditingConjugations(null)}
          onSave={handleSaveEdit}
        />
      )}

      {editingExamples && (
        <ExamplesEditDialog
          word={editingExamples}
          isOpen={true}
          onClose={() => setEditingExamples(null)}
          onSave={handleSaveEdit}
        />
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden w-full">
        <div className="p-4 space-y-4 w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-base sm:text-lg font-medium text-gray-800 truncate max-w-full">
              Список слов ({filteredWordCount})
            </h3>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
              <TooltipProvider>
                <DeleteButton
                  onDelete={performClearAllWords}
                  tooltipText="Очистить все слова"
                  dialogTitle="Удалить все слова?"
                  dialogDescription="Это действие нельзя отменить. Все слова будут удалены из вашей коллекции."
                  variant="destructive"
                  className="h-9 w-9"
                />
              </TooltipProvider>
            </div>
          </div>

          <div className="h-[78vh] min-h-[400px]">
            <DataTable
              columns={columns}
              data={allWords}
              searchable
              searchColumns={[
                { id: "hebrew", placeholder: "Поиск на иврите..." },
                { id: "russian", placeholder: "Поиск по переводу..." }
              ]}
              paginated
              filters={[
                {
                  id: "category",
                  label: "Категории",
                  options: [
                    { label: "Глагол", value: "פועל" },
                    { label: "Существительное", value: "שם עצם" },
                    { label: "Прилагательное", value: "שם תואר" },
                    { label: "Фразы", value: "פרזות" },
                  ]
                },
                {
                  id: "isLearned",
                  label: "Статус",
                  options: [
                    { label: "Изучено", value: true },
                    { label: "Не изучено", value: false },
                  ]
                },
                {
                  id: "learningStage",
                  label: "Уровень",
                  options: [
                    { label: "Уровень 5", value: "5" },
                    { label: "Уровень 4", value: "4" },
                    { label: "Уровень 3", value: "3" },
                    { label: "Уровень 2", value: "2" },
                    { label: "Уровень 1", value: "1" },
                    { label: "Не начато", value: "0" },
                  ]
                }
              ]}
              onFilteredRowCountChange={setFilteredWordCount}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordTable;
