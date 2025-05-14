import React, { useState, useRef } from 'react'; // Removed unused useEffect
import toast from 'react-hot-toast'; // For notifications
import { Word } from '../types';
import { useWords } from '../hooks/useWords'; // Import useWords
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; // shadcn/ui Select

interface WordTableProps {
  words: Word[]; // This prop contains filtered words, for export we'll use all words from the hook
  onMarkLearned: (id: string) => void;
  onMarkNotLearned: (id: string) => void;
  onDeleteWord: (id: string) => void;
}

const WordTable: React.FC<WordTableProps> = ({ 
  words, 
  onMarkLearned, 
  onMarkNotLearned, 
  onDeleteWord
}) => {
  const { words: allWords, replaceAllWords } = useWords(); // Get all words for export and replaceAllWords
  const [filter, setFilter] = useState<'all' | 'learned' | 'not-learned'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the file input
 
  // Function to handle word export
  const handleExportWords = () => {
    if (!allWords || allWords.length === 0) {
      alert('Нет слов для экспорта.'); // Or use a more sophisticated notification
      return;
    }

    // Convert words array to JSON string
    const jsonString = JSON.stringify(allWords, null, 2); // null, 2 for pretty printing
    // Create a Blob from the JSON string
    const blob = new Blob([jsonString], { type: 'application/json' });
    // Create an object URL for the Blob
    const url = URL.createObjectURL(blob);
    // Create a temporary anchor element
    const a = document.createElement('a');
    // Set the anchor's href attribute to the object URL
    a.href = url;
    // Set the anchor's download attribute to a filename
    a.download = 'words-flashcards-export.json';
    // Programmatically click the anchor element to trigger the download
    document.body.appendChild(a); // Append to body to ensure it's clickable
    a.click();
    // Clean up by removing the anchor and revoking the object URL
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Function to handle word import
  const handleImportWords = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          toast.error('Не удалось прочитать файл.');
          return;
        }
        const parsedWords = JSON.parse(content);

        // Validate structure of parsedWords
        if (!Array.isArray(parsedWords) || !parsedWords.every(word =>
            typeof word.id === 'string' &&
            typeof word.hebrew === 'string' &&
            typeof word.russian === 'string' &&
            // Add other essential property checks if needed
            // For example: typeof word.transcription === 'string', typeof word.category === 'string', typeof word.learned === 'boolean'
            Object.prototype.hasOwnProperty.call(word, 'id') && Object.prototype.hasOwnProperty.call(word, 'hebrew') && Object.prototype.hasOwnProperty.call(word, 'russian')
        )) {
          toast.error('Неверный формат файла. Убедитесь, что это JSON массив объектов Word.');
          return;
        }
        
        replaceAllWords(parsedWords as Word[]);
        toast.success('Слова успешно импортированы!');
      } catch (error) {
        console.error("Ошибка при импорте слов:", error);
        toast.error('Ошибка при импорте слов. Проверьте консоль для деталей.');
      } finally {
        // Reset file input to allow importing the same file again
        if (event.target) {
          event.target.value = '';
        }
      }
    };

    reader.onerror = () => {
      toast.error('Ошибка при чтении файла.');
      if (event.target) {
        event.target.value = '';
      }
    };

    reader.readAsText(file);
  };
  
  const filteredWords = allWords.filter(word => {
    const matchesLearnedFilter = 
      filter === 'all' || 
      (filter === 'learned' && word.learned) || 
      (filter === 'not-learned' && !word.learned);
      
    const matchesCategoryFilter = 
      categoryFilter === 'all' || 
      word.category === categoryFilter;
      
    return matchesLearnedFilter && matchesCategoryFilter;
  });
  
  const sortedWords = [...filteredWords].sort((a, b) => {
    // Sort by category first, then by Hebrew
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.hebrew.localeCompare(b.hebrew);
  });
  
  // Get unique categories from words
  const categories = ['all', ...new Set(allWords.map(w => w.category))];
  
  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-800">Список слов</h3>
            <div className="flex gap-2 items-center"> {/* Added items-center */}
              <button
                type="button" // Added explicit type
                onClick={handleExportWords} // Connect the export function
                className="px-4 h-9 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              >
                Экспорт слов
              </button>
              <div>
                <label
                  htmlFor="import-file"
                  className="cursor-pointer px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                >
                  Импорт слов
                </label>
                <input
                  id="import-file"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportWords}
                  ref={fileInputRef} // Assign ref
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 sm:flex-row">
            <div className="mr-4">
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Статус:
              </label>
              <Select
                value={filter}
                onValueChange={(value) => setFilter(value as 'all' | 'learned' | 'not-learned')}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все слова</SelectItem>
                  <SelectItem value="learned">Изученные</SelectItem>
                  <SelectItem value="not-learned">Неизученные</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Категория:
              </label>
              <Select
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Категория" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  {categories.filter(c => c !== 'all').map(category => (
                    <SelectItem key={category} value={category}>
                      {category === 'verb' ? 'Глаголы' :
                       category === 'noun' ? 'Существительные' :
                       category === 'adjective' ? 'Прилагательные' : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto mb-5">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Иврит
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Перевод
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Транскрипция
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Категория
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedWords.length > 0 ? (
                sortedWords.map((word) => (
                  <tr key={word.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-base font-medium text-gray-900" dir="rtl">{word.hebrew}</div>
                      {word.conjugation && (
                        <div className="text-xs text-gray-500 mt-1" dir="rtl">{word.conjugation}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{word.russian}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{word.transcription}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${word.category === 'verb' ? 'bg-blue-100 text-blue-800' : 
                          word.category === 'noun' ? 'bg-green-100 text-green-800' : 
                          word.category === 'adjective' ? 'bg-purple-100 text-purple-800' : 
                          'bg-gray-100 text-gray-800'}`}
                      >
                        {word.category === 'verb' ? 'глагол' : 
                         word.category === 'noun' ? 'сущ.' : 
                         word.category === 'adjective' ? 'прил.' : 'другое'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        word.learned ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {word.learned ? 'Изучено' : 'Не изучено'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      {word.learned ? (
                        <button
                          onClick={() => onMarkNotLearned(word.id)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Повторить
                        </button>
                      ) : (
                        <button
                          onClick={() => onMarkLearned(word.id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Отметить изученным
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteWord(word.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
                    Нет слов, соответствующих фильтрам
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WordTable;