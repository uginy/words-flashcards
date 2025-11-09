import { ColumnDef } from "@tanstack/react-table";
import { Word } from "@/types";
import type { ImageGenerationStatus } from '@/types/imageGeneration';
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pen, RotateCcw, Check, ArrowUpDown, BookOpen, Languages, RefreshCw, Edit3, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { DeleteButton } from './DeleteButton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ConjugationDisplay from './ConjugationDisplay';
import { SpeakerIcon } from "./SpeakerIcon";

// Mapping of binyan keys to Hebrew names
const BINYAN_HEBREW: Record<string, string> = {
  'PAAL': 'פעל',
  'PIEL': 'פיעל',
  'HITPAEL': 'התפעל',
  'PUAL': 'פועל',
  'NIFAL': 'נפעל',
  'HIFIL': 'הפעיל',
  'HUFAL': 'הופעל',
  'HITCIL': 'התציע',
  'OTHER': 'אחר',
};

export const getColumns = (
  setEditingWord: (word: Word) => void,
  markAsLearned: (id: string) => void,
  markAsNotLearned: (id: string) => void,
  deleteWord: (id: string) => void,
  refineWord: (id: string) => void,
  isWordRefining: (id: string) => boolean,
  setEditingConjugations?: (word: Word) => void,
  setEditingExamples?: (word: Word) => void,
  generateImage?: (word: Word) => void,
  clearImage?: (word: Word) => void,
  getImageStatus?: (id: string) => ImageGenerationStatus | undefined,
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
      id: "image",
      size: 150,
      header: "Иконка",
      cell: ({ row }) => {
        const word = row.original;
        const imageStatus = getImageStatus ? getImageStatus(word.id) : undefined;
        const isGeneratingImage = imageStatus?.status === 'generating';
        const imageGenerationError = imageStatus?.status === 'error' ? imageStatus.error : undefined;
        
        return (
          <div className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
            isGeneratingImage ? 'bg-indigo-50 border border-indigo-200' : ''
          }`}>
            {word.image?.dataUrl ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <img
                      src={word.image.dataUrl}
                      alt={`Иконка для ${word.hebrew}`}
                      className="w-12 h-12 rounded-md border border-gray-200 object-cover shadow-sm cursor-pointer"
                      loading="lazy"
                    />
                  </TooltipTrigger>
                  <TooltipContent className="p-3 bg-white border shadow-lg text-center space-y-2">
                    <img
                      src={word.image.dataUrl}
                      alt={`Иконка для ${word.hebrew}`}
                      className="w-48 h-48 rounded-md object-cover mx-auto"
                      loading="lazy"
                    />
                    <div className="text-base font-semibold text-gray-900" dir="rtl">
                      {word.hebrew}
                    </div>
                    <div className="text-sm text-gray-600">
                      {word.russian}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : isGeneratingImage ? (
              <div className="w-12 h-12 rounded-md border border-indigo-300 bg-indigo-100 text-[10px] text-indigo-600 flex items-center justify-center uppercase font-semibold">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-md border border-dashed border-gray-300 text-[10px] text-gray-400 flex items-center justify-center uppercase">
                Нет
              </div>
            )}
            
            <div className="flex gap-1">
              {generateImage && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${word.image ? 'text-indigo-600 hover:text-indigo-700' : 'text-gray-500 hover:text-indigo-600'}`}
                        onClick={() => generateImage(word)}
                        disabled={isGeneratingImage}
                      >
                        {isGeneratingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px]">
                      <p>
                        {isGeneratingImage
                          ? 'Создаем иконку...'
                          : word.image
                            ? 'Перегенерировать иконку'
                            : 'Сгенерировать иконку'}
                      </p>
                      {imageGenerationError && (
                        <p className="text-red-500 text-xs mt-1">{imageGenerationError}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {word.image && clearImage && (
                <DeleteButton
                  onDelete={() => clearImage(word)}
                  tooltipText="Удалить иконку"
                  dialogTitle="Удалить иконку?"
                  dialogDescription="Это действие нельзя отменить. Иконка будет удалена."
                  className="h-8 w-8"
                  disabled={isGeneratingImage}
                />
              )}
            </div>
          </div>
        );
      },
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
      size: 110,
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
        const word = row.original;
        const category = word.category;
        const isVerb = category === 'פועל';
        const binyan = word.binyan;
        const binyanHebrew = binyan ? BINYAN_HEBREW[binyan] || binyan : null;
        
        return (
          <div className="flex flex-col gap-0.5">
            <span className={`px-2 py-0.5 inline-flex text-xs leading-tight font-semibold rounded-full w-fit
            ${category === 'פועל' ? 'bg-blue-100 text-blue-800' :
                category === 'שם עצם' ? 'bg-green-100 text-green-800' :
                  category === 'שם תואר' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'}`}
            >
              {category}
            </span>
            {isVerb && binyanHebrew && (
              <span className="text-[10px] text-gray-500 px-1" dir="rtl">
                {binyanHebrew}
              </span>
            )}
          </div>
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
