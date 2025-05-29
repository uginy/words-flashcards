import OpenAI from "openai";
import { DEFAULT_OPENROUTER_API_KEY, DEFAULT_OPENROUTER_MODEL } from '../config/openrouter';

export async function translateToHebrew(
  russianText: string,
  apiKey: string = localStorage.getItem('openRouterApiKey') || DEFAULT_OPENROUTER_API_KEY,
  modelIdentifier: string = localStorage.getItem('openRouterModel') || DEFAULT_OPENROUTER_MODEL,
): Promise<string[]> {
  if (!apiKey || !modelIdentifier) {
    throw new Error('API key or model not configured.');
  }

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });

  const systemPrompt = `You are a professional Russian to Hebrew translator.
Your task is to translate the given Russian words into Hebrew, providing multiple translations where applicable.

Given text format: Words in Russian, separated by newlines.
Required output format: A comma-separated list where each Russian word can have multiple Hebrew translations without niqqud separated by commas.

Example input:
кошка
собака
идти

Example output:
חתול
חתלתול
כלב
ללכת
להלך

Important:
- For each word, provide all relevant translations separated by commas without niqqud
- Each word's translations should be on a new line
- Do not add any additional text or explanations
- Preserve the original order of words
- Use appropriate synonyms and variations where they exist
- **CRITICAL: For verbs, ALWAYS use the infinitive form in Hebrew (לפעיל form). If you receive a conjugated verb in Russian (like "работаю", "делаю", "иду"), convert it to the infinitive form in Hebrew (like "לעבוד", "לעשות", "ללכת")**`;

  try {
    const completion = await openai.chat.completions.create({
      model: modelIdentifier,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: russianText }
      ],
      stream: false
    });

    if (!completion.choices || !completion.choices[0]?.message?.content) {
      throw new Error('Invalid translation response');
    }

    // Split response into lines and process each line's translations
    return completion.choices[0].message.content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .flatMap(line =>
        line.split(',').map(word => word.trim()).filter(word => word.length > 0)
      );
  } catch (error) {
    console.error('Translation error:', error);
    if (error instanceof OpenAI.APIError && error.status === 401) {
      throw new Error(
        'Authentication failed. Please check your OpenRouter API key. It might be invalid, missing, or your credits might have run out.'
      );
    }
    throw error;
  }
}
