/* eslint-disable @typescript-eslint/no-explicit-any */
// Улучшенный Google Drive Service с поддержкой Google Identity Services
import { GOOGLE_DRIVE_CONFIG, type SyncMetadata, type GoogleDriveFile } from './types';
import './gapi.d.ts';

export class GoogleDriveServiceV2 {
  private isInitialized = false;
  private isAuthorized = false;
  private appFolderId: string | null = null;
  private tokenClient: any = null;
  private accessToken: string | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load Google API first
      await this.loadGoogleAPI();
      
      // Wait for gapi.client to be available
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('client', {
          callback: resolve,
          onerror: reject
        });
      });
      
      // Initialize GAPI client (без auth2)
      await window.gapi.client.init({
        apiKey: GOOGLE_DRIVE_CONFIG.API_KEY,
        discoveryDocs: [GOOGLE_DRIVE_CONFIG.DISCOVERY_DOC],
      });

      // Wait for Google Identity Services to be available
      await this.waitForGoogleIdentityServices();

      // Initialize Google Identity Services
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_DRIVE_CONFIG.CLIENT_ID,
        scope: GOOGLE_DRIVE_CONFIG.SCOPES,
        callback: (response: any) => {
          if (response.access_token) {
            this.accessToken = response.access_token;
            this.isAuthorized = true;
            // Устанавливаем токен для GAPI
            window.gapi.client.setToken({ access_token: response.access_token });
          }
        },
        error_callback: (error: any) => {
          console.error('Google OAuth error:', error);
          this.isAuthorized = false;
          this.accessToken = null;
        }
      });

      this.isInitialized = true;
      
      // Проверяем наличие сохраненного токена
      const savedToken = localStorage.getItem('google_access_token');
      if (savedToken) {
        try {
          window.gapi.client.setToken({ access_token: savedToken });
          this.accessToken = savedToken;
          this.isAuthorized = true;
        } catch (error) {
          console.log('Saved token invalid, requiring reauth');
          localStorage.removeItem('google_access_token');
        }
      }

    } catch (error) {
      console.error('Failed to initialize Google Drive API V2:', error);
      throw new Error('Не удалось инициализировать Google Drive API');
    }
  }

  private async loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Проверяем наличие gapi
      if (typeof window.gapi === 'undefined') {
        reject(new Error('Google API script не загружен. Убедитесь что добавлен <script src="https://apis.google.com/js/api.js"></script>'));
        return;
      }

      resolve();
    });
  }

  private async waitForGoogleIdentityServices(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 секунд максимум

      const checkGIS = () => {
        attempts++;
        
        if (window.google?.accounts?.oauth2) {
          resolve();
          return;
        }
        
        if (attempts >= maxAttempts) {
          reject(new Error('Google Identity Services не загружен. Убедитесь что добавлен <script src="https://accounts.google.com/gsi/client"></script>'));
          return;
        }
        
        setTimeout(checkGIS, 100);
      };
      
      checkGIS();
    });
  }

  async authorize(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (this.tokenClient) {
        this.tokenClient.requestAccessToken();
        // Ждем callback
        return new Promise((resolve) => {
          const checkAuth = () => {
            if (this.isAuthorized && this.accessToken) {
              localStorage.setItem('google_access_token', this.accessToken);
              resolve(true);
            } else {
              setTimeout(checkAuth, 100);
            }
          };
          setTimeout(checkAuth, 100);
        });
      }
      return false;
    } catch (error) {
      console.error('Authorization failed:', error);
      return false;
    }
  }

  async signOut(): Promise<void> {
    if (this.accessToken) {
      window.google.accounts.oauth2.revoke(this.accessToken, () => {
        console.log('Access token revoked');
      });
    }
    
    this.isAuthorized = false;
    this.accessToken = null;
    this.appFolderId = null;
    localStorage.removeItem('google_access_token');
    
    // Очищаем токен в GAPI
    window.gapi.client.setToken(null);
  }

  isSignedIn(): boolean {
    return this.isAuthorized && !!this.accessToken;
  }

  // Остальные методы остаются такими же...
  async ensureAppFolder(): Promise<string> {
    if (this.appFolderId) {
      return this.appFolderId;
    }

    try {
      // Search for existing folder
      const response = await window.gapi.client.drive.files.list({
        q: `name='${GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        spaces: 'drive'
      });

      if (response.result.files && response.result.files.length > 0) {
        this.appFolderId = response.result.files[0].id;
        if (!this.appFolderId) {
          throw new Error('Не удалось получить ID папки приложения');
        }
        return this.appFolderId;
      }

      // Create app folder
      const createResponse = await window.gapi.client.drive.files.create({
        resource: {
          name: GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder'
        }
      });

      this.appFolderId = createResponse.result.id;
      if (!this.appFolderId) {
        throw new Error('Не удалось создать папку приложения');
      }
      return this.appFolderId;
    } catch (error) {
      console.error('Failed to ensure app folder:', error);
      throw new Error('Не удалось создать папку приложения');
    }
  }

  async syncToCloud(data: {
    words?: unknown[];
    dialogs?: unknown[];
    ttsConfig?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.isAuthorized) {
      throw new Error('Не авторизован в Google Drive');
    }

    const now = Date.now();
    const metadata: SyncMetadata = {
      lastSync: now,
      version: '1.0.0',
      deviceId: this.getDeviceId(),
      files: {}
    };

    const appFolderId = await this.ensureAppFolder();

    // Upload each file type
    if (data.words) {
      console.log('Uploading words to cloud:', {
        count: Array.isArray(data.words) ? data.words.length : 'not array',
        firstWord: Array.isArray(data.words) ? data.words[0] : 'no words',
        type: typeof data.words
      });
      await this.uploadFile(
        GOOGLE_DRIVE_CONFIG.FILES.WORDS,
        JSON.stringify(data.words, null, 2),
        appFolderId
      );
    } else {
      console.log('No words to upload');
    }

    if (data.dialogs) {
      await this.uploadFile(
        GOOGLE_DRIVE_CONFIG.FILES.DIALOGS,
        JSON.stringify(data.dialogs, null, 2),
        appFolderId
      );
    }

    if (data.ttsConfig) {
      await this.uploadFile(
        GOOGLE_DRIVE_CONFIG.FILES.TTS_CONFIG,
        JSON.stringify(data.ttsConfig, null, 2),
        appFolderId
      );
    }

    // Update metadata
    await this.updateSyncMetadata(metadata);
  }

  async syncFromCloud(): Promise<{
    words?: unknown[];
    dialogs?: unknown[];
    ttsConfig?: Record<string, unknown>;
    metadata?: SyncMetadata;
  }> {
    if (!this.isAuthorized) {
      throw new Error('Не авторизован в Google Drive');
    }

    const result: Record<string, unknown> = {};

    try {
      const appFolderId = await this.ensureAppFolder();

      // Download words
      try {
        const wordsContent = await this.downloadFile(GOOGLE_DRIVE_CONFIG.FILES.WORDS, appFolderId);
        if (wordsContent) {
          const parsedWords = JSON.parse(wordsContent);
        //   console.log('Words downloaded from cloud:', {
        //     content: `${wordsContent.slice(0, 200)}...`,
        //     parsedCount: Array.isArray(parsedWords) ? parsedWords.length : 'not array',
        //     parsedWords: parsedWords
        //   });
          result.words = parsedWords;
        } else {
          console.log('Words file is empty or null');
        }
      } catch (error) {
        console.log('No words file found or error parsing:', error);
      }

      // Download dialogs
      try {
        const dialogsContent = await this.downloadFile(GOOGLE_DRIVE_CONFIG.FILES.DIALOGS, appFolderId);
        if (dialogsContent) {
          result.dialogs = JSON.parse(dialogsContent);
        }
      } catch (error) {
        console.log('No dialogs file found');
      }

      // Download TTS config
      try {
        const ttsContent = await this.downloadFile(GOOGLE_DRIVE_CONFIG.FILES.TTS_CONFIG, appFolderId);
        if (ttsContent) {
          result.ttsConfig = JSON.parse(ttsContent);
        }
      } catch (error) {
        console.log('No TTS config file found');
      }

      // Download metadata
      try {
        const metadataContent = await this.downloadFile(GOOGLE_DRIVE_CONFIG.FILES.METADATA, appFolderId);
        if (metadataContent) {
          result.metadata = JSON.parse(metadataContent);
        }
      } catch (error) {
        console.log('No metadata file found');
      }

      return result;
    } catch (error) {
      console.error('Failed to sync from cloud:', error);
      throw new Error(`Ошибка загрузки из облака: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  async hasConflicts(): Promise<boolean> {
    if (!this.isAuthorized) {
      return false;
    }
    
    try {
      const cloudData = await this.syncFromCloud();
      
      // Get current local data
      const localWordsStore = localStorage.getItem('hebrew-flashcards-data');
      const localWords = localWordsStore ? JSON.parse(localWordsStore) : [];
      
      const localDialogsStore = localStorage.getItem('dialogs');
      const localDialogs = localDialogsStore ? JSON.parse(localDialogsStore) : [];
      
      const localTTSConfig = localStorage.getItem('tts_config');
      
      // Check actual data presence
      const hasCloudWords = cloudData.words && Array.isArray(cloudData.words) && cloudData.words.length > 0;
      const hasLocalWords = Array.isArray(localWords) && localWords.length > 0;
      
      const hasCloudDialogs = cloudData.dialogs && Array.isArray(cloudData.dialogs) && cloudData.dialogs.length > 0;
      const hasLocalDialogs = Array.isArray(localDialogs) && localDialogs.length > 0;
      
      const hasCloudTTS = cloudData.ttsConfig && Object.keys(cloudData.ttsConfig).length > 0;
      const hasLocalTTS = localTTSConfig !== null && localTTSConfig !== undefined;
      
      // Conflict exists only if BOTH cloud and local have data AND they differ
      const wordConflict = hasCloudWords && hasLocalWords && 
        cloudData.words && Array.isArray(cloudData.words) && cloudData.words.length !== localWords.length;
      const dialogConflict = hasCloudDialogs && hasLocalDialogs && 
        cloudData.dialogs && Array.isArray(cloudData.dialogs) && cloudData.dialogs.length !== localDialogs.length;
      const ttsConflict = hasCloudTTS && hasLocalTTS && 
        cloudData.ttsConfig && JSON.stringify(cloudData.ttsConfig) !== localTTSConfig;
      
    //   console.log('Conflict check:', {
    //     words: { cloud: hasCloudWords, local: hasLocalWords, conflict: wordConflict },
    //     dialogs: { cloud: hasCloudDialogs, local: hasLocalDialogs, conflict: dialogConflict },
    //     tts: { cloud: hasCloudTTS, local: hasLocalTTS, conflict: ttsConflict }
    //   });
      
      return Boolean(wordConflict || dialogConflict || ttsConflict);
    } catch (error) {
      console.log('Error checking conflicts:', error);
      return false;
    }
  }

  private async uploadFile(fileName: string, content: string, parentId: string): Promise<void> {
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    // Check if file exists
    const existingFile = await this.findFile(fileName, parentId);

    const metadata = {
      name: fileName,
      parents: [parentId]
    };

    const multipartRequestBody = `${delimiter}Content-Type: application/json\r\n\r\n${JSON.stringify(metadata)}${delimiter}Content-Type: application/json\r\n\r\n${content}${close_delim}`;

    const request = window.gapi.client.request({
      path: existingFile 
        ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}`
        : 'https://www.googleapis.com/upload/drive/v3/files',
      method: existingFile ? 'PATCH' : 'POST',
      params: { uploadType: 'multipart' },
      headers: {
        'Content-Type': `multipart/related; boundary="${boundary}"`
      },
      body: multipartRequestBody
    });

    await request;
  }

  private async downloadFile(fileName: string, parentId: string): Promise<string | null> {
    const file = await this.findFile(fileName, parentId);
    if (!file) return null;

    const response = await window.gapi.client.drive.files.get({
      fileId: file.id,
      alt: 'media'
    });

    return response.body;
  }

  private async findFile(fileName: string, parentId: string): Promise<GoogleDriveFile | null> {
    const response = await window.gapi.client.drive.files.list({
      q: `name='${fileName}' and '${parentId}' in parents and trashed=false`,
      spaces: 'drive'
    });

    if (response.result.files && response.result.files.length > 0) {
      return response.result.files[0];
    }

    return null;
  }

  private async updateSyncMetadata(metadata: SyncMetadata): Promise<void> {
    const appFolderId = await this.ensureAppFolder();
    await this.uploadFile(
      GOOGLE_DRIVE_CONFIG.FILES.METADATA,
      JSON.stringify(metadata, null, 2),
      appFolderId
    );
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }
}

let instance: GoogleDriveServiceV2 | null = null;

export function getGoogleDriveServiceV2(): GoogleDriveServiceV2 {
  if (!instance) {
    instance = new GoogleDriveServiceV2();
  }
  return instance;
}
