# Test Scripts

## API Chunks Test (`test-api-chunks.ts`)

Тестовый скрипт для проверки API обработки слов с чанками. Помогает выявлять проблемы с некорректными JSON ответами и анализировать производительность API.

### Основные возможности

- ✅ Тестирует 20 реальных еврейских слов разных категорий
- ✅ Разбивает слова на чанки по 5 (как в реальном приложении)
- ✅ Подробное логирование каждого запроса и ответа
- ✅ Обнаружение проблем с некорректными JSON
- ✅ Статистика успешных/неудачных запросов
- ✅ Анализ типов ошибок (JSON parsing, network, API, validation)
- ✅ Задержка между запросами для предотвращения rate limiting
- ✅ Конфигурация через переменные окружения

### Запуск

#### Основной запуск
```bash
# Запуск с настройками по умолчанию
bun run test:api-chunks

# Или напрямую через npx
npx tsx scripts/test-api-chunks.ts
```

#### С кастомными настройками
```bash
# Кастомная модель
OPENROUTER_MODEL="anthropic/claude-3-sonnet" bun run test:api-chunks

# Кастомный API ключ
OPENROUTER_API_KEY="your-api-key-here" bun run test:api-chunks

# Принудительное использование инструментов
FORCE_TOOL_SUPPORT=true bun run test:api-chunks

# Комбинация настроек
OPENROUTER_MODEL="openai/gpt-4" FORCE_TOOL_SUPPORT=false bun run test:api-chunks
```

#### Помощь
```bash
npx tsx scripts/test-api-chunks.ts --help
```

### Переменные окружения

| Переменная | Описание | Значение по умолчанию |
|------------|----------|----------------------|
| `OPENROUTER_API_KEY` | API ключ OpenRouter | Из конфигурации |
| `OPENROUTER_MODEL` | Модель для тестирования | Из конфигурации |
| `FORCE_TOOL_SUPPORT` | Принудительно использовать инструменты | Auto-detect |

### Тестовые данные

Скрипт использует 20 реальных еврейских слов:

**Глаголы (פועל):**
- לאכול (to eat)
- ללכת (to go)  
- לדבר (to speak)
- לכתוב (to write)
- לקרוא (to read)

**Существительные (שם עצם):**
- ספר (book)
- בית (house)
- מים (water)
- אוכל (food)
- חבר (friend)

**Прилагательные (שם תואר):**
- גדול (big)
- קטן (small)
- יפה (beautiful)
- טוב (good)
- רע (bad)

**Фразы (פרזות):**
- מה שלומך (how are you)
- בוקר טוב (good morning)
- תודה רבה (thank you very much)
- סליחה (excuse me)
- שלום (hello/goodbye)

### Вывод информации

Скрипт предоставляет детальную информацию:

#### Для каждого чанка:
- 🚀 Начало обработки с списком слов
- ✅/❌ Результат обработки
- ⏱️ Время обработки
- 📋 Детальная информация по каждому слову
- 🔍 Анализ ошибок (если есть)

#### Финальная статистика:
- 📈 Общие результаты (успешные/неудачные чанки)
- 📝 Статистика по словам
- ⏱️ Информация о времени
- 🐛 Разбивка ошибок по типам
- 🔍 Детальный анализ ошибок
- 💡 Рекомендации по исправлению

### Примеры вывода

#### Успешная обработка чанка:
```
[2025-01-28T10:15:30.123Z] 🚀 Starting processing Chunk 1 (5 words: לאכול, ללכת, לדבר, לכתוב, לקרוא)
[2025-01-28T10:15:32.456Z] ✅ Successfully processed Chunk 1 (5 words: לאכול, ללכת, לדבר, לכתוב, לקרוא)
   📊 Processing time: 2333ms
   📝 Words processed: 5
   📋 Detailed results:
      1. לאכול (פועל)
         Transcription: ✅ "le'echol"
         Translation: ✅ "есть"
         Conjugations: ✅
         Examples: ✅ (2)
```

#### Ошибка JSON парсинга:
```
[2025-01-28T10:15:35.789Z] ❌ Failed to process Chunk 2 (5 words: ספר, בית, מים, אוכל, חבר)
   💥 Error type: json_parse
   📄 Error message: Failed to parse LLM response content as JSON
   ⏱️ Processing time: 1876ms
   🔍 Error analysis:
   🚨 Potential JSON issues detected:
      - Response is only an opening brace "{"
```

#### Финальная статистика:
```
📊 FINAL TEST STATISTICS
========================================
📈 Overall Results:
   Total chunks processed: 4
   Successful chunks: 3 (75%)
   Failed chunks: 1 (25%)

📝 Word Processing:
   Total words: 20
   Successfully processed: 15 (75%)
   Failed to process: 5 (25%)

⏱️ Timing:
   Total test time: 12s
   Average chunk processing time: 2156ms

🐛 Error Breakdown:
   JSON parsing errors: 1
   Network errors: 0
   API errors: 0
   Validation errors: 0
```

### Анализ проблем

Скрипт автоматически выявляет и анализирует:

1. **JSON parsing errors** - некорректный JSON в ответе
   - Незакрытые скобки
   - Markdown обёртки (```json)
   - Неполные объекты
   - Только открывающая скобка "{"

2. **Network errors** - проблемы с сетью
   - Таймауты
   - Недоступность API

3. **API errors** - ошибки API
   - Неверный ключ
   - Превышение лимитов
   - Недоступная модель

4. **Validation errors** - ошибки валидации данных
   - Неожидаемая структура ответа
   - Отсутствующие поля

### Exit коды

- `0` - Все чанки обработаны успешно
- `1` - Есть неудачные чанки

### Требования

- Node.js 18+
- Установленные зависимости (`bun install`)
- Валидный API ключ OpenRouter