# OpenRouter Tools Support Test

Скрипт для проверки поддержки tools/functions в OpenRouter моделях.

## Описание

Этот скрипт тестирует список моделей OpenRouter на предмет поддержки function calling (tools) и прямого JSON режима. Для каждой модели выполняется два теста:

1. **Tools Mode** - принудительно включенный режим function calling (`modelSupportsToolsExplicit: true`)
2. **Direct Mode** - принудительно отключенный режим tools с прямым JSON (`modelSupportsToolsExplicit: false`)

## Тестируемые модели

```
mistralai/devstral-small:free
meta-llama/llama-3.3-8b-instruct:free
meta-llama/llama-4-maverick:free
meta-llama/llama-4-scout:free
google/gemini-2.5-pro-exp-03-25
mistralai/mistral-small-3.1-24b-instruct:free
meta-llama/llama-3.3-70b-instruct:free
mistralai/mistral-7b-instruct:free
google/gemma-3-27b-it:free
google/gemma-3-12b-it:free
```

## Тестовые данные

Используется фиксированный набор из 5 Hebrew слов:
- `לאכול` (есть)
- `ספר` (книга)
- `גדול` (большой)
- `מה שלומך` (как дела)
- `שלום` (привет/пока)

## Критерии оценки

### 🟢 Full Support
- Модель успешно работает с function calling tools
- Может также работать в direct JSON режиме

### 🟡 Partial Support  
- Модель НЕ поддерживает function calling
- Но работает в direct JSON режиме

### 🔴 No Support
- Модель не работает ни в одном режиме

### ⚫ Error
- Критические ошибки во время тестирования

## Запуск

```bash
# Через npm script
bun run test:tools-support

# Или напрямую
npx tsx scripts/test-tools-support.ts
```

## Конфигурация

- **Timeout**: 30 секунд на запрос
- **Delay между моделями**: 5 секунд
- **Retry логика**: Используется из `enrichWordsWithLLM`

## Выходные файлы

1. **`tools-support-results.json`** - Детальные результаты в JSON формате
2. **`tools-support-report.md`** - Markdown отчет с рекомендациями

## Структура результата

```typescript
interface ToolsSupportResult {
  modelName: string;
  toolsSupport: 'full' | 'none' | 'partial' | 'error';
  toolsModeSuccess: boolean;
  directModeSuccess: boolean;
  toolsModeError?: string;
  directModeError?: string;
  toolsModeResponseTime: number;
  directModeResponseTime: number;
  recommendedMode: 'tools' | 'direct';
}
```

## Примеры ошибок

### Function Calling ошибки
- `"Expected a function call"` - Модель не понимает function calling
- `"tools field exceeds max depth limit"` - Ограничения провайдера

### JSON ошибки
- `"JSON parse error"` - Некорректный JSON в ответе
- `"Empty or invalid response"` - Пустой или неполный ответ

## Логирование

Скрипт выводит цветной прогресс в консоль:
- 🚀 Начало тестирования модели
- ✅ Успешные результаты (зеленый)
- ❌ Ошибки (красный)
- ⏳ Прогресс-бар
- 📊 Итоговая статистика

## Troubleshooting

### Таймауты
Если модели часто падают по таймауту, можно увеличить `TIMEOUT_MS` в скрипте.

### Rate Limits
Между моделями есть задержка 5 секунд. При необходимости можно увеличить `DELAY_BETWEEN_MODELS`.

### API Key
Используется `DEFAULT_OPENROUTER_API_KEY` из конфига. Убедитесь что ключ валидный.

## Интерпретация результатов

После выполнения скрипта анализируйте:

1. **Full Support модели** - лучший выбор для function calling
2. **Partial Support модели** - используйте с `modelSupportsToolsExplicit: false`
3. **No Support модели** - избегайте или исследуйте дополнительно
4. **Response времена** - для выбора самых быстрых моделей

## Цель

Определить какие OpenRouter модели:
- ✅ Полностью поддерживают наш function calling формат
- ⚠️ Работают только в direct JSON режиме  
- ❌ Не подходят для текущего формата запросов