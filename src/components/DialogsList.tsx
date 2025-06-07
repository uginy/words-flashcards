import type React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { Search, Play, Trash2, Edit, MoreVertical, Users, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EmojiAvatar } from './EmojiAvatar';
import { useDialogsStore } from '@/store/dialogsStore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Dialog, DialogLevel } from '../types';

const DIALOG_LEVELS: DialogLevel[] = ['אלף', 'בית', 'גימל', 'דלת', 'הא'];

interface DialogsListProps {
  onDialogSelect?: (dialog: Dialog) => void;
  onDialogEdit?: (dialog: Dialog) => void;
  className?: string;
}

export const DialogsList: React.FC<DialogsListProps> = ({
  onDialogSelect,
  onDialogEdit,
  className
}) => {
  const { dialogs, deleteDialog, getDialogStats, generateMissingAvatars } = useDialogsStore();
  const { toast } = useToast();

  // Generate avatars for dialogs that don't have them
  useEffect(() => {
    const hasDialogsWithoutAvatars = dialogs.some(dialog => 
      dialog.participants.some(participant => !participant.avatar)
    );
    
    if (hasDialogsWithoutAvatars) {
      generateMissingAvatars();
    }
  }, [dialogs, generateMissingAvatars]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<DialogLevel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'learned' | 'not-learned' | 'needs-review'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'level'>('date');

  // Filtered and sorted dialogs
  const filteredDialogs = useMemo(() => {
    let filtered = dialogs.filter(dialog => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!dialog.title.toLowerCase().includes(query) && 
            !dialog.titleRu.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Level filter
      if (levelFilter !== 'all' && dialog.level !== levelFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        switch (statusFilter) {
          case 'learned':
            if (!dialog.isLearned) return false;
            break;
          case 'not-learned':
            if (dialog.isLearned) return false;
            break;
          case 'needs-review':
            if (!dialog.isLearned || !dialog.nextReview || dialog.nextReview > Date.now()) {
              return false;
            }
            break;
        }
      }

      return true;
    });

    // Sort dialogs
    switch (sortBy) {
      case 'title':
        filtered = filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'level':
        filtered = filtered.sort((a, b) => DIALOG_LEVELS.indexOf(a.level) - DIALOG_LEVELS.indexOf(b.level));
        break;
      default:
        filtered = filtered.sort((a, b) => b.dateAdded - a.dateAdded);
        break;
    }

    return filtered;
  }, [dialogs, searchQuery, levelFilter, statusFilter, sortBy]);

  const stats = getDialogStats();

  const handleDeleteDialog = async (dialog: Dialog) => {
    if (window.confirm(`Удалить диалог "${dialog.title}"?`)) {
      deleteDialog(dialog.id);
      toast({
        title: 'Диалог удален',
        description: `Диалог "${dialog.title}" был удален`,
        variant: 'info'
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (dialog: Dialog) => {
    if (!dialog.isLearned) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
          Новый
        </span>
      );
    }

    if (dialog.nextReview && dialog.nextReview <= Date.now()) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
          Повторить
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
        Изучен
      </span>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Диалоги</h2>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Всего: {stats.total}</span>
            <span>Изучено: {stats.learned}</span>
            <span>Требует повторения: {stats.needReview}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Поиск по названию диалога..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Level filter */}
        <Select value={levelFilter} onValueChange={(value: DialogLevel | 'all') => setLevelFilter(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все уровни</SelectItem>
            {DIALOG_LEVELS.map(level => (
              <SelectItem key={level} value={level}>{level}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={(value: typeof statusFilter) => setStatusFilter(value)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="not-learned">Не изучены</SelectItem>
            <SelectItem value="learned">Изучены</SelectItem>
            <SelectItem value="needs-review">Требует повторения</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">По дате</SelectItem>
            <SelectItem value="title">По названию</SelectItem>
            <SelectItem value="level">По уровню</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dialogs list */}
      {filteredDialogs.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-2 text-sm font-semibold text-muted-foreground">Диалоги не найдены</h3>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDialogs.map((dialog) => (
            <div
              key={dialog.id}
              className="border rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer group"
              onClick={() => onDialogSelect?.(dialog)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onDialogSelect?.(dialog);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Открыть диалог ${dialog.title}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-right mb-1 group-hover:text-primary transition-colors">
                    {dialog.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {dialog.titleRu}
                  </p>
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48" align="end">
                    <div className="space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDialogSelect?.(dialog);
                        }}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Изучать
                      </Button>
                      {onDialogEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDialogEdit(dialog);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Редактировать
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDialog(dialog);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Удалить
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{dialog.participants.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>{dialog.cards.length}</span>
                </div>
                <span className="bg-secondary px-2 py-0.5 rounded">
                  {dialog.level}
                </span>
              </div>

              {/* Participants avatars */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-muted-foreground">Участники:</span>
                <div className="flex -space-x-2">
                  {dialog.participants.map((participant) => (
                    <EmojiAvatar
                      key={participant.id}
                      participant={participant}
                      size="sm"
                      style="circle"
                      className="border-2 border-background"
                    />
                  ))}
                </div>
              </div>

              {/* Status and date */}
              <div className="flex items-center justify-between">
                {getStatusBadge(dialog)}
                <span className="text-xs text-muted-foreground">
                  {formatDate(dialog.dateAdded)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};