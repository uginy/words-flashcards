import React, { MouseEvent } from 'react';
import { Volume2 } from 'lucide-react';
import { IconButton } from '@/components/IconButton';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

interface SpeakerIconProps {
  text: string;
  lang?: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon" | "speaker"
}

export const SpeakerIcon: React.FC<SpeakerIconProps> = ({
  text,
  lang = 'he-IL',
  className,
  size = "icon"
}) => {
  const { speak, isSupported, error } = useSpeechSynthesis({ text, lang });

  if (!isSupported) {
    return null;
  }

  const tooltip = error 
    ? 'Failed to speak text' 
    : 'Click to hear pronunciation';

  return (
    <IconButton
      icon={<Volume2 className="h-4 w-4" />}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        speak();
      }}
      tooltip={tooltip}
      className={className}
      variant="ghost"
      size={size}
      aria-label="Listen to pronunciation"
    />
  );
};