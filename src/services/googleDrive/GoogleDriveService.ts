/* eslint-disable @typescript-eslint/no-explicit-any */
// Google API типы используют any, так как это внешнее API
import { GOOGLE_DRIVE_CONFIG, type SyncMetadata, type GoogleDriveFile } from './types';
import './gapi.d.ts';

export class GoogleDriveService {
  private isInitialized = false;
  private isAuthorized = false;
  private appFolderId: string | null = null;
  private deviceId: string;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load Google API
      await this.loadGoogleAPI();
      
      // Initialize gapi
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('client:auth2', {
          callback: resolve,
          onerror: reject
        });
      });

      // Initialize client
      try {
        await window.gapi.client.init({
          apiKey: GOOGLE_DRIVE_CONFIG.API_KEY,
          clientId: GOOGLE_DRIVE_CONFIG.CLIENT_ID,
          discoveryDocs: [GOOGLE_DRIVE_CONFIG.DISCOVERY_DOC],
          scope: GOOGLE_DRIVE_CONFIG.SCOPES
        });
      } catch (initError: unknown) {
        console.error('Google API client initialization error:', initError);
        
        const error = initError as { error?: string; message?: string };
        
        if (error.error === 'idpiframe_initialization_failed') {
          throw new Error(
            'Ошибка OAuth настройки. Добавьте http://localhost:5173 в разрешенные origins в Google Cloud Console. ' +
            'Подробные инструкции в docs/GOOGLE_OAUTH_SETUP.md'
          );
        }
        
        if (error.error === 'popup_blocked_by_browser') {
          throw new Error('Браузер заблокировал всплывающее окно. Разрешите всплывающие окна для этого сайта.');
        }
        
        throw new Error(`Ошибка инициализации Google API: ${error.error || error.message || 'Неизвестная ошибка'}`);
      }

      this.isInitialized = true;
      this.isAuthorized = window.gapi.auth2.getAuthInstance().isSignedIn.get();
    } catch (error) {
      console.error('Failed to initialize Google Drive API:', error);
      throw new Error('Не удалось инициализировать Google Drive API');
    }
  }

  private async loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.head.appendChild(script);
    });
  }

  async authorize(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      
      if (authInstance.isSignedIn.get()) {
        this.isAuthorized = true;
        return true;
      }

      const result = await authInstance.signIn();
      this.isAuthorized = result.isSignedIn();
      
      if (this.isAuthorized) {
        await this.ensureAppFolder();
      }
      
      return this.isAuthorized;
    } catch (error) {
      console.error('Authorization failed:', error);
      throw new Error('Не удалось авторизоваться в Google Drive');
    }
  }

  async signOut(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      this.isAuthorized = false;
      this.appFolderId = null;
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  isSignedIn(): boolean {
    return this.isAuthorized && this.isInitialized;
  }

  private async ensureAppFolder(): Promise<string> {
    if (this.appFolderId) return this.appFolderId;

    try {
      // Search for existing app folder
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

  private async findFile(fileName: string): Promise<GoogleDriveFile | null> {
    if (!this.appFolderId) {
      await this.ensureAppFolder();
    }

    try {
      const response = await window.gapi.client.drive.files.list({
        q: `name='${fileName}' and parents in '${this.appFolderId}' and trashed=false`,
        fields: 'files(id, name, modifiedTime, size)'
      });

      if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0];
      }

      return null;
    } catch (error) {
      console.error('Failed to find file:', error);
      return null;
    }
  }

  async uploadFile(fileName: string, content: string): Promise<string> {
    if (!this.isAuthorized) {
      throw new Error('Не авторизован в Google Drive');
    }

    if (!this.appFolderId) {
      await this.ensureAppFolder();
    }

    try {
      const existingFile = await this.findFile(fileName);
      
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;

      const metadata = {
        name: fileName,
        parents: [this.appFolderId]
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

      const response = await request;
      return response.result.id;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw new Error(`Не удалось загрузить файл ${fileName}`);
    }
  }

  async downloadFile(fileName: string): Promise<string | null> {
    if (!this.isAuthorized) {
      throw new Error('Не авторизован в Google Drive');
    }

    try {
      const file = await this.findFile(fileName);
      if (!file) return null;

      const response = await window.gapi.client.drive.files.get({
        fileId: file.id,
        alt: 'media'
      });

      return response.body;
    } catch (error) {
      console.error('Failed to download file:', error);
      throw new Error(`Не удалось скачать файл ${fileName}`);
    }
  }

  async getSyncMetadata(): Promise<SyncMetadata | null> {
    try {
      const content = await this.downloadFile(GOOGLE_DRIVE_CONFIG.FILES.METADATA);
      if (!content) return null;
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async updateSyncMetadata(metadata: SyncMetadata): Promise<void> {
    await this.uploadFile(
      GOOGLE_DRIVE_CONFIG.FILES.METADATA,
      JSON.stringify(metadata, null, 2)
    );
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
      deviceId: this.deviceId,
      files: {}
    };

    // Upload words
    if (data.words) {
      const fileId = await this.uploadFile(
        GOOGLE_DRIVE_CONFIG.FILES.WORDS,
        JSON.stringify(data.words, null, 2)
      );
      metadata.files[GOOGLE_DRIVE_CONFIG.FILES.WORDS] = {
        fileId,
        lastModified: now,
        hash: this.generateHash(JSON.stringify(data.words))
      };
    }

    // Upload dialogs
    if (data.dialogs) {
      const fileId = await this.uploadFile(
        GOOGLE_DRIVE_CONFIG.FILES.DIALOGS,
        JSON.stringify(data.dialogs, null, 2)
      );
      metadata.files[GOOGLE_DRIVE_CONFIG.FILES.DIALOGS] = {
        fileId,
        lastModified: now,
        hash: this.generateHash(JSON.stringify(data.dialogs))
      };
    }

    // Upload TTS config
    if (data.ttsConfig) {
      const fileId = await this.uploadFile(
        GOOGLE_DRIVE_CONFIG.FILES.TTS_CONFIG,
        JSON.stringify(data.ttsConfig, null, 2)
      );
      metadata.files[GOOGLE_DRIVE_CONFIG.FILES.TTS_CONFIG] = {
        fileId,
        lastModified: now,
        hash: this.generateHash(JSON.stringify(data.ttsConfig))
      };
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

    // Download words
    const wordsContent = await this.downloadFile(GOOGLE_DRIVE_CONFIG.FILES.WORDS);
    if (wordsContent) {
      result.words = JSON.parse(wordsContent);
    }

    // Download dialogs
    const dialogsContent = await this.downloadFile(GOOGLE_DRIVE_CONFIG.FILES.DIALOGS);
    if (dialogsContent) {
      result.dialogs = JSON.parse(dialogsContent);
    }

    // Download TTS config
    const ttsContent = await this.downloadFile(GOOGLE_DRIVE_CONFIG.FILES.TTS_CONFIG);
    if (ttsContent) {
      result.ttsConfig = JSON.parse(ttsContent);
    }

    // Download metadata
    result.metadata = await this.getSyncMetadata();

    return result;
  }

  private generateHash(content: string): string {
    // Simple hash function for content comparison
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  async hasConflicts(): Promise<boolean> {
    try {
      const cloudMetadata = await this.getSyncMetadata();
      if (!cloudMetadata) return false;

      const localMetadata = this.getLocalMetadata();
      
      return cloudMetadata.lastSync > localMetadata.lastSync &&
             cloudMetadata.deviceId !== this.deviceId;
    } catch {
      return false;
    }
  }

  private getLocalMetadata(): SyncMetadata {
    const stored = localStorage.getItem('syncMetadata');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fall through to default
      }
    }

    return {
      lastSync: 0,
      version: '1.0.0',
      deviceId: this.deviceId,
      files: {}
    };
  }

  saveLocalMetadata(metadata: SyncMetadata): void {
    localStorage.setItem('syncMetadata', JSON.stringify(metadata));
  }
}

// Singleton instance
let googleDriveService: GoogleDriveService | null = null;

export function getGoogleDriveService(): GoogleDriveService {
  if (!googleDriveService) {
    googleDriveService = new GoogleDriveService();
  }
  return googleDriveService;
}
