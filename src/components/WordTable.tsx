import React, { useState } from 'react';
import { Word } from '../types';

interface WordTableProps {
  words: Word[];
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
  const [filter, setFilter] = useState<'all' | 'learned' | 'not-learned'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const filteredWords = words.filter(word => {
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
  const categories = ['all', ...new Set(words.map(w => w.category))];
  
  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Список слов</h3>
          
          <div className="flex flex-wrap gap-2 sm:flex-row">
            <div className="mr-4">
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Статус:
              </label>
              <select
                id="status-filter"
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
              >
                <option value="all">Все слова</option>
                <option value="learned">Изученные</option>
                <option value="not-learned">Неизученные</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Категория:
              </label>
              <select
                id="category-filter"
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Все категории</option>
                {categories.filter(c => c !== 'all').map(category => (
                  <option key={category} value={category}>
                    {category === 'verb' ? 'Глаголы' : 
                     category === 'noun' ? 'Существительные' : 
                     category === 'adjective' ? 'Прилагательные' : 'Другое'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
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