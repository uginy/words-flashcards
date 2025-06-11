import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useWordsStore } from '@/store/wordsStore';
import { useDialogsStore } from '@/store/dialogsStore';
import { Download, Upload, CloudIcon, FileText, MessageSquare, Volume2 } from 'lucide-react';
import type { Word, Dialog } from '@/types';
import { cn } from '@/lib/utils';

interface DataSettings {
  hebrewFlashcardsData: boolean;
  flashcardsDialogs: boolean;
  ttsConfig: boolean;
}

interface ExportData {
  hebrewFlashcardsData?: {
    words?: unknown[];
    [key: string]: unknown;
  } | unknown[];
  flashcardsDialogs?: unknown[];
  ttsConfig?: Record<string, unknown>;
  timestamp: number;
  version: string;
}

interface ImportConflictItem {
  type: 'hebrewFlashcardsData' | 'flashcardsDialogs' | 'ttsConfig';
  label: string;
  hasChanges: boolean;
  currentCount?: number;
  importCount?: number;
  icon: React.ReactNode;
}

export const DataSettings: React.FC = () => {
  const { toast } = useToast();
  const { words: allWords, replaceAllWords } = useWordsStore();
  const { dialogs, replaceAllDialogs } = useDialogsStore();
  
  // Export/Import settings
  const [exportSettings, setExportSettings] = useState<DataSettings>({
    hebrewFlashcardsData: true,
    flashcardsDialogs: true,
    ttsConfig: true,
  });
  
  const [importSettings, setImportSettings] = useState<DataSettings>({
    hebrewFlashcardsData: true,
    flashcardsDialogs: true,
    ttsConfig: true,
  });

  // Google Drive settings
  const [googleDriveFolder, setGoogleDriveFolder] = useState('MyApp');
  const [isAuthorized] = useState(false);
  
  // Import conflicts handling
  const [importData, setImportData] = useState<ExportData | null>(null);
  const [conflicts, setConflicts] = useState<ImportConflictItem[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  // Get current data counts
  const getCurrentCounts = () => {
    const ttsConfig = localStorage.getItem('tts_config');
    return {
      words: allWords.length,
      dialogs: dialogs.length,
      ttsConfig: ttsConfig ? 1 : 0,
    };
  };

  // Check for data conflicts
  const checkDataConflicts = (data: ExportData): ImportConflictItem[] => {
    const conflicts: ImportConflictItem[] = [];
    const currentCounts = getCurrentCounts();

    if (importSettings.hebrewFlashcardsData && data.hebrewFlashcardsData) {
      const importWords = Array.isArray(data.hebrewFlashcardsData) ? data.hebrewFlashcardsData : data.hebrewFlashcardsData.words || [];
      conflicts.push({
        type: 'hebrewFlashcardsData',
        label: 'Слова-карточки',
        hasChanges: currentCounts.words > 0 && importWords.length !== currentCounts.words,
        currentCount: currentCounts.words,
        importCount: importWords.length,
        icon: <FileText className="h-4 w-4" />
      });
    }

    if (importSettings.flashcardsDialogs && data.flashcardsDialogs) {
      const importDialogs = Array.isArray(data.flashcardsDialogs) ? data.flashcardsDialogs : [];
      conflicts.push({
        type: 'flashcardsDialogs',
        label: 'Диалоги',
        hasChanges: currentCounts.dialogs > 0 && importDialogs.length !== currentCounts.dialogs,
        currentCount: currentCounts.dialogs,
        importCount: importDialogs.length,
        icon: <MessageSquare className="h-4 w-4" />
      });
    }

    if (importSettings.ttsConfig && data.ttsConfig) {
      conflicts.push({
        type: 'ttsConfig',
        label: 'Настройки TTS',
        hasChanges: currentCounts.ttsConfig > 0,
        currentCount: currentCounts.ttsConfig,
        importCount: 1,
        icon: <Volume2 className="h-4 w-4" />
      });
    }

    return conflicts;
  };

  // Export data
  const handleExport = useCallback(() => {
    const exportData: ExportData = {
      timestamp: Date.now(),
      version: '1.0.0'
    };

    // Export words if selected
    if (exportSettings.hebrewFlashcardsData) {
      const storedWords = localStorage.getItem('hebrew-flashcards-data');
      if (storedWords) {
        try {
          exportData.hebrewFlashcardsData = JSON.parse(storedWords);
        } catch {
          exportData.hebrewFlashcardsData = { words: allWords };
        }
      } else {
        exportData.hebrewFlashcardsData = { words: allWords };
      }
    }

    // Export dialogs if selected
    if (exportSettings.flashcardsDialogs) {
      exportData.flashcardsDialogs = dialogs;
    }

    // Export TTS config if selected
    if (exportSettings.ttsConfig) {
      const ttsConfig = localStorage.getItem('tts_config');
      if (ttsConfig) {
        try {
          exportData.ttsConfig = JSON.parse(ttsConfig);
        } catch {
          // Skip invalid TTS config
        }
      }
    }

    // Create and download file
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcards-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Экспорт завершен",
      description: "Данные успешно экспортированы в файл"
    });
  }, [exportSettings, allWords, dialogs, toast]);

  // Perform the actual import
  const performImport = useCallback((data: ExportData) => {
    let importedCount = 0;

    try {
      // Import words
      if (importSettings.hebrewFlashcardsData && data.hebrewFlashcardsData) {
        const wordsToImport = Array.isArray(data.hebrewFlashcardsData) 
          ? data.hebrewFlashcardsData 
          : data.hebrewFlashcardsData.words || [];
        
        if (Array.isArray(wordsToImport) && wordsToImport.length > 0) {
          replaceAllWords(wordsToImport as Word[]);
          importedCount++;
        }
      }

      // Import dialogs
      if (importSettings.flashcardsDialogs && data.flashcardsDialogs) {
        const dialogsToImport = Array.isArray(data.flashcardsDialogs) 
          ? data.flashcardsDialogs 
          : [];
        
        if (dialogsToImport.length > 0) {
          replaceAllDialogs(dialogsToImport as Dialog[], toast);
          importedCount++;
        }
      }

      // Import TTS config
      if (importSettings.ttsConfig && data.ttsConfig) {
        localStorage.setItem('tts_config', JSON.stringify(data.ttsConfig));
        importedCount++;
      }

      if (importedCount > 0) {
        toast({
          title: "Импорт завершен",
          description: `Успешно импортировано ${importedCount} набора(ов) данных`
        });
      } else {
        toast({
          title: "Нет данных для импорта",
          description: "Выберите данные для импорта или проверьте файл"
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка импорта",
        description: "Произошла ошибка при импорте данных",
        variant: "destructive"
      });
    }
  }, [importSettings, replaceAllWords, replaceAllDialogs, toast]);

  // Handle file import
  const handleImportFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          toast({ 
            title: "Ошибка", 
            description: 'Не удалось прочитать файл.', 
            variant: "destructive" 
          });
          return;
        }
        
        const data: ExportData = JSON.parse(content);
        
        // Check for conflicts
        const detectedConflicts = checkDataConflicts(data);
        
        if (detectedConflicts.some(c => c.hasChanges)) {
          setImportData(data);
          setConflicts(detectedConflicts);
          setShowConflictDialog(true);
        } else {
          // No conflicts, import directly
          performImport(data);
        }
      } catch (error) {
        toast({
          title: "Ошибка",
          description: 'Неверный формат файла. Ожидается JSON файл экспорта.',
          variant: "destructive"
        });
      } finally {
        if (event.target) {
          event.target.value = '';
        }
      }
    };

    reader.readAsText(file);
  }, [checkDataConflicts, performImport, toast]);

  // Google Drive authorization (placeholder)
  const handleGoogleDriveAuth = useCallback(() => {
    // TODO: Implement Google Drive authorization
    toast({
      title: "В разработке",
      description: "Авторизация Google Drive будет добавлена в следующем обновлении"
    });
  }, [toast]);

  const currentCounts = getCurrentCounts();

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Экспорт данных
          </CardTitle>
          <CardDescription>
            Выберите данные для экспорта в файл
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="export-words"
                checked={exportSettings.hebrewFlashcardsData}
                onCheckedChange={(checked: boolean) => 
                  setExportSettings(prev => ({ ...prev, hebrewFlashcardsData: checked }))
                }
              />
              <Label htmlFor="export-words" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Слова-карточки
                <Badge variant="secondary">{currentCounts.words}</Badge>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox
                id="export-dialogs"
                checked={exportSettings.flashcardsDialogs}
                onCheckedChange={(checked: boolean) => 
                  setExportSettings(prev => ({ ...prev, flashcardsDialogs: checked }))
                }
              />
              <Label htmlFor="export-dialogs" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Диалоги
                <Badge variant="secondary">{currentCounts.dialogs}</Badge>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox
                id="export-tts"
                checked={exportSettings.ttsConfig}
                onCheckedChange={(checked: boolean) => 
                  setExportSettings(prev => ({ ...prev, ttsConfig: checked }))
                }
              />
              <Label htmlFor="export-tts" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Настройки TTS
                <Badge variant="secondary">{currentCounts.ttsConfig > 0 ? '✓' : '✗'}</Badge>
              </Label>
            </div>
          </div>
          
          <Button 
            onClick={handleExport}
            disabled={!Object.values(exportSettings).some(Boolean)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Экспортировать выбранные данные
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Импорт данных
          </CardTitle>
          <CardDescription>
            Выберите данные для импорта из файла
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="import-words"
                checked={importSettings.hebrewFlashcardsData}
                onCheckedChange={(checked: boolean) => 
                  setImportSettings(prev => ({ ...prev, hebrewFlashcardsData: checked }))
                }
              />
              <Label htmlFor="import-words" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Слова-карточки
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox
                id="import-dialogs"
                checked={importSettings.flashcardsDialogs}
                onCheckedChange={(checked: boolean) => 
                  setImportSettings(prev => ({ ...prev, flashcardsDialogs: checked }))
                }
              />
              <Label htmlFor="import-dialogs" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Диалоги
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox
                id="import-tts"
                checked={importSettings.ttsConfig}
                onCheckedChange={(checked: boolean) => 
                  setImportSettings(prev => ({ ...prev, ttsConfig: checked }))
                }
              />
              <Label htmlFor="import-tts" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Настройки TTS
              </Label>
            </div>
          </div>
          
          <div>
            <input
              id="import-file"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button 
              onClick={() => document.getElementById('import-file')?.click()}
              disabled={!Object.values(importSettings).some(Boolean)}
              className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
              variant="outline"
            >
              Выбрать файл для импорта
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Google Drive Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudIcon className="h-5 w-5" />
            Синхронизация с Google Drive
          </CardTitle>
          <CardDescription>
            Автоматическая синхронизация данных через облачное хранилище
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={isAuthorized ? "default" : "secondary"}>
              {isAuthorized ? "Авторизован" : "Не авторизован"}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="drive-folder">Папка в Google Drive</Label>
            <Input
              id="drive-folder"
              value={googleDriveFolder}
              onChange={(e) => setGoogleDriveFolder(e.target.value)}
              placeholder="Название папки"
            />
          </div>
          
          <Button 
            onClick={handleGoogleDriveAuth}
            className={cn(
              "w-full",
              isAuthorized 
                ? "border-blue-600 text-blue-600 hover:bg-blue-50" 
                : "bg-blue-600 hover:bg-blue-700 text-white"
            )}
            variant={isAuthorized ? "outline" : "default"}
          >
            {isAuthorized ? "Переавторизация" : "Авторизоваться в Google Drive"}
          </Button>
          
          {isAuthorized && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50">
                Загрузить из Drive
              </Button>
              <Button variant="outline" className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50">
                Сохранить в Drive
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conflict Resolution Dialog */}
      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Обнаружены конфликты данных</AlertDialogTitle>
            <AlertDialogDescription>
              Некоторые данные уже существуют. Выберите действие для каждого типа данных.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            {conflicts.map((conflict) => (
              <div key={conflict.type} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {conflict.icon}
                  <div>
                    <div className="font-medium">{conflict.label}</div>
                    <div className="text-sm text-gray-500">
                      Текущие: {conflict.currentCount} → Импорт: {conflict.importCount}
                    </div>
                  </div>
                </div>
                <Badge variant={conflict.hasChanges ? "destructive" : "secondary"}>
                  {conflict.hasChanges ? "Конфликт" : "Без изменений"}
                </Badge>
              </div>
            ))}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConflictDialog(false)}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (importData) {
                  performImport(importData);
                }
                setShowConflictDialog(false);
                setImportData(null);
                setConflicts([]);
              }}
            >
              Заменить данные
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
