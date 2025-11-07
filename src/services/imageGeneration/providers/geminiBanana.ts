import type { BananaImageSettings } from '@/config/image-generation';
import type { WordImageAsset } from '@/types/imageGeneration';
import { getBananaBaseUrl } from '@/config/image-generation';

interface GeminiInlineData {
  mimeType?: string;
  data?: string;
}

interface GeminiPart {
  inlineData?: GeminiInlineData;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
}

interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[];
  error?: {
    message?: string;
  };
}

interface GenerateBananaImageParams {
  prompt: string;
  settings: BananaImageSettings;
  negativePrompt?: string;
}

const buildEndpoint = (baseUrl: string, modelId: string): string => {
  const normalizedBase = getBananaBaseUrl(baseUrl);
  const trimmedModel = (modelId && modelId.trim()) || 'models/gemini-2.5-flash-image';
  const modelPath = trimmedModel.startsWith('models/') ? trimmedModel : `models/${trimmedModel}`;
  return `${normalizedBase}/v1beta/${modelPath}:generateContent`;
};

const extractInlineData = (response: GeminiGenerateContentResponse): GeminiInlineData | undefined => {
  const candidate = response.candidates?.find(c => c.content?.parts?.some(part => part.inlineData?.data));
  return candidate?.content?.parts?.find(part => part.inlineData?.data)?.inlineData;
};

export const generateImageWithBananaGemini = async ({
  prompt,
  settings,
  negativePrompt,
}: GenerateBananaImageParams): Promise<Omit<WordImageAsset, 'provider' | 'prompt'>> => {
  if (!settings.apiKey) {
    throw new Error('API ключ Gemini не задан');
  }

  const [width, height] = settings.size.split('x').map(value => Number.parseInt(value, 10));
  const endpoint = buildEndpoint(settings.baseUrl, settings.modelId);
  const url = new URL(endpoint);
  url.searchParams.set('key', settings.apiKey);

  const enrichedPrompt = [
    prompt,
    `Изобрази понятную ассоциативную иконку размером ${width || 256}x${height || 256} пикселей.`,
    'Без текста и надписей.'
  ].join(' ');

  const body = {
    contents: [
      {
        role: 'user' as const,
        parts: [
          { text: enrichedPrompt },
          negativePrompt ? { text: `Избегай: ${negativePrompt}` } : null,
        ].filter((part): part is { text: string } => Boolean(part)),
      },
    ],
  };

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as GeminiGenerateContentResponse;

  if (!response.ok) {
    const errorMessage = data.error?.message || 'Не удалось получить ответ от Gemini';
    throw new Error(errorMessage);
  }

  const inlineData = extractInlineData(data);
  if (!inlineData?.data) {
    throw new Error('Провайдер не вернул изображение');
  }

  const mimeType = inlineData.mimeType || 'image/png';

  return {
    dataUrl: `data:${mimeType};base64,${inlineData.data}`,
    modelId: settings.modelId,
    mimeType,
    width: Number.isFinite(width) ? width : 256,
    height: Number.isFinite(height) ? height : 256,
    generatedAt: Date.now(),
  };
};
