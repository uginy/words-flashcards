import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface IconButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
  badge?: number;
  popoverContent?: React.ReactNode;
  className?: string;
  variant?: "ghost" | "default" | "destructive" | "outline" | "secondary" | "link";
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  tooltip,
  onClick,
  badge,
  popoverContent,
  className = "h-6 w-6",
  variant = "ghost",
}) => {
  const button = (
    <Button
      variant={variant}
      size="icon"
      className={className}
      onClick={onClick}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
          {badge}
        </span>
      )}
    </Button>
  );

  const withTooltip = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (popoverContent) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          {withTooltip}
        </PopoverTrigger>
        <PopoverContent className="w-auto max-w-[600px]" align="start">
          {popoverContent}
        </PopoverContent>
      </Popover>
    );
  }

  return withTooltip;
};
