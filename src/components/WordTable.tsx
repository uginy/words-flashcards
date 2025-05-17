import React, { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Word } from '../types';
import { useWordsStore } from '../store/wordsStore';
import EditWordDialog from './EditWordDialog';
import { DataTable } from './DataTable';
import { getColumns } from './columns';
import { Download, Upload, Trash2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from "@/components/ui/button";

interface WordTableProps {
  words: Word[];
  onMarkLearned: (id: string) => void;
  onMarkNotLearned: (id: string) => void;
  onDeleteWord: (id: string) => void;
  onEditWord?: (word: Word) => void;
}

const WordTable: React.FC<WordTableProps> = ({ onEditWord }) => {
  const allWords = useWordsStore(state => state.words);
  const replaceAllWords = useWordsStore(state => state.replaceAllWords);
  const clearAllWords = useWordsStore(state => state.clearAllWords);
  const markAsLearned = useWordsStore(state => state.markAsLearned);
  const markAsNotLearned = useWordsStore(state => state.markAsNotLearned);
  const deleteWord = useWordsStore(state => state.deleteWord);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [editingWord, setEditingWord] = useState<Word | null>(null);

  const columns = getColumns(setEditingWord, markAsLearned, markAsNotLearned, deleteWord);

  // Function to handle saving edited word
  const handleSaveEdit = (editedWord: Word) => {
    const updatedWords = allWords.map(word => 
      word.id === editedWord.id ? editedWord : word
    );
    replaceAllWords(updatedWords);
    if (onEditWord) {
      onEditWord(editedWord);
    }
    toast({ title: "Успех", description: 'Слово успешно обновлено.' });
  };

  // Function to handle word export
  const handleExportWords = () => {
    if (!allWords || allWords.length === 0) {
      toast({ title: "Информация", description: 'Нет слов для экспорта.' });
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
  };

  // Function to handle word import
  const handleImportWords = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          toast({ title: "Ошибка", description: 'Не удалось прочитать файл.', variant: "destructive" });
          return;
        }
        
        const parsedWords = JSON.parse(content);
        if (!Array.isArray(parsedWords)) {
          toast({ 
            title: "Ошибка", 
            description: 'Неверный формат файла. Ожидается массив слов.',
            variant: "destructive" 
          });
          return;
        }

        replaceAllWords(parsedWords);
        toast({ 
          title: "Успех", 
          description: `Импортировано ${parsedWords.length} слов!`
        });
      } catch (error) {
        console.error("Ошибка при импорте слов:", error);
        toast({ 
          title: "Ошибка", 
          description: 'Ошибка при парсинге JSON. Проверьте формат файла.',
          variant: "destructive" 
        });
      } finally {
        if (event.target) {
          event.target.value = '';
        }
      }
    };

    reader.readAsText(file);
  };

  const performClearAllWords = () => {
    clearAllWords();
    localStorage.removeItem('hebrew-flashcards-data');
    toast({ title: "Успех", description: 'Все слова удалены.' });
  };

  return (
    <div className="w-full">
      {editingWord && (
        <EditWordDialog
          word={editingWord}
          isOpen={true}
          onClose={() => setEditingWord(null)}
          onSave={handleSaveEdit}
        />
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-medium text-gray-800">Список слов</h3>
            <div className="flex flex-wrap gap-2">
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
                    <p>Экспорт слов</p>
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
                    <p>Импорт слов</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive"
                          size="icon"
                          className="h-9 w-9"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить все слова?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Это действие нельзя отменить. Все слова будут удалены из вашей коллекции.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={performClearAllWords}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Удалить все
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Очистить все слова</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={allWords}
            searchable
            searchColumn="hebrew"
            paginated
            pageSize={10}
          />
        </div>
      </div>
    </div>
  );
};

export default WordTable;
