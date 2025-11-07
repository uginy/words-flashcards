import type { Word } from '@/types';
import type { ImageGenerationSettings } from '@/config/image-generation';
import type { WordImageAsset } from '@/types/imageGeneration';
import { generateImageWithBananaGemini } from './providers/geminiBanana';

export const DEFAULT_NEGATIVE_IMAGE_PROMPT =
  'no overlaid text, no Hebrew letters, no UI chrome, no borders, no watermark';

const FALLBACK_PROMPT =
  'Create a flat icon that helps memorize a Hebrew vocabulary word using a single, bold object.';

export const buildImagePrompt = (word: Word, template?: string): string => {
  if (!template) {
    return FALLBACK_PROMPT;
  }

  return template
    .replace(/{{hebrew}}/gi, word.hebrew)
    .replace(/{{translation}}/gi, word.russian)
    .replace(/{{category}}/gi, word.category ?? '')
    .trim();
};

interface GenerateWordImageOptions {
  word: Word;
  settings: ImageGenerationSettings;
  negativePrompt?: string;
}

export const generateWordImageAsset = async ({
  word,
  settings,
  negativePrompt = DEFAULT_NEGATIVE_IMAGE_PROMPT,
}: GenerateWordImageOptions): Promise<WordImageAsset> => {
  const prompt = buildImagePrompt(word, settings.promptTemplate);

  switch (settings.provider) {
    case 'banana-gemini': {
      const base = await generateImageWithBananaGemini({
        prompt,
        settings: settings.banana,
        negativePrompt,
      });
      return {
        ...base,
        provider: settings.provider,
        prompt,
      };
    }
    default:
      throw new Error(`Провайдер ${settings.provider} пока не поддерживается`);
  }
};
