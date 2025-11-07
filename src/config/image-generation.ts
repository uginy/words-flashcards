import type { ImageGenerationProvider } from '@/types/imageGeneration';

const IMAGE_SETTINGS_STORAGE_KEY = 'imageGenerationSettings';
const DEFAULT_IMAGE_API_BASE_URL = 'https://generativelanguage.googleapis.com';
const DEFAULT_PROMPT_TEMPLATE = [
  'Design a clean, mnemonic-friendly 256x256 flat icon for the Hebrew word "{{hebrew}}"',
  '(translation: "{{translation}}").',
  'Focus on a single object or scene that captures the meaning,',
  'use soft gradients, rounded shapes, and avoid placing any text on the icon.'
].join(' ');

export type ImageSizeOption = '256x256' | '512x512' | '768x768';

export interface BananaImageSettings {
  apiKey: string;
  modelId: string;
  baseUrl: string;
  size: ImageSizeOption;
}

export interface ImageGenerationSettings {
  provider: ImageGenerationProvider;
  banana: BananaImageSettings;
  promptTemplate: string;
}

export const DEFAULT_IMAGE_PROVIDER: ImageGenerationProvider = 'banana-gemini';

export const DEFAULT_IMAGE_SETTINGS: ImageGenerationSettings = {
  provider: DEFAULT_IMAGE_PROVIDER,
  banana: {
    apiKey: '',
    modelId: 'models/gemini-2.5-flash-image',
    baseUrl: DEFAULT_IMAGE_API_BASE_URL,
    size: '256x256',
  },
  promptTemplate: DEFAULT_PROMPT_TEMPLATE,
};

const isBrowser = typeof window !== 'undefined';

export const loadImageSettings = (): ImageGenerationSettings => {
  if (!isBrowser) {
    return DEFAULT_IMAGE_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(IMAGE_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_IMAGE_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<ImageGenerationSettings>;
    return {
      provider: parsed.provider ?? DEFAULT_IMAGE_SETTINGS.provider,
      banana: {
        apiKey: parsed.banana?.apiKey ?? DEFAULT_IMAGE_SETTINGS.banana.apiKey,
        modelId: parsed.banana?.modelId ?? DEFAULT_IMAGE_SETTINGS.banana.modelId,
        baseUrl: parsed.banana?.baseUrl ?? DEFAULT_IMAGE_SETTINGS.banana.baseUrl,
        size: parsed.banana?.size ?? DEFAULT_IMAGE_SETTINGS.banana.size,
      },
      promptTemplate: parsed.promptTemplate ?? DEFAULT_IMAGE_SETTINGS.promptTemplate,
    };
  } catch (error) {
    console.error('Error loading image settings:', error);
    return DEFAULT_IMAGE_SETTINGS;
  }
};

export const saveImageSettings = (settings: ImageGenerationSettings): void => {
  if (!isBrowser) {
    return;
  }

  try {
    localStorage.setItem(IMAGE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving image settings:', error);
  }
};

export const getBananaBaseUrl = (baseUrl?: string): string => {
  if (!baseUrl) return DEFAULT_IMAGE_API_BASE_URL;
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};
