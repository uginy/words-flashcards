import React, { useState } from 'react';
import { Word, WordCategory } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditWordDialogProps {
  word: Word;
  isOpen: boolean;
  onClose: () => void;
  onSave: (word: Word) => void;
}

const EditWordDialog: React.FC<EditWordDialogProps> = ({
  word,
  isOpen,
  onClose,
  onSave,
}) => {
  const [editedWord, setEditedWord] = useState<Word>(word);

  const handleSave = () => {
    onSave(editedWord);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактировать слово</DialogTitle>
          <DialogDescription>
            Измените информацию о слове. Нажмите сохранить, когда закончите.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="hebrew" className="text-right">
              Иврит
            </label>
            <input
              id="hebrew"
              className="col-span-3 px-3 py-2 border rounded-md"
              value={editedWord.hebrew}
              dir="rtl"
              onChange={(e) =>
                setEditedWord({ ...editedWord, hebrew: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="russian" className="text-right">
              Перевод
            </label>
            <input
              id="russian"
              className="col-span-3 px-3 py-2 border rounded-md"
              value={editedWord.russian}
              onChange={(e) =>
                setEditedWord({ ...editedWord, russian: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="transcription" className="text-right">
              Транскрипция
            </label>
            <input
              id="transcription"
              className="col-span-3 px-3 py-2 border rounded-md"
              value={editedWord.transcription}
              onChange={(e) =>
                setEditedWord({ ...editedWord, transcription: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="category" className="text-right">
              Категория
            </label>
            <Select
              value={editedWord.category}
              onValueChange={(value: WordCategory) =>
                setEditedWord({ ...editedWord, category: value })
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="שם עצם">Существительное (שם עצם)</SelectItem>
                <SelectItem value="פועל">Глагол (פועל)</SelectItem>
                <SelectItem value="שם תואר">Прилагательное (שם תואר)</SelectItem>
                <SelectItem value="אחר">Другое (אחר)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {editedWord.conjugations && (
            <div className="grid grid-cols-4 items-start gap-4">
              <label className="text-right">
                Спряжения
              </label>
              <div className="col-span-3">
                <textarea
                  className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                  value={JSON.stringify(editedWord.conjugations, null, 2)}
                  onChange={(e) => {
                    try {
                      const conjugations = JSON.parse(e.target.value);
                      setEditedWord({ ...editedWord, conjugations });
                    } catch (error) {
                      console.error(error)
                      // Ignore invalid JSON while typing
                    }
                  }}
                />
              </div>
            </div>
          )}
          {editedWord.example && (
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="example" className="text-right">
                Пример
              </label>
              <input
                id="example"
                className="col-span-3 px-3 py-2 border rounded-md"
                value={editedWord.example}
                dir="rtl"
                onChange={(e) =>
                  setEditedWord({ ...editedWord, example: e.target.value })
                }
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <button
            className="px-4 py-2 text-white bg-gray-500 rounded hover:bg-gray-600"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
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

export default EditWordDialog;
