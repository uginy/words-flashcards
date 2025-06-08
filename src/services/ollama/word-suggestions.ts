import { createOllamaClient } from './api-client';
import { DEFAULT_OLLAMA_API_URL, DEFAULT_OLLAMA_MODEL, DEFAULT_OLLAMA_TEMPERATURE } from '../../config/ollama';

interface SuggestWordsParams {
  category: string;
  level: string;
  count: number;
  baseUrl?: string;
  model?: string;
  temperature?: number;
}

export const fetchSuggestedWordsWithOllama = async ({
  category,
  level,
  count,
  baseUrl = DEFAULT_OLLAMA_API_URL,
  model = DEFAULT_OLLAMA_MODEL,
  temperature = DEFAULT_OLLAMA_TEMPERATURE
}: SuggestWordsParams): Promise<string[]> => {
  if (count <= 0 || count > 40) {
    throw new Error('Количество слов должно быть от 1 до 40');
  }

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
- ВАЖНО: БЕЗ НЕКДОТ (огласовок)! Используй только стандартные еврейские буквы без точек и черточек

Ответ дай ТОЛЬКО в виде списка фраз на иврите БЕЗ НЕКДОТ, разделенных запятыми, без нумерации и пояснений.`
    : `Предложи список из ${count} слов на иврите для изучения.

ВАЖНО! Категория: ${category}, Уровень сложности: ${level} (${levelDescription}).

Требования к словам:
- Строго соответствуют указанному уровню сложности
- Для высоких уровней (гимель и выше): сложные, редкие, академические, специализированные слова
- Для средних уровней: слова средней частотности использования
- Для начальных уровней: только самые базовые, частоупотребляемые слова
- Для глаголов: используй инфинитивную форму (לפעיל)
- КРИТИЧЕСКИ ВАЖНО: БЕЗ НЕКДОТ (огласовок)! Используй только стандартные еврейские буквы без точек и черточек (ניקוד)

Ответ дай ТОЛЬКО в виде списка слов на иврите БЕЗ НЕКДОТ, разделенных запятыми, без нумерации и пояснений.`;

  try {
    // Create Ollama client
    const ollamaClient = createOllamaClient(baseUrl);
    
    // Check if Ollama service is available
    const isHealthy = await ollamaClient.checkHealth();
    if (!isHealthy) {
      throw new Error('Ollama service is not available. Please make sure Ollama is running.');
    }

    // Make API call to Ollama
    const response = await ollamaClient.chat({
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: temperature
    });

    if (!response?.message?.content) {
      throw new Error('Invalid response from Ollama: No content in message');
    }

    const content = response.message.content.trim();

    if (!content) {
      throw new Error('Empty response from Ollama');
    }

    // Parse the response and extract words/phrases
    // Split by commas and clean up each word
    const words = content
      .split(',')
      .map((word: string) => word.trim())
      .filter((word: string) => word.length > 0)
      .slice(0, count); // Ensure we don't exceed requested count

    if (words.length === 0) {
      throw new Error('No valid words found in Ollama response');
    }

    return words;

  } catch (error) {
    console.error('Error fetching word suggestions from Ollama:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Ollama service is not available')) {
        throw new Error(`Ollama недоступен. Убедитесь, что Ollama запущен по адресу: ${baseUrl}`);
      }
      if (error.message.includes('model not found') || error.message.includes('404')) {
        throw new Error(`Модель "${model}" не найдена. Установите модель: ollama pull ${model}`);
      }
      if (error.message.includes('connection refused') || error.message.includes('ECONNREFUSED')) {
        throw new Error('Не удается подключиться к Ollama. Проверьте, что Ollama запущен и доступен по указанному URL.');
      }
    }
    
    throw error;
  }
};
