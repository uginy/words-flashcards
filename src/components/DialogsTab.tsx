import type React from 'react';
import { useState } from 'react';
import { Plus, List, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogGenerator } from './DialogGenerator';
import { DialogsList } from './DialogsList';
import { DialogInterface } from './DialogInterface';
import { useDialogsStore } from '../store/dialogsStore';
import { cn } from '@/lib/utils';
import type { Dialog } from '../types';

type ViewMode = 'list' | 'generator' | 'study';

interface DialogsTabProps {
  className?: string;
}

export const DialogsTab: React.FC<DialogsTabProps> = ({ className }) => {
  const { dialogs } = useDialogsStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDialog, setSelectedDialog] = useState<Dialog | null>(null);

  const handleDialogSelect = (dialog: Dialog) => {
    setSelectedDialog(dialog);
    setViewMode('study');
  };

  const handleBackToList = () => {
    setSelectedDialog(null);
    setViewMode('list');
  };

  const handlePreviousDialog = () => {
    if (!selectedDialog) return;
    
    const currentIndex = dialogs.findIndex(d => d.id === selectedDialog.id);
    if (currentIndex > 0) {
      setSelectedDialog(dialogs[currentIndex - 1]);
    }
  };

  const handleNextDialog = () => {
    if (!selectedDialog) return;
    
    const currentIndex = dialogs.findIndex(d => d.id === selectedDialog.id);
    if (currentIndex < dialogs.length - 1) {
      setSelectedDialog(dialogs[currentIndex + 1]);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {viewMode === 'study' && selectedDialog ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="mr-2"
              >
                ← Назад к списку
              </Button>
            ) : (
              <h1 className="text-2xl font-semibold">Диалоги</h1>
            )}
          </div>

          {viewMode !== 'study' && (
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4 mr-2" />
                Список
              </Button>
              
              <Button
                variant={viewMode === 'generator' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('generator')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать
              </Button>
            </div>
          )}
        </div>

        {/* Study mode header */}
        {viewMode === 'study' && selectedDialog && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium text-right">{selectedDialog.title}</h2>
                <p className="text-sm text-muted-foreground">{selectedDialog.titleRu}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Уровень: {selectedDialog.level}</span>
                <span>•</span>
                <span>{selectedDialog.cards.length} реплик</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'list' && (
          <div className="h-full overflow-y-auto p-4">
            <DialogsList onDialogSelect={handleDialogSelect} />
          </div>
        )}

        {viewMode === 'generator' && (
          <div className="h-full overflow-y-auto p-4">
            <div className="max-w-2xl mx-auto">
              <DialogGenerator />
            </div>
          </div>
        )}

        {viewMode === 'study' && selectedDialog && (
          <DialogInterface
            dialog={selectedDialog}
            onPrevious={
              dialogs.findIndex(d => d.id === selectedDialog.id) > 0
                ? handlePreviousDialog
                : undefined
            }
            onNext={
              dialogs.findIndex(d => d.id === selectedDialog.id) < dialogs.length - 1
                ? handleNextDialog
                : undefined
            }
            className="h-full"
          />
        )}
      </div>

      {/* Empty state for list view */}
      {viewMode === 'list' && dialogs.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <Play className="mx-auto h-16 w-16 text-muted-foreground/50" />
            <p className="mt-2 text-muted-foreground">
              Создайте свой первый диалог с помощью генератора. Диалоги помогут вам 
              изучать иврит в контексте реальных разговоров.
            </p>
            <Button
              className="mt-4"
              onClick={() => setViewMode('generator')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать диалог
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};