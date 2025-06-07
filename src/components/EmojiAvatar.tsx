import type React from 'react';
import { cn } from '@/lib/utils';
import { generateSimpleEmojiAvatar, svgToDataUrl } from '@/utils/avatarGenerator';
import type { DialogParticipant } from '../types';

interface EmojiAvatarProps {
  participant: DialogParticipant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showName?: boolean;
  style?: 'emoji' | 'circle' | 'square';
}

const sizeClasses = {
  sm: 'w-6 h-6 text-sm',
  md: 'w-8 h-8 text-lg',
  lg: 'w-12 h-12 text-2xl',
  xl: 'w-16 h-16 text-4xl'
};

const nameClasses = {
  sm: 'text-xs max-w-12',
  md: 'text-xs max-w-16',
  lg: 'text-sm max-w-20',
  xl: 'text-base max-w-24'
};

export const EmojiAvatar: React.FC<EmojiAvatarProps> = ({
  participant,
  size = 'md',
  className,
  showName = false,
  style = 'circle'
}) => {
  const sizeClass = sizeClasses[size];
  const nameClass = nameClasses[size];

  const renderAvatar = () => {
    // Get emoji for this participant
    const emoji = participant.avatar && participant.avatar.length <= 4 
      ? participant.avatar // If avatar is already an emoji
      : generateSimpleEmojiAvatar(participant.name, participant.gender);

    if (style === 'emoji') {
      // Pure emoji without background
      return (
        <span className={cn("flex items-center justify-center", sizeClass, className)}>
          {emoji}
        </span>
      );
    }

    // With background (circle or square)
    const backgroundClass = style === 'circle' ? 'rounded-full' : 'rounded-lg';
    const bgColor = participant.gender === 'male' 
      ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
      : 'bg-pink-50 border-pink-200 dark:bg-pink-950 dark:border-pink-800';

    // If we have an SVG avatar, use it
    if (participant.avatar?.includes('<svg')) {
      const avatarSrc = svgToDataUrl(participant.avatar);
      return (
        <img
          src={avatarSrc}
          alt={`Avatar for ${participant.name}`}
          className={cn(backgroundClass, sizeClass, className)}
        />
      );
    }

    // Emoji with background
    return (
      <div
        className={cn(
          "flex items-center justify-center border-2",
          backgroundClass,
          bgColor,
          sizeClass,
          className
        )}
      >
        <span className="text-center">
          {emoji}
        </span>
      </div>
    );
  };

  if (!showName) {
    return renderAvatar();
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {renderAvatar()}
      <span className={cn("text-muted-foreground text-center break-words", nameClass)}>
        {participant.name}
      </span>
    </div>
  );
};
