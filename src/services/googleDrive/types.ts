// Google Drive API configuration
export const GOOGLE_DRIVE_CONFIG = {
  CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || '',
  DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  SCOPES: 'https://www.googleapis.com/auth/drive.file',
  APP_FOLDER_NAME: 'FlashcardsApp',
  FILES: {
    WORDS: 'hebrew-flashcards-data.json',
    DIALOGS: 'flashcards-dialogs.json',
    TTS_CONFIG: 'tts-config.json',
    METADATA: 'sync-metadata.json'
  }
};

export interface SyncMetadata {
  lastSync: number;
  version: string;
  deviceId: string;
  files: {
    [key: string]: {
      fileId: string;
      lastModified: number;
      hash: string;
    };
  };
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  size: string;
}

export interface AppData {
  words?: unknown[];
  dialogs?: unknown[];
  ttsConfig?: Record<string, unknown>;
}

export interface ConflictData {
  words?: unknown[];
  dialogs?: unknown[];
  ttsConfig?: Record<string, unknown>;
}
