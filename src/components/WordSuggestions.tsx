import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from '../hooks/use-toast';
import { fetchSuggestedWords } from '../services/wordSuggestions';

interface WordSuggestionsProps {
  onWordsReceived: (words: string) => void;
  apiKey: string;
  modelIdentifier: string;
}

const LEVELS = [
  { value: 'gimel', label: 'Гимель (ג)', default: true },
  { value: 'alef', label: 'Алеф (א)' },
  { value: 'bet', label: 'Бет (ב)' },
  { value: 'dalet', label: 'Далет (ד)' },
  { value: 'hey', label: 'Һей (ה)' },
  { value: 'vav', label: 'Вав (ו)' },
];

const CATEGORIES = [
  { value: 'verb', label: 'Глагол (פועל)' },
  { value: 'noun', label: 'Существительное (שם עצם)' },
  { value: 'adjective', label: 'Прилагательное (שם תואר)' },
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

  const handleSuggestWords = async () => {
    setIsLoading(true);
    try {
      const words = await fetchSuggestedWords({
        category: getCatLabel(category),
        level: getLevelLabel(level),
        apiKey,
        modelIdentifier,
        count: wordCount,
      });

      if (words.length > 0) {
        onWordsReceived(words.join('\n'));
        toast({
          title: 'Успех!',
          description: `Мы успешно предложили ${words.length} слов и вставили в поле`,
          variant: 'success',
        });
      } else {
        toast({
          title: 'Внимание',
          description: 'Не удалось получить слова',
          variant: 'warning',
        });
      }
    } catch (error) {
      console.error('Error fetching suggested words:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось получить слова',
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 mb-4">
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
        <span className="text-sm text-gray-700">Количество слов:</span>
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