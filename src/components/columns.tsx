import { ColumnDef } from "@tanstack/react-table";
import { Word } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pen, RotateCcw, Check, ArrowUpDown, BookOpen, Languages, RefreshCw, Edit3, FileText } from "lucide-react";
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
  refineWord: (id: string) => void,
  isWordRefining: (id: string) => boolean,
  setEditingConjugations?: (word: Word) => void,
  setEditingExamples?: (word: Word) => void,
): ColumnDef<Word>[] => [
    {
      accessorKey: "hebrew",
      size: 180,
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
          <div className="flex items-center justify-end gap-2 text-base font-medium text-gray-900" dir="rtl">
            <span>{word.hebrew}</span>
            <SpeakerIcon
              text={word.hebrew}
              className="text-gray-500 hover:text-blue-600 transition-colors cursor-pointer"
            />
          </div>
        );
      },
    },
    {
      accessorKey: "russian",
      size: 200,
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
      size: 160,
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
      accessorKey: "examples",
      size: 100,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Примеры
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const word = row.original;
        return (
          <div>
            {word.examples && word.examples.length > 0 ? (
              <TooltipProvider>
                <Tooltip>
                  <Popover>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Languages className="h-4 w-4" />
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
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "conjugations",
      size: 120,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Спряжения
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const word = row.original;
        return (
          <div>
            {word.conjugations ? (
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
                    <PopoverContent className="w-auto max-w-[1000px]" align="start">
                      <ConjugationDisplay conjugations={word.conjugations} />
                    </PopoverContent>
                    <TooltipContent>
                      <p>Показать спряжение</p>
                    </TooltipContent>
                  </Popover>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      size: 130,
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
      size: 120,
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
      size: 100,
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
      size: 120,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Дата
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
      size: 120,
      header: "Действия",
      cell: ({ row }) => {
        const word = row.original;
        const isRefining = isWordRefining(word.id);
        
        const handleEditWord = () => setEditingWord(word);
        const handleEditConjugations = setEditingConjugations ? () => setEditingConjugations(word) : undefined;
        const handleEditExamples = setEditingExamples ? () => setEditingExamples(word) : undefined;
        const handleRefineWord = () => refineWord(word.id);
        const handleToggleLearned = () => word.isLearned ? markAsNotLearned(word.id) : markAsLearned(word.id);
        const handleDeleteWord = () => deleteWord(word.id);
        
        return (
          <div className="flex justify-end gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleEditWord}
                  >
                    <Pen className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Изменить</p>
                </TooltipContent>
              </Tooltip>

              {word.category === "פועל" && handleEditConjugations && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-600 hover:text-blue-700"
                      onClick={handleEditConjugations}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Редактировать спряжения</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {handleEditExamples && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-600 hover:text-green-700"
                      onClick={handleEditExamples}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Редактировать примеры</p>
                  </TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${isRefining ? 'text-orange-600 animate-spin' : 'text-purple-600 hover:text-purple-700'}`}
                    onClick={handleRefineWord}
                    disabled={isRefining}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isRefining ? 'Уточняем перевод...' : 'Уточнить перевод'}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${word.isLearned ? 'text-blue-600' : 'text-green-600'}`}
                    onClick={handleToggleLearned}
                  >
                    {word.isLearned ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{word.isLearned ? 'Повторить' : 'Отметить изученным'}</p>
                </TooltipContent>
              </Tooltip>

              <DeleteButton
                onDelete={handleDeleteWord}
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
