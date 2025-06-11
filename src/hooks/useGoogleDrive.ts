import { useState, useEffect, useCallback, useRef } from 'react';
import { getGoogleDriveServiceV2 } from '../services/googleDrive/GoogleDriveServiceV2';
import { useToast } from './use-toast';
import { useWordsStore } from '@/store/wordsStore';
import { useDialogsStore } from '@/store/dialogsStore';
import type { Word, Dialog } from '@/types';

export interface UseGoogleDriveReturn {
  isInitialized: boolean;
  isAuthorized: boolean;
  isLoading: boolean;
  isCheckingAuth: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  authorize: () => Promise<void>;
  signOut: () => Promise<void>;
  syncToCloud: () => Promise<void>;
  syncFromCloud: (options?: { words?: boolean; dialogs?: boolean; ttsConfig?: boolean; llmConfig?: boolean }) => Promise<void>;
  refreshStatus: () => Promise<void>;
  
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
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [hasConflicts, setHasConflicts] = useState(false);
  const refreshInProgress = useRef(false);

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
    
    // Check if already authorized
    const savedToken = localStorage.getItem('google_access_token');
    if (savedToken) {
      setIsAuthorized(true);
    }
  }, []);

  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    setIsLoading(true);
    setIsCheckingAuth(true);
    setError(null);
    
    try {
      await driveService.initialize();
      setIsInitialized(true);
      const authorized = driveService.isSignedIn();
      setIsAuthorized(authorized);
      
      if (authorized) {
        // Check for conflicts if already authorized
        try {
          const conflicts = await driveService.hasConflicts();
          setHasConflicts(conflicts);
        } catch (error) {
          console.log('Error checking conflicts during init:', error);
        }
      }
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
      setIsCheckingAuth(false);
    }
  }, [isInitialized, driveService, toast]);

  const authorize = useCallback(async () => {
    setIsLoading(true);
    setIsCheckingAuth(true);
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
        try {
          const conflicts = await driveService.hasConflicts();
          setHasConflicts(conflicts);
        } catch (error) {
          console.log('Error checking conflicts:', error);
        }
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
      setIsCheckingAuth(false);
    }
  }, [isInitialized, initialize, driveService, toast]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    
    try {
      await driveService.signOut();
      setIsAuthorized(false);
      setHasConflicts(false);
      setLastSync(null);
      
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
      
      // Collect LLM settings from various localStorage keys
      const llmConfig = {
        llmProvider: localStorage.getItem('llmProvider'),
        batchDelay: localStorage.getItem('batchDelay'),
        batchSize: localStorage.getItem('batchSize'),
        maxDelaySeconds: localStorage.getItem('maxDelaySeconds'),
        ollamaApiUrl: localStorage.getItem('ollamaApiUrl'),
        ollamaModel: localStorage.getItem('ollamaModel'),
        openRouterApiKey: localStorage.getItem('openRouterApiKey'),
        openRouterModel: localStorage.getItem('openRouterModel'),
        progressiveDelay: localStorage.getItem('progressiveDelay'),
        'preferred-language': localStorage.getItem('preferred-language')
      };
      
      // Remove null/undefined values
      const cleanLlmConfig = Object.fromEntries(
        Object.entries(llmConfig).filter(([_, value]) => value !== null && value !== undefined)
      );
      
      const syncData: Record<string, unknown> = {};
      const uploadDetails: string[] = [];
      
      if (wordsData) {
        const words = JSON.parse(wordsData);
        syncData.words = words;
        uploadDetails.push(`${Array.isArray(words) ? words.length : 0} слов`);
      }
      
      if (dialogs.length > 0) {
        syncData.dialogs = dialogs;
        uploadDetails.push(`${dialogs.length} диалогов`);
      }
      
      if (ttsConfig) {
        syncData.ttsConfig = JSON.parse(ttsConfig);
        uploadDetails.push('настройки TTS');
      }

      if (Object.keys(cleanLlmConfig).length > 0) {
        syncData.llmConfig = cleanLlmConfig;
        uploadDetails.push('настройки ИИ');
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
      
      const detailsText = uploadDetails.length > 0 
        ? `Загружено: ${uploadDetails.join(', ')}`
        : 'Нет данных для загрузки';
      
      toast({
        title: "Синхронизация завершена",
        description: detailsText
      });
    } catch (err) {
      let message = 'Ошибка синхронизации';
      let description = '';
      
      if (err instanceof Error) {
        message = err.message;
        
        // Специальные сообщения для разных типов ошибок
        if (message.includes('токен') || message.includes('token') || message.includes('401') || message.includes('403')) {
          description = 'Попробуйте выйти и заново авторизоваться в Google Drive';
        } else if (message.includes('quota') || message.includes('rate limit')) {
          description = 'Превышен лимит запросов. Попробуйте позже';
        } else if (message.includes('network') || message.includes('Network')) {
          description = 'Проверьте подключение к интернету';
        }
      }
      
      setError(message);
      toast({
        title: "Ошибка загрузки в облако",
        description: description || message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized, dialogs, driveService, toast]);

  const syncFromCloud = useCallback(async (options?: { words?: boolean; dialogs?: boolean; ttsConfig?: boolean; llmConfig?: boolean }) => {
    if (!isAuthorized) {
      await authorize();
      return;
    }

    setIsLoading(true);
    setError(null);
    
    // Default to sync everything if no options provided
    const syncOptions = {
      words: true,
      dialogs: true,
      ttsConfig: true,
      llmConfig: true,
      ...options
    };
    
    try {
      const cloudData = await driveService.syncFromCloud();
      
      let importedCount = 0;
      const importDetails: string[] = [];
      
      // Import words (only if enabled)
      if (syncOptions.words && cloudData.words) {
        let wordsToImport: unknown[] = [];
        
        // Handle different data formats
        if (Array.isArray(cloudData.words)) {
          wordsToImport = cloudData.words;
        } else if (cloudData.words && typeof cloudData.words === 'object' && 'words' in cloudData.words) {
          // Handle wrapped format { words: [...] }
          const wrappedData = cloudData.words as { words?: unknown[] };
          wordsToImport = Array.isArray(wrappedData.words) ? wrappedData.words : [];
        }
        
        if (Array.isArray(wordsToImport) && wordsToImport.length > 0) {
          replaceAllWords(wordsToImport as Word[]);
          importedCount++;
          importDetails.push(`${wordsToImport.length} слов`);
        }
      }
      
      // Import dialogs (only if enabled)
      if (syncOptions.dialogs && cloudData.dialogs && Array.isArray(cloudData.dialogs)) {
        replaceAllDialogs(cloudData.dialogs as Dialog[], toast);
        importedCount++;
        importDetails.push(`${cloudData.dialogs.length} диалогов`);
      }
      
      // Import TTS config (only if enabled)
      if (syncOptions.ttsConfig && cloudData.ttsConfig) {
        localStorage.setItem('tts_config', JSON.stringify(cloudData.ttsConfig));
        importedCount++;
        importDetails.push('настройки TTS');
      }

      // Import LLM config (only if enabled)
      if (syncOptions.llmConfig && cloudData.llmConfig) {
        const llmSettings = cloudData.llmConfig as Record<string, string>;
        
        // Restore LLM settings to individual localStorage keys
        for (const [key, value] of Object.entries(llmSettings)) {
          if (value !== null && value !== undefined) {
            localStorage.setItem(key, value);
          }
        }
        
        importedCount++;
        importDetails.push('настройки ИИ');
      }
      
      // Update sync metadata
      if (cloudData.metadata) {
        localStorage.setItem('syncMetadata', JSON.stringify(cloudData.metadata));
        setLastSync(new Date(cloudData.metadata.lastSync));
      }
      
      setHasConflicts(false);
      
      const detailsText = importDetails.length > 0 
        ? `Загружено: ${importDetails.join(', ')}`
        : 'Данные уже актуальны';
      
      toast({
        title: "Синхронизация завершена",
        description: detailsText
      });
    } catch (err) {
      let message = 'Ошибка синхронизации';
      let description = '';
      
      if (err instanceof Error) {
        message = err.message;
        
        // Специальные сообщения для разных типов ошибок
        if (message.includes('токен') || message.includes('token') || message.includes('401') || message.includes('403')) {
          description = 'Попробуйте выйти и заново авторизоваться в Google Drive';
        } else if (message.includes('quota') || message.includes('rate limit')) {
          description = 'Превышен лимит запросов. Попробуйте позже';
        } else if (message.includes('network') || message.includes('Network')) {
          description = 'Проверьте подключение к интернету';
        }
      }
      
      setError(message);
      toast({
        title: "Ошибка загрузки из облака",
        description: description || message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized, authorize, driveService, replaceAllWords, replaceAllDialogs, toast]);

  const refreshStatus = useCallback(async () => {
    // Prevent concurrent refreshes
    if (refreshInProgress.current) {
      return;
    }
    
    refreshInProgress.current = true;
    setIsCheckingAuth(true);
    
    try {
      if (!isInitialized) {
        await initialize();
        return;
      }
      
      // Check current authorization status
      const currentlyAuthorized = driveService.isSignedIn();
      
      if (currentlyAuthorized !== isAuthorized) {
        setIsAuthorized(currentlyAuthorized);
      }
      
      if (currentlyAuthorized) {
        // Check for conflicts
        try {
          const conflicts = await driveService.hasConflicts();
          setHasConflicts(conflicts);
        } catch (error) {
          console.log('Error checking conflicts during refresh:', error);
        }
      } else {
        setHasConflicts(false);
      }
    } catch (error) {
      console.log('Error refreshing status:', error);
    } finally {
      refreshInProgress.current = false;
      setIsCheckingAuth(false);
    }
  }, [isInitialized, initialize, driveService, isAuthorized]);

  return {
    isInitialized,
    isAuthorized,
    isLoading,
    isCheckingAuth,
    error,
    
    initialize,
    authorize,
    signOut,
    syncToCloud,
    syncFromCloud,
    refreshStatus,
    
    lastSync,
    hasConflicts
  };
}
