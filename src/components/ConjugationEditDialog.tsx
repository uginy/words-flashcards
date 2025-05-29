import React, { useState, useEffect } from 'react';
import { Word } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import ConjugationEditor from './ConjugationEditor';

interface ConjugationEditDialogProps {
  word: Word;
  isOpen: boolean;
  onClose: () => void;
  onSave: (word: Word) => void;
}

const ConjugationEditDialog: React.FC<ConjugationEditDialogProps> = ({
  word,
  isOpen,
  onClose,
  onSave,
}) => {
  // console.log('🔍 DEBUG ConjugationEditDialog - word.conjugations:', word.conjugations);

  const [editedConjugations, setEditedConjugations] = useState<{
    past?: { [pronoun: string]: string } | null;
    present?: { [pronoun: string]: string } | null;
    future?: { [pronoun: string]: string } | null;
    imperative?: { [pronoun: string]: string } | null;
  } | null>(word.conjugations || null);

  useEffect(() => {
    // console.log('🔍 DEBUG ConjugationEditDialog - useEffect triggered, word.conjugations:', word.conjugations);
    setEditedConjugations(word.conjugations || null);
  }, [word]);

  const handleSave = () => {
    // console.log('🔍 DEBUG handleSave - editedConjugations:', editedConjugations);
    const updatedWord = {
      ...word,
      conjugations: editedConjugations,
    };
    // console.log('🔍 DEBUG handleSave - updatedWord:', updatedWord);
    onSave(updatedWord);
    onClose();
  };

  const handleConjugationsChange = (conjugations: {
    past?: { [pronoun: string]: string } | null;
    present?: { [pronoun: string]: string } | null;
    future?: { [pronoun: string]: string } | null;
    imperative?: { [pronoun: string]: string } | null;
  } | null) => {
    setEditedConjugations(conjugations);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать спряжения - {word.hebrew}</DialogTitle>
          <DialogDescription>
            <div className="space-y-1">
              <div>Измените спряжения глагола. Нажмите сохранить, когда закончите.</div>
              <div className="font-medium text-gray-700">Перевод: {word.russian}</div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ConjugationEditor
            conjugations={editedConjugations}
            onConjugationsChange={handleConjugationsChange}
          />
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

export default ConjugationEditDialog;