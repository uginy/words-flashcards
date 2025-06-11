import { useState, useEffect, useCallback } from 'react';
import { getGoogleDriveServiceV2 } from '../services/googleDrive/GoogleDriveServiceV2';
import { useToast } from './use-toast';
import { useWordsStore } from '@/store/wordsStore';
import { useDialogsStore } from '@/store/dialogsStore';
import type { Word, Dialog } from '@/types';

export interface UseGoogleDriveReturn {
  isInitialized: boolean;
  isAuthorized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  authorize: () => Promise<void>;
  signOut: () => Promise<void>;
  syncToCloud: () => Promise<void>;
  syncFromCloud: () => Promise<void>;
  
  // Status
  lastSync: Date | null;
  hasConflicts: boolean;
}

export function useGoogleDrive(): UseGoogleDriveReturn {
  const { toast } = useToast();
  const { replaceAllWords } = useWordsStore();
  const { dialogs, replaceAllDialogs } = useDialogsStore();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [hasConflicts, setHasConflicts] = useState(false);

  const driveService = getGoogleDriveServiceV2();

  // Load sync status on mount
  useEffect(() => {
    const stored = localStorage.getItem('syncMetadata');
    if (stored) {
      try {
        const metadata = JSON.parse(stored);
        if (metadata.lastSync) {
          setLastSync(new Date(metadata.lastSync));
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }, []);

  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await driveService.initialize();
      setIsInitialized(true);
      setIsAuthorized(driveService.isSignedIn());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка инициализации';
      setError(message);
      toast({
        title: "Ошибка",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, driveService, toast]);

  const authorize = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!isInitialized) {
        await initialize();
      }
      
      const authorized = await driveService.authorize();
      setIsAuthorized(authorized);
      
      if (authorized) {
        toast({
          title: "Успешно",
          description: "Авторизация в Google Drive выполнена"
        });
        
        // Check for conflicts after authorization
        const conflicts = await driveService.hasConflicts();
        setHasConflicts(conflicts);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка авторизации';
      setError(message);
      toast({
        title: "Ошибка",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, initialize, driveService, toast]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    
    try {
      await driveService.signOut();
      setIsAuthorized(false);
      setHasConflicts(false);
      
      toast({
        title: "Выход выполнен",
        description: "Вы вышли из Google Drive"
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка выхода';
      setError(message);
      toast({
        title: "Ошибка",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [driveService, toast]);

  const syncToCloud = useCallback(async () => {
    if (!isAuthorized) {
      toast({
        title: "Ошибка",
        description: "Необходима авторизация в Google Drive",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Prepare data for sync
      const wordsData = localStorage.getItem('hebrew-flashcards-data');
      const ttsConfig = localStorage.getItem('tts_config');
      
      const syncData: Record<string, unknown> = {};
      
      if (wordsData) {
        syncData.words = JSON.parse(wordsData);
      }
      
      if (dialogs.length > 0) {
        syncData.dialogs = dialogs;
      }
      
      if (ttsConfig) {
        syncData.ttsConfig = JSON.parse(ttsConfig);
      }

      await driveService.syncToCloud(syncData);
      
      const now = new Date();
      setLastSync(now);
      
      // Update local metadata
      const metadata = {
        lastSync: now.getTime(),
        version: '1.0.0',
        deviceId: localStorage.getItem('deviceId') || '',
        files: {}
      };
      localStorage.setItem('syncMetadata', JSON.stringify(metadata));
      
      toast({
        title: "Синхронизация завершена",
        description: "Данные успешно загружены в Google Drive"
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка синхронизации';
      setError(message);
      toast({
        title: "Ошибка",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized, dialogs, driveService, toast]);

  const syncFromCloud = useCallback(async () => {
    if (!isAuthorized) {
      toast({
        title: "Ошибка",
        description: "Необходима авторизация в Google Drive",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const cloudData = await driveService.syncFromCloud();
      
      let importedCount = 0;
      
      // Import words
      if (cloudData.words) {
        const wordsToImport = Array.isArray(cloudData.words) 
          ? cloudData.words 
          : [];
        
        if (Array.isArray(wordsToImport) && wordsToImport.length > 0) {
          replaceAllWords(wordsToImport as Word[]);
          importedCount++;
        }
      }
      
      // Import dialogs
      if (cloudData.dialogs && Array.isArray(cloudData.dialogs)) {
        replaceAllDialogs(cloudData.dialogs as Dialog[], toast);
        importedCount++;
      }
      
      // Import TTS config
      if (cloudData.ttsConfig) {
        localStorage.setItem('tts_config', JSON.stringify(cloudData.ttsConfig));
        importedCount++;
      }
      
      // Update sync metadata
      if (cloudData.metadata) {
        localStorage.setItem('syncMetadata', JSON.stringify(cloudData.metadata));
        setLastSync(new Date(cloudData.metadata.lastSync));
      }
      
      setHasConflicts(false);
      
      toast({
        title: "Синхронизация завершена",
        description: `Загружено ${importedCount} набора(ов) данных из Google Drive`
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка синхронизации';
      setError(message);
      toast({
        title: "Ошибка",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized, driveService, replaceAllWords, replaceAllDialogs, toast]);

  return {
    isInitialized,
    isAuthorized,
    isLoading,
    error,
    
    initialize,
    authorize,
    signOut,
    syncToCloud,
    syncFromCloud,
    
    lastSync,
    hasConflicts
  };
}
