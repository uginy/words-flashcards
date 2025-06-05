import type { FC } from 'react';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import type { Word } from '../types';
import { useWordsStore } from '../store/wordsStore';
import EditWordDialog from './EditWordDialog';
import ConjugationEditDialog from './ConjugationEditDialog';
import ExamplesEditDialog from './ExamplesEditDialog';
import { DataTable } from './DataTable';
import { getColumns } from './columns';
import { Download, Upload } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DeleteButton } from './DeleteButton';
import { Button } from "@/components/ui/button";

interface WordTableProps {
  words: Word[];
  onMarkLearned: (id: string) => void;
  onMarkNotLearned: (id: string) => void;
  onDeleteWord: (id: string) => void;
  onEditWord?: (word: Word) => void;
}

const WordTable: FC<WordTableProps> = ({ onEditWord }) => {
  const { t } = useTranslation();
  const allWords = useWordsStore(state => state.words);
  const replaceAllWords = useWordsStore(state => state.replaceAllWords);
  const clearAllWords = useWordsStore(state => state.clearAllWords);
  const markAsLearned = useWordsStore(state => state.markAsLearned);
  const markAsNotLearned = useWordsStore(state => state.markAsNotLearned);
  const deleteWord = useWordsStore(state => state.deleteWord);
  const refineWord = useWordsStore(state => state.refineWord);
  const refiningWords = useWordsStore(state => state.refiningWords);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    toast({ title: t('common.success'), description: t('wordTable.wordUpdated') });
  }, [allWords, replaceAllWords, onEditWord, toast, t]);

  // Function to handle word export
  const handleExportWords = useCallback(() => {
    if (!allWords || allWords.length === 0) {
      toast({ title: "Информация", description: t('wordTable.noWordsToExport') });
      return;
    }

    const jsonString = JSON.stringify(allWords, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'words-flashcards-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [allWords, toast, t]);

  // Function to handle word import
  const handleImportWords = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          toast({ title: t('common.error'), description: t('wordTable.fileReadError'), variant: "destructive" });
          return;
        }
        
        const parsedWords = JSON.parse(content);
        if (!Array.isArray(parsedWords)) {
          toast({
            title: t('common.error'),
            description: t('wordTable.invalidFileFormat'),
            variant: "destructive"
          });
          return;
        }

        replaceAllWords(parsedWords);
        toast({
          title: t('common.success'),
          description: t('wordTable.importSuccess', { count: parsedWords.length })
        });
      } catch {
        toast({
          title: t('common.error'),
          description: t('wordTable.jsonParseError'),
          variant: "destructive"
        });
      } finally {
        if (event.target) {
          event.target.value = '';
        }
      }
    };

    reader.readAsText(file);
  }, [replaceAllWords, toast, t]);

  const performClearAllWords = useCallback(() => {
    clearAllWords();
    localStorage.removeItem('hebrew-flashcards-data');
    toast({ title: t('common.success'), description: t('wordTable.allWordsDeleted') });
  }, [clearAllWords, toast, t]);

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
              {t('wordTable.title', { count: filteredWordCount })}
            </h3>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleExportWords}
                      variant="secondary"
                      size="icon"
                      className="h-9 w-9"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('wordTable.exportTooltip')}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <input
                        id="import-file"
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleImportWords}
                        ref={fileInputRef}
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="secondary"
                        size="icon"
                        className="h-9 w-9"
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('wordTable.importTooltip')}</p>
                  </TooltipContent>
                </Tooltip>

                <DeleteButton
                  onDelete={performClearAllWords}
                  tooltipText={t('wordTable.clearAllTooltip')}
                  dialogTitle={t('wordTable.deleteAllTitle')}
                  dialogDescription={t('wordTable.deleteAllDescription')}
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
                { id: "hebrew", placeholder: t('wordTable.searchHebrew') },
                { id: "russian", placeholder: t('wordTable.searchRussian') }
              ]}
              paginated
              filters={[
                {
                  id: "category",
                  label: t('wordTable.categories'),
                  options: [
                    { label: t('wordTable.categoryLabels.verb'), value: "פועל" },
                    { label: t('wordTable.categoryLabels.noun'), value: "שם עצם" },
                    { label: t('wordTable.categoryLabels.adjective'), value: "שם תואר" },
                    { label: t('wordTable.categoryLabels.phrase'), value: "פרזות" },
                  ]
                },
                {
                  id: "isLearned",
                  label: t('wordTable.statusFilter'),
                  options: [
                    { label: t('status.learned'), value: true },
                    { label: t('status.notLearned'), value: false },
                  ]
                },
                {
                  id: "learningStage",
                  label: t('wordTable.levelFilter'),
                  options: [
                    { label: t('wordTable.levelLabels.level5'), value: "5" },
                    { label: t('wordTable.levelLabels.level4'), value: "4" },
                    { label: t('wordTable.levelLabels.level3'), value: "3" },
                    { label: t('wordTable.levelLabels.level2'), value: "2" },
                    { label: t('wordTable.levelLabels.level1'), value: "1" },
                    { label: t('wordTable.levelLabels.notStarted'), value: "0" },
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
