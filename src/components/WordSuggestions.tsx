import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from '../hooks/use-toast';
import { fetchSuggestedWords } from '../services/wordSuggestions';
import { useWordsStore } from '../store/wordsStore';

interface WordSuggestionsProps {
  onWordsReceived: (words: string) => void;
  apiKey: string;
  modelIdentifier: string;
}

const LEVELS = [
  { value: 'alef', label: 'Алеф (א) - Начальный', default: true },
  { value: 'bet', label: 'Бет (ב) - Элементарный' },
  { value: 'gimel', label: 'Гимель (ג) - Средний' },
  { value: 'dalet', label: 'Далет (ד) - Выше среднего' },
  { value: 'hey', label: 'Һей (ה) - Высокий' },
  { value: 'vav', label: 'Вав (ו) - Профессиональный' },
];

const CATEGORIES = [
  { value: 'verb', label: 'Глагол (פועל)' },
  { value: 'noun', label: 'Существительное (שם עצם)' },
  { value: 'adjective', label: 'Прилагательное (שם תואר)' },
  { value: 'phrases', label: 'Фразы (פרזות)' },
  { value: 'other', label: 'Другое (אחר)' },
];

const getCatLabel = (value: string) => CATEGORIES?.find(el => el.value === value)?.label ?? CATEGORIES[0].label;
const getLevelLabel = (value: string) => LEVELS?.find(el => el.value === value)?.label ?? LEVELS[0].label;

export const WordSuggestions: React.FC<WordSuggestionsProps> = ({
  onWordsReceived,
  apiKey,
  modelIdentifier,
}) => {
  const [level, setLevel] = useState(() => LEVELS.find(l => l.default)?.value || LEVELS[0].value);
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [wordCount, setWordCount] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const words = useWordsStore(state => state.words);

  const handleSuggestWords = async () => {
    setIsLoading(true);
    try {
      // Получаем все предложенные слова от LLM
      const allSuggestedWords = await fetchSuggestedWords({
        category: getCatLabel(category),
        level: getLevelLabel(level),
        apiKey,
        modelIdentifier,
        count: wordCount,
      });

      // Проверяем дубликаты с существующими словами
      const existingWords = words.map(word => word.hebrew);
      const uniqueWords = allSuggestedWords.filter(word => 
        !existingWords.includes(word)
      );

      const duplicatesCount = allSuggestedWords.length - uniqueWords.length;

      if (uniqueWords.length > 0) {
        onWordsReceived(uniqueWords.join('\n'));
        
        // Формируем сообщение с учетом дубликатов
        let description = `${uniqueWords.length} слов предложено и вставлено в поле для дальнейшей обработки`;
        if (duplicatesCount > 0) {
          description += `. Исключено ${duplicatesCount} дубликатов из ${allSuggestedWords.length} предложенных`;
        }
        
        toast({
          title: 'Слова предложены!',
          description,
          variant: 'info',
          duration: 2000
        });
      } else if (duplicatesCount > 0) {
        toast({
          title: 'Внимание',
          description: `Все ${allSuggestedWords.length} предложенных слов уже есть в вашей коллекции`,
          variant: 'warning',
          duration: 2000
        });
      } else {
        toast({
          title: 'Внимание',
          description: 'Не удалось получить слова',
          variant: 'warning',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('Error fetching suggested words:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось получить слова',
        variant: 'error',
        duration: 2000
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-row gap-4 mb-4">
      <div className="flex gap-4">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Выберите категорию" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Выберите уровень" />
          </SelectTrigger>
          <SelectContent>
            {LEVELS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-4 items-center">
        <span className="text-sm text-gray-700">Cлов:</span>
        <Input
          type="number"
          min="1"
          max="40"
          value={wordCount}
          onChange={(e) => {
            const value = Number.parseInt(e.target.value, 10);
            if (Number.isInteger(value) && value >= 1 && value <= 40) {
              setWordCount(value);
            }
          }}
          className="w-24"
        />
      </div>

      <Button
        onClick={handleSuggestWords}
        disabled={isLoading}
        className="w-full"
        variant="outline"
      >
        {isLoading ? 'Загрузка...' : 'Предложить новые слова'}
      </Button>
    </div>
  );
};
