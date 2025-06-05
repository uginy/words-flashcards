import type React from 'react';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Minus, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDialogsStore } from '@/store/dialogsStore';
import { useWordsStore } from '../store/wordsStore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { DialogLevel, DialogParticipant, DialogGenerationSettings, ParticipantGender } from '../types';

const DIALOG_LEVELS: DialogLevel[] = ['אלף', 'בית', 'גימל', 'דלת', 'הא'];

const PARTICIPANT_NAMES = {
  male: ['דוד', 'יוסי', 'משה', 'אברהם', 'יצחק'],
  female: ['שרה', 'רחל', 'מרים', 'לאה', 'דינה']
};

type ViewMode = 'list' | 'generator' | 'study';

interface DialogGeneratorProps {
  className?: string;
  setViewMode: (_k: ViewMode) => void;
}

export const DialogGenerator: React.FC<DialogGeneratorProps> = ({ className, setViewMode }) => {
  const { t } = useTranslation();
  const { words } = useWordsStore();
  const { generateDialog, isBackgroundProcessing } = useDialogsStore();
  const { toast } = useToast();

  // Form state
  const [level, setLevel] = useState<DialogLevel>('אלף');
  const [participantCount, setParticipantCount] = useState<2 | 3>(2);
  const [participants, setParticipants] = useState<DialogParticipant[]>([
    {
      id: '1',
      name: 'דוד',
      gender: 'male'
    },
    {
      id: '2', 
      name: 'שרה',
      gender: 'female'
    }
  ]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [wordsPopoverOpen, setWordsPopoverOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [useExistingWords, setUseExistingWords] = useState(true);
  const [includeNewWords, setIncludeNewWords] = useState(true);

  // Filter words for selection
  const availableWords = useMemo(() => {
    return words.filter(word => 
      word.category !== 'דיאלוג' && // Exclude dialog category words
      word.hebrew.trim() !== ''
    );
  }, [words]);

  const selectedWordsData = useMemo(() => {
    return selectedWords.map(wordId => 
      availableWords.find(w => w.id === wordId)
    ).filter(Boolean);
  }, [selectedWords, availableWords]);

  // Update participants when count changes
  const updateParticipantCount = (count: 2 | 3) => {
    setParticipantCount(count);
    
    if (count === 2) {
      setParticipants(prev => prev.slice(0, 2));
    } else if (count === 3 && participants.length === 2) {
      setParticipants(prev => [...prev, {
        id: '3',
        name: 'משה',
        gender: 'male'
      }]);
    }
  };

  // Update participant
  const updateParticipant = (index: number, field: keyof DialogParticipant, value: string) => {
    setParticipants(prev => prev.map((participant, i) => 
      i === index ? { ...participant, [field]: value } : participant
    ));
  };

  // Toggle word selection
  const toggleWordSelection = (wordId: string) => {
    setSelectedWords(prev => 
      prev.includes(wordId) 
        ? prev.filter(id => id !== wordId)
        : [...prev, wordId]
    );
  };

  // Clear word selection
  const clearWordSelection = () => {
    setSelectedWords([]);
  };

  // Handle form submission
  const handleGenerate = async () => {
    if (participants.length !== participantCount) {
      toast({
        title: t('common.error'),
        description: t('dialogs.participantsNotConfigured'),
        variant: 'error'
      });
      return;
    }

    // Validate participant names
    for (const participant of participants) {
      if (!participant.name.trim()) {
        toast({
          title: t('common.error'),
          description: t('dialogs.participantNamesRequired'),
          variant: 'error'
        });
        return;
      }
    }

    const settings: DialogGenerationSettings = {
      level,
      participantCount,
      participants,
      useExistingWords,
      includeNewWords,
      wordsToUse: selectedWords,
      topic: topic.trim() || undefined
    };

    try {
      await generateDialog(settings, toast);
      setViewMode('list')
    } catch (error) {
      console.error('Dialog generation error:', error);
    }
  };

  return (
    <div className={cn("space-y-6 p-6 bg-background rounded-lg border", className)}>
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5" />
        <h3 className="text-lg font-semibold">{t('dialogs.generateTitle')}</h3>
      </div>

      {/* Level selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('dialogs.difficultyLevel')}</label>
        <Select value={level} onValueChange={(value: DialogLevel) => setLevel(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIALOG_LEVELS.map(lvl => (
              <SelectItem key={lvl} value={lvl}>
                {lvl}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Participant count */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('dialogs.participantCount')}</label>
        <div className="flex gap-2">
          <Button
            variant={participantCount === 2 ? "default" : "outline"}
            size="sm"
            onClick={() => updateParticipantCount(2)}
          >
            2 {t('dialogs.participants')}
          </Button>
          <Button
            variant={participantCount === 3 ? "default" : "outline"}
            size="sm"
            onClick={() => updateParticipantCount(3)}
          >
            3 {t('dialogs.participants')}
          </Button>
        </div>
      </div>

      {/* Participants configuration */}
      <div className="space-y-3">
        <label className="text-sm font-medium">{t('dialogs.dialogParticipants')}</label>
        {participants.map((participant, index) => (
          <div key={participant.id} className="flex items-center gap-3 p-3 border rounded-lg">
            <span className="text-sm font-medium min-w-0">#{index + 1}</span>
            
            <Input
              placeholder={t('dialogs.participantName')}
              value={participant.name}
              onChange={(e) => updateParticipant(index, 'name', e.target.value)}
              className="flex-1"
            />
            
            <Select 
              value={participant.gender} 
              onValueChange={(value: ParticipantGender) => updateParticipant(index, 'gender', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Мужской</SelectItem>
                <SelectItem value="female">Женский</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const names = PARTICIPANT_NAMES[participant.gender];
                const randomName = names[Math.floor(Math.random() * names.length)];
                updateParticipant(index, 'name', randomName);
              }}
              aria-label="Случайное имя"
            >
              🎲
            </Button>
          </div>
        ))}
      </div>

      {/* Topic (optional) */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Тема диалога (опционально)</label>
        <Input
          placeholder="Например: В кафе, В магазине, Знакомство..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      </div>

      {/* Word selection options */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Использование слов</label>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useExistingWords}
              onChange={(e) => setUseExistingWords(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Использовать слова из коллекции</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeNewWords}
              onChange={(e) => setIncludeNewWords(e.target.checked)}
              className="rounded"
            />
            <div className="flex flex-col">
              <span className="text-sm">Включать новые слова</span>
              <span className="text-xs text-muted-foreground">
                Если включено, ИИ может использовать новые слова, которых нет в вашей коллекции
              </span>
            </div>
          </label>
        </div>

        {/* Word selector */}
        {useExistingWords && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Выбранные слова ({selectedWords.length})
              </span>
              {selectedWords.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearWordSelection}
                >
                  Очистить
                </Button>
              )}
            </div>

            <Popover open={wordsPopoverOpen} onOpenChange={setWordsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={wordsPopoverOpen}
                  className="justify-between"
                >
                  Выбрать слова из коллекции
                  <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Поиск слов..." />
                  <CommandEmpty>Слова не найдены.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {availableWords.slice(0, 50).map((word) => (
                        <CommandItem
                          key={word.id}
                          onSelect={() => {
                            toggleWordSelection(word.id);
                          }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="text-right">
                              <div className="font-medium">{word.hebrew}</div>
                              <div className="text-xs text-muted-foreground">{word.russian}</div>
                            </div>
                            <div className="flex items-center">
                              {selectedWords.includes(word.id) && (
                                <span className="text-green-600">✓</span>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Selected words display */}
            {selectedWordsData.length > 0 && (
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded">
                {selectedWordsData.map((word) => (
                  <div
                    key={word?.id}
                    className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-sm"
                  >
                    <span className="text-right">{word?.hebrew}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => word && toggleWordSelection(word.id)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={isBackgroundProcessing}
        className="w-full"
        size="lg"
      >
        {isBackgroundProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Генерируется диалог...
          </>
        ) : (
          'Создать диалог'
        )}
      </Button>
    </div>
  );
};