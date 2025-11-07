export type ImageGenerationProvider = 'banana-gemini';

export interface WordImageAsset {
  dataUrl?: string;
  storageKey?: string;
  provider: ImageGenerationProvider;
  modelId: string;
  prompt: string;
  mimeType: string;
  width: number;
  height: number;
  generatedAt: number;
  metadata?: Record<string, unknown>;
}

export interface ImageGenerationStatus {
  status: 'idle' | 'generating' | 'error';
  error?: string;
}
