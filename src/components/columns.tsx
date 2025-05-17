import { ColumnDef } from "@tanstack/react-table";
import { Word } from "@/types";
import { Button } from "@/components/ui/button";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ConjugationDisplay from './ConjugationDisplay';

export const getColumns = (
  setEditingWord: (word: Word) => void,
  markAsLearned: (id: string) => void,
  markAsNotLearned: (id: string) => void,
  deleteWord: (id: string) => void,
): ColumnDef<Word>[] => [
  {
    accessorKey: "hebrew",
    header: "Иврит",
    cell: ({ row }) => {
      const word = row.original;
      return (
        <div>
          <div className="text-base font-medium text-gray-900" dir="rtl">{word.hebrew}</div>
          <div className="flex gap-2">
            {word.conjugations && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="link" className="text-xs p-0 h-auto">
                    Показать спряжение
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto max-w-[600px]" align="start">
                  <ConjugationDisplay conjugations={word.conjugations} />
                </PopoverContent>
              </Popover>
            )}
            {word.examples && word.examples.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="link" className="text-xs p-0 h-auto">
                    Примеры ({word.examples.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto max-w-[600px]" align="start">
                  <div className="space-y-2">
                    {word.examples.map((example, index) => (
                      <div key={`${word.id}-example-${index}`} className="border-b last:border-b-0 pb-2">
                        <p dir="rtl" className="text-sm font-medium">{example.hebrew}</p>
                        <p className="text-sm text-gray-600">{example.russian}</p>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "russian",
    header: "Перевод",
  },
  {
    accessorKey: "transcription",
    header: "Транскрипция",
  },
  {
    accessorKey: "category",
    header: "Категория",
    cell: ({ row }) => {
      const category = row.getValue("category") as string;
      return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
          ${category === 'פועל' ? 'bg-blue-100 text-blue-800' : 
            category === 'שם עצם' ? 'bg-green-100 text-green-800' : 
            category === 'שם תואר' ? 'bg-purple-100 text-purple-800' : 
            'bg-gray-100 text-gray-800'}`}
        >
          {category}
        </span>
      );
    },
  },
  {
    accessorKey: "isLearned",
    header: "Статус",
    cell: ({ row }) => {
      const isLearned = row.getValue("isLearned") as boolean;
      return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
          ${isLearned ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
        >
          {isLearned ? 'Изучено' : 'Не изучено'}
        </span>
      );
    },
  },
  {
    accessorKey: "learningStage",
    header: "Уровень",
    cell: ({ row }) => {
      const stage = row.getValue("learningStage") as number;
      return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
          ${stage === 5 ? 'bg-blue-100 text-blue-800' :
            stage === 4 ? 'bg-green-100 text-green-800' :
            stage === 3 ? 'bg-yellow-100 text-yellow-800' :
            stage === 2 ? 'bg-orange-100 text-orange-800' :
            stage === 1 ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'}`}
        >
          {stage || 0}/5
        </span>
      );
    },
  },
  {
    accessorKey: "dateAdded",
    header: "Дата добавления",
    cell: ({ row }) => {
      const date = row.getValue("dateAdded") as number;
      return new Date(date).toLocaleDateString();
    },
  },
  {
    id: "nextReview",
    header: "Повторение",
    cell: ({ row }) => {
      const word = row.original;
      return (
        <div className="text-sm">
          {word.nextReview && word.nextReview > Date.now() ? (
            <>След.: {new Date(word.nextReview).toLocaleDateString()}</>
          ) : word.lastReviewed ? (
            <>Посл.: {new Date(word.lastReviewed).toLocaleDateString()}</>
          ) : (
            'Нет повторений'
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Действия",
    cell: ({ row }) => {
      const word = row.original;
      return (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            className="h-8 px-2 lg:px-3"
            onClick={() => setEditingWord(word)}
          >
            Изменить
          </Button>
          <Button
            variant="ghost"
            className="h-8 px-2 lg:px-3"
            onClick={() => word.isLearned ? markAsNotLearned(word.id) : markAsLearned(word.id)}
          >
            {word.isLearned ? 'Повторить' : 'Отметить изученным'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="h-8 px-2 lg:px-3 text-red-600 hover:text-red-900">
                Удалить
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить это слово?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это действие нельзя отменить. Слово будет удалено из вашей коллекции.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteWord(word.id)}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
  },
];
