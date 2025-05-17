import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DeleteButtonProps {
  onDelete: () => void;
  tooltipText: string;
  dialogTitle: string;
  dialogDescription: string;
  variant?: "ghost" | "destructive" | "secondary";
  size?: "icon" | "default" | "sm" | "lg";
  className?: string;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({
  onDelete,
  tooltipText,
  dialogTitle,
  dialogDescription,
  variant = "ghost",
  size = "icon",
  className = "h-8 w-8",
}) => {
  return (
    <TooltipProvider>
      <AlertDialog>
        <div className="flex items-center">
          <Tooltip>
            <AlertDialogTrigger asChild>
              <TooltipTrigger asChild>
                <Button
                  variant={variant}
                  size={size}
                  className={`${className} ${variant === "ghost" ? "text-red-600 hover:text-red-900" : ""}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
            </AlertDialogTrigger>
            <TooltipContent>
              <p>{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};
