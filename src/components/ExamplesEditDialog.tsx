import { useState, useEffect } from 'react';
import type { Word } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import ExamplesEditor from './ExamplesEditor';

interface ExamplesEditDialogProps {
  word: Word;
  isOpen: boolean;
  onClose: () => void;
  onSave: (word: Word) => void;
}

const ExamplesEditDialog = ({
  word,
  isOpen,
  onClose,
  onSave,
}: ExamplesEditDialogProps) => {
  const { toast } = useToast();
  // console.log('🔍 DEBUG ExamplesEditDialog - word.examples:', word.examples);

  const [editedExamples, setEditedExamples] = useState<{ hebrew: string; russian: string }[] | null>(
    word.examples || null
  );

  useEffect(() => {
    // console.log('🔍 DEBUG ExamplesEditDialog - useEffect triggered, word.examples:', word.examples);
    setEditedExamples(word.examples || null);
  }, [word]);

  const handleSave = () => {
    // console.log('🔍 DEBUG handleSave - editedExamples:', editedExamples);

    // Проверяем, нет ли пустых примеров перед сохранением
    const hasEmptyExample = editedExamples?.some(
      example => !example.hebrew.trim() || !example.russian.trim()
    );

    if (hasEmptyExample) {
      toast({
        title: "Ошибка",
        description: "Заполните или удалите пустые примеры перед сохранением",
        variant: "destructive"
      });
      return;
    }

    const updatedWord = {
      ...word,
      examples: editedExamples,
    };
    // console.log('🔍 DEBUG handleSave - updatedWord:', updatedWord);
    onSave(updatedWord);
    onClose();
    
    toast({
      title: "Успех",
      description: "Примеры успешно сохранены"
    });
  };

  const handleExamplesChange = (examples: { hebrew: string; russian: string }[] | null) => {
    setEditedExamples(examples);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать примеры - {word.hebrew}</DialogTitle>
          <DialogDescription>
            <div className="space-y-1">
              <div>Добавьте или отредактируйте примеры использования слова. Нажмите сохранить, когда закончите.</div>
              <div className="font-medium text-gray-700">Перевод: {word.russian}</div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ExamplesEditor
            examples={editedExamples}
            onExamplesChange={handleExamplesChange}
          />
        </div>
        <DialogFooter>
          <button
            type="button"
            className="px-4 py-2 text-white bg-gray-500 rounded hover:bg-gray-600"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 ml-2"
            onClick={handleSave}
          >
            Сохранить
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExamplesEditDialog;
