import type React from 'react';
import { Volume2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DialogCard as DialogCardType, DialogParticipant } from '../types';

interface DialogCardProps {
  card: DialogCardType;
  participant: DialogParticipant;
  isActive?: boolean;
  showTranslation?: boolean;
  onPlay?: () => void;
  isPlaying?: boolean;
  className?: string;
}

export const DialogCard: React.FC<DialogCardProps> = ({
  card,
  participant,
  isActive = false,
  showTranslation = true,
  onPlay,
  isPlaying = false,
  className
}) => {
  const handlePlay = () => {
    onPlay?.();
  };

  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border transition-all duration-200",
        isActive && "bg-accent border-primary shadow-sm",
        !isActive && "bg-background hover:bg-accent/50",
        className
      )}
    >
      {/* Participant indicator */}
      <div className="flex flex-col items-center gap-1 min-w-0">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
          participant.gender === 'male' 
            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            : "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200"
        )}>
          <User className="w-4 h-4" />
        </div>
        <span className="text-xs text-muted-foreground text-center break-words">
          {participant.name}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Hebrew text */}
        <div className="text-right mb-2">
          <p className="text-lg font-medium leading-relaxed text-foreground">
            {card.hebrew}
          </p>
        </div>

        {/* Russian translation */}
        {showTranslation && (
          <div className="text-left">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {card.russian}
            </p>
          </div>
        )}
      </div>

      {/* Play button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePlay}
          disabled={!onPlay}
          className={cn(
            "w-10 h-10 rounded-full",
            isPlaying && "bg-primary text-primary-foreground",
            isActive && "ring-2 ring-primary ring-offset-2"
          )}
          aria-label="Воспроизвести реплику"
        >
          <Volume2 className={cn(
            "w-4 h-4",
            isPlaying && "animate-pulse"
          )} />
        </Button>
        {isActive && (
          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
        )}
      </div>
    </div>
  );
};