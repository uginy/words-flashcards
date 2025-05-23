import { ColumnDef } from "@tanstack/react-table";
import { Word } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pen, RotateCcw, Check, ArrowUpDown, BookOpen, Languages } from "lucide-react";
import { DeleteButton } from './DeleteButton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ConjugationDisplay from './ConjugationDisplay';
import { SpeakerIcon } from "./SpeakerIcon";

export const getColumns = (
  setEditingWord: (word: Word) => void,
  markAsLearned: (id: string) => void,
  markAsNotLearned: (id: string) => void,
  deleteWord: (id: string) => void,
): ColumnDef<Word>[] => [
    {
      accessorKey: "hebrew",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Иврит
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const word = row.original;
        return (
          <div>
            <div className="text-base font-medium text-gray-900" dir="rtl">{word.hebrew}</div>
            <div className="flex gap-2">
              {word.conjugations && (
                <TooltipProvider>
                  <Tooltip>
                    <Popover>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <BookOpen className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <PopoverContent className="w-auto max-w-[600px]" align="start">
                        <ConjugationDisplay conjugations={word.conjugations} />
                      </PopoverContent>
                      <TooltipContent>
                        <p>Показать спряжение</p>
                      </TooltipContent>
                    </Popover>
                  </Tooltip>
                </TooltipProvider>
              )}
              {word.examples && word.examples.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <Popover>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Languages className="h-4 w-8" />
                          </Button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <PopoverContent className="w-auto max-w-[600px]" align="start">
                        <div className="space-y-2">
                          {word.examples.map((example, index) => (
                            <div key={`${word.id}-example-${index}`} className="border-b last:border-b-0 pb-2">
                              <p dir="rtl" className="text-sm font-medium">
                                <SpeakerIcon
                                  text={example.hebrew}
                                  className="ml-6 hover:text-blue-600"
                                />
                                {example.hebrew}
                              </p>
                              <p className="text-sm text-gray-600">{example.russian}</p>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                      <TooltipContent>
                        <p>Примеры использования</p>
                      </TooltipContent>
                    </Popover>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "russian",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Перевод
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      filterFn: "includesString",
    },
    {
      accessorKey: "transcription",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Транскрипция
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Категория
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
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
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Статус
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
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
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Уровень
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
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
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Дата добавления
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => {
        const date = row.getValue("dateAdded") as number;
        return new Date(date).toLocaleDateString();
      },
    },
    // {
    //   id: "nextReview",
    //   header: "Повторение",
    //   cell: ({ row }) => {
    //     const word = row.original;
    //     return (
    //       <div className="text-sm">
    //         {word.nextReview && word.nextReview > Date.now() ? (
    //           <>След.: {new Date(word.nextReview).toLocaleDateString()}</>
    //         ) : word.lastReviewed ? (
    //           <>Посл.: {new Date(word.lastReviewed).toLocaleDateString()}</>
    //         ) : (
    //           'Нет повторений'
    //         )}
    //       </div>
    //     );
    //   },
    // },
    {
      id: "actions",
      header: "Действия", cell: ({ row }) => {
        const word = row.original;
        return (
          <div className="flex justify-end gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingWord(word)}
                  >
                    <Pen className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Изменить</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${word.isLearned ? 'text-blue-600' : 'text-green-600'}`}
                    onClick={() => word.isLearned ? markAsNotLearned(word.id) : markAsLearned(word.id)}
                  >
                    {word.isLearned ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{word.isLearned ? 'Повторить' : 'Отметить изученным'}</p>
                </TooltipContent>
              </Tooltip>

              <DeleteButton
                onDelete={() => deleteWord(word.id)}
                tooltipText="Удалить"
                dialogTitle="Удалить это слово?"
                dialogDescription="Это действие нельзя отменить. Слово будет удалено из вашей коллекции."
              />
            </TooltipProvider>
          </div>
        );
      },
    },
  ];
