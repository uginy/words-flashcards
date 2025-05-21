interface SuggestWordsParams {
  category: string;
  level: string;
  apiKey: string;
  modelIdentifier: string;
  count: number;
}

export const fetchSuggestedWords = async ({
  category,
  level,
  apiKey,
  modelIdentifier,
  count
}: SuggestWordsParams): Promise<string[]> => {
  const prompt = `Предложи список из ${count} новых слов на иврите для изучения. Категория: ${category}. Уровень: ${level}. Ответ дай в виде списка слов на иврите, разделенных запятыми, без нумерации и дополнительных пояснений. Только слова через запятую.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
      },
      body: JSON.stringify({
        model: modelIdentifier,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in API response');
    }

    // Разделяем ответ на массив слов и очищаем от пробелов
    return content.split(',').map((word: string) => word.trim()).filter(Boolean);

  } catch (error) {
    console.error('Error fetching word suggestions:', error);
    throw error;
  }
}