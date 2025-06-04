import type React from 'react';
import { useState, useEffect } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogCard } from './DialogCard';
import { useDialogSpeech } from '@/hooks/useDialogSpeech';
import { cn } from '@/lib/utils';
import type { Dialog } from '../types';

interface DialogInterfaceProps {
  dialog: Dialog;
  onPrevious?: () => void;
  onNext?: () => void;
  className?: string;
}

export const DialogInterface: React.FC<DialogInterfaceProps> = ({
  dialog,
  onPrevious,
  onNext,
  className
}) => {
  const [showTranslations, setShowTranslations] = useState(dialog.showTranslation ?? true);
  const [currentCardIndex, setCurrentCardIndex] = useState(-1);

  const {
    isSupported,
    isPlaying,
    isPaused,
    currentCardIndex: speechCardIndex,
    playDialog,
    playSingleCard,
    stopPlayback,
    pausePlayback,
    resumePlayback
  } = useDialogSpeech({
    cards: dialog.cards,
    participants: dialog.participants,
    autoPlay: false,
    playbackSpeed: 1
  });

  // Sync current card index with speech hook
  useEffect(() => {
    setCurrentCardIndex(speechCardIndex);
  }, [speechCardIndex]);

  const handlePlayDialog = () => {
    if (isPlaying && !isPaused) {
      pausePlayback();
    } else if (isPaused) {
      resumePlayback();
    } else {
      playDialog();
    }
  };

  const handlePlayCard = (cardIndex: number) => {
    playSingleCard(cardIndex);
  };

  const handleStop = () => {
    stopPlayback();
    setCurrentCardIndex(-1);
  };

  const toggleTranslations = () => {
    setShowTranslations(!showTranslations);
  };

  const progress = dialog.cards.length > 0 
    ? ((currentCardIndex + 1) / dialog.cards.length) * 100 
    : 0;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-background">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-right mb-1">
              {dialog.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {dialog.titleRu}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs bg-secondary px-2 py-1 rounded">
              {dialog.level}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Прогресс диалога</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Navigation */}
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevious}
              disabled={!onPrevious}
              aria-label="Предыдущий диалог"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={!onNext}
              aria-label="Следующий диалог"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTranslations}
              aria-label={showTranslations ? "Скрыть переводы" : "Показать переводы"}
            >
              {showTranslations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
            
            {isSupported && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayDialog}
                  disabled={dialog.cards.length === 0}
                  aria-label={isPlaying && !isPaused ? "Пауза" : "Воспроизвести диалог"}
                >
                  {isPlaying && !isPaused ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStop}
                  disabled={!isPlaying && !isPaused}
                  aria-label="Остановить"
                >
                  <Square className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dialog cards */}
      <div className="flex-1 overflow-y-auto p-4">
        {dialog.cards.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Диалог пуст</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {dialog.cards
              .sort((a, b) => a.order - b.order)
              .map((card, index) => {
                const participant = dialog.participants.find(p => p.id === card.speaker);
                if (!participant) return null;

                return (
                  <DialogCard
                    key={card.id}
                    card={card}
                    participant={participant}
                    isActive={currentCardIndex === index}
                    showTranslation={showTranslations}
                    onPlay={isSupported ? () => handlePlayCard(index) : undefined}
                    isPlaying={currentCardIndex === index && isPlaying}
                  />
                );
              })}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="flex-shrink-0 p-4 border-t bg-muted/30">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Участники: {dialog.participants.length}</span>
            <span>Реплики: {dialog.cards.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {dialog.isLearned && (
              <span className="text-green-600 dark:text-green-400">✓ Изучен</span>
            )}
            <span>Уровень: {dialog.level}</span>
          </div>
        </div>
      </div>
    </div>
  );
};