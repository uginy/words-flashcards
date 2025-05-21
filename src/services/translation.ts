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
Your task is to translate the given Russian words into Hebrew.

Given text format: Words in Russian, separated by newlines.
Required output format: A comma-separated list of translated Hebrew words.

Example input:
кошка
собака
дом

Example output:
חתול, כלב, בית

Important:
- Return ONLY the translated words in a single line, separated by commas
- Do not add any additional text or explanations
- Preserve the original order of words`;

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

    // Split by commas and filter empty items
    return completion.choices[0].message.content
      .split(',')
      .map(word => word.trim())
      .filter(word => word.length > 0);
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}