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
  // Special handling for phrases category
  const isPhrases = category.includes('Фразы') || category.includes('פרזות');
  
  // Get detailed level description
  const getLevelDescription = (level: string) => {
    if (level.includes('Алеф') || level.includes('א')) {
      return 'начальный уровень - самые базовые, простые слова для новичков';
    }
    if (level.includes('Бет') || level.includes('ב')) {
      return 'элементарный уровень - простые повседневные слова';
    }
    if (level.includes('Гимель') || level.includes('ג')) {
      return 'средний уровень - более сложные слова, требующие хорошего знания языка';
    }
    if (level.includes('Далет') || level.includes('ד')) {
      return 'выше среднего уровень - продвинутые слова для опытных изучающих';
    }
    if (level.includes('Һей') || level.includes('ה')) {
      return 'высокий уровень - сложные академические и специализированные термины';
    }
    if (level.includes('Вав') || level.includes('ו')) {
      return 'профессиональный уровень - очень сложные слова, литературная лексика, архаизмы, высокий иврит';
    }
    return 'средний уровень';
  };

  const levelDescription = getLevelDescription(level);

  const prompt = isPhrases
    ? `Предложи список из ${count} фраз и выражений на иврите для изучения. 

ВАЖНО! Уровень сложности: ${level} (${levelDescription}).

Требования к фразам:
- Соответствуют указанному уровню сложности
- Для высоких уровней (гимель и выше): используй сложную грамматику, редкие слова, идиоматические выражения
- Для средних уровней: разговорные фразы с умеренной сложностью  
- Для начальных уровней: простые базовые фразы

Ответ дай ТОЛЬКО в виде списка фраз на иврите, разделенных запятыми, без нумерации и пояснений.`
    : `Предложи список из ${count} слов на иврите для изучения.

ВАЖНО! Категория: ${category}, Уровень сложности: ${level} (${levelDescription}).

Требования к словам:
- Строго соответствуют указанному уровню сложности
- Для высоких уровней (гимель и выше): сложные, редкие, академические, специализированные слова
- Для средних уровней: слова средней частотности использования
- Для начальных уровней: только самые базовые, частоупотребляемые слова
- Для глаголов: используй инфинитивную форму (לפעיל)

Ответ дай ТОЛЬКО в виде списка слов на иврите, разделенных запятыми, без нумерации и пояснений.`;

  try {
    const response = await fetch(, {
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
