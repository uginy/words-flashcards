# План миграции проекта Words-Flashcards: Hebrew → English

## 1. Обзор проекта и текущее состояние

### Что изменится
- **Изучаемый язык**: Hebrew (עברית) → English
- **Основной язык интерфейса**: Русский (остается без изменений)
- **Направление изучения**: Русский → Английский (вместо Иврит → Русский)
- **Направление текста**: LTR (left-to-right) вместо RTL (right-to-left)

### Текущая архитектура
- React + TypeScript + Vite
- Zustand для состояния
- i18next для локализации (ru, en, he)
- TTS система с Microsoft и System провайдерами
- OpenRouter API для LLM операций
- Локальное хранение данных

---

## 2. Детальный план по неделям (6 недель)

### 📅 Неделя 1: Типы данных и структуры
**Цель**: Обновить базовые типы и структуры данных

#### Задачи:
- [ ] Обновить [`Word`](src/types/index.ts:3) интерфейс
- [ ] Изменить [`WordCategory`](src/types/index.ts:1) с иврита на английские категории
- [ ] Обновить [`DialogLevel`](src/types/index.ts:51) система уровней
- [ ] Модифицировать [`DialogCard`](src/types/index.ts:66) структуру
- [ ] Обновить [`Dialog`](src/types/index.ts:74) интерфейс

#### Время: 8-10 часов

---

### 📅 Неделя 2: TTS система
**Цель**: Настроить голосовую систему для английского языка

#### Задачи:
- [ ] Обновить [`LanguageDetector`](src/services/tts/LanguageDetector.ts) для английского
- [ ] Настроить [`MicrosoftTTSProvider`](src/services/tts/providers/MicrosoftTTSProvider.ts) для en-US голосов
- [ ] Обновить [`TTSManager`](src/services/tts/TTSManager.ts) конфигурацию
- [ ] Изменить [`SpeakerIcon`](src/components/SpeakerIcon.tsx) для английского произношения
- [ ] Тестирование голосовых настроек

#### Время: 6-8 часов

---

### 📅 Неделя 3: LLM промпты
**Цель**: Переписать все промпты для работы с английским языком

#### Задачи:
- [ ] Полностью переписать [`systemPrompt`](src/services/openrouter/prompts.ts:1) для английского
- [ ] Обновить [`dialog-generation.ts`](src/services/openrouter/dialog-generation.ts) промпты
- [ ] Изменить [`translation.ts`](src/services/openrouter/translation.ts) сервис
- [ ] Обновить [`word-suggestions.ts`](src/services/openrouter/word-suggestions.ts)
- [ ] Протестировать качество генерации

#### Время: 10-12 часов

---

### 📅 Неделя 4: UI компоненты
**Цель**: Адаптировать интерфейс для английского языка

#### Задачи:
- [ ] Обновить [`ConjugationDisplay`](src/components/ConjugationDisplay.tsx) для английских времен
- [ ] Изменить [`FlashCard`](src/components/FlashCard.tsx) компонент
- [ ] Адаптировать [`WordTable`](src/components/WordTable.tsx) для LTR
- [ ] Обновить [`DialogCard`](src/components/DialogCard.tsx) и [`DialogInterface`](src/components/DialogInterface.tsx)
- [ ] Изменить фильтры и категории в UI

#### Время: 8-10 часов

---

### 📅 Неделя 5: Сервисы
**Цель**: Обновить бизнес-логику и сервисы

#### Задачи:
- [ ] Переписать [`enrichment.ts`](src/services/openrouter/enrichment.ts) для английского
- [ ] Обновить [`validators.ts`](src/services/openrouter/validators.ts)
- [ ] Изменить [`processors.ts`](src/services/openrouter/processors.ts)
- [ ] Адаптировать хранилища [`wordsStore.ts`](src/store/wordsStore.ts) и [`dialogsStore.ts`](src/store/dialogsStore.ts)
- [ ] Обновить утилиты [`translation.ts`](src/utils/translation.ts)

#### Время: 6-8 часов

---

### 📅 Неделя 6: Тестирование
**Цель**: Полное тестирование и финальные доработки

#### Задачи:
- [ ] Комплексное тестирование всех функций
- [ ] Проверка TTS для английского
- [ ] Тестирование генерации диалогов
- [ ] Валидация переводов и предложений слов
- [ ] Исправление найденных багов
- [ ] Подготовка к релизу

#### Время: 8-10 часов

---

## 3. Конкретные изменения в файлах

### 3.1 Типы данных [`src/types/index.ts`](src/types/index.ts)

#### ДО:
```typescript
export type WordCategory = 'שם עצם' | 'פועל' | 'שם תואר' | 'פרזות' | 'אחר' | 'דיאלוג';

export interface Word {
  hebrew: string;
  russian: string;
  transcription: string;
  // ...
}

export type DialogLevel = 'אלף' | 'בית' | 'גימל' | 'דלת' | 'הא';
```

#### ПОСЛЕ:
```typescript
export type WordCategory = 'noun' | 'verb' | 'adjective' | 'phrase' | 'other' | 'dialog';

export interface Word {
  english: string;
  russian: string;
  transcription: string; // IPA or simplified pronunciation
  // ...
}

export type DialogLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
```

### 3.2 Спряжения глаголов [`src/components/ConjugationDisplay.tsx`](src/components/ConjugationDisplay.tsx)

#### ДО (иврит):
```typescript
const sections: Record<string, string> = {
  past: 'Прошедшее время',
  present: 'Настоящее время', 
  future: 'Будущее время',
  imperative: 'Повелительное'
};
```

#### ПОСЛЕ (английский):
```typescript
const sections: Record<string, string> = {
  present: 'Present Simple',
  past: 'Past Simple',
  future: 'Future Simple',
  perfect: 'Present Perfect',
  continuous: 'Present Continuous'
};
```

### 3.3 Промпты LLM [`src/services/openrouter/prompts.ts`](src/services/openrouter/prompts.ts)

#### ДО:
```typescript
export const systemPrompt = `You are an expert linguist specializing in Hebrew...`;
```

#### ПОСЛЕ:
```typescript
export const systemPrompt = `You are an expert linguist specializing in English language learning for Russian speakers. Process English words/phrases and provide detailed information with Russian translations...`;
```

### 3.4 TTS настройки [`src/services/tts/types.ts`](src/services/tts/types.ts)

#### Добавить поддержку английских голосов:
```typescript
export interface TTSVoice {
  id: string;
  name: string;
  language: 'en-US' | 'en-GB' | 'en-AU' | 'ru-RU'; // Обновить языки
  gender?: 'male' | 'female';
  provider: TTSProviderType;
  accent?: 'american' | 'british' | 'australian'; // Новое поле
}
```

---

## 4. Особенности английского vs иврита

### 4.1 Упрощенные спряжения
- **Иврит**: Сложная система спряжений по лицам (אני, אתה, את, הוא, היא, etc.)
- **Английский**: Простые формы (I/you/we/they + base form, he/she/it + -s)

### 4.2 Направление текста
- **Иврит**: RTL (справа налево)
- **Английский**: LTR (слева направо)
- **Изменения**: Убрать `dir="rtl"` атрибуты, изменить CSS стили

### 4.3 Категории слов
```typescript
// Было (иврит):
'שם עצם' | 'פועל' | 'שם תואר' | 'פרזות' | 'אחר'

// Стало (английский):
'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'idiom' | 'other'
```

### 4.4 TTS настройки
```typescript
// Microsoft TTS voices для английского:
const englishVoices = {
  'en-US': ['en-US-AriaNeural', 'en-US-JennyNeural', 'en-US-GuyNeural'],
  'en-GB': ['en-GB-SoniaNeural', 'en-GB-RyanNeural'],
  'en-AU': ['en-AU-NatashaNeural', 'en-AU-WilliamNeural']
};
```

### 4.5 Система уровней
```typescript
// Было (иврит алфавит):
'אלף' | 'בית' | 'גימל' | 'דלת' | 'הא'

// Стало (CEFR):
'A1' | 'A2' | 'B1' | 'B2' | 'C1'
```

---

## 5. Чеклист готовности

### ✅ Базовая функциональность
- [ ] Добавление английских слов работает
- [ ] Перевод русский → английский корректен
- [ ] TTS произносит английские слова правильно
- [ ] Генерация диалогов на английском работает
- [ ] Спряжения английских глаголов отображаются корректно

### ✅ UI/UX
- [ ] Все тексты отображаются LTR
- [ ] Интерфейс остается на русском языке
- [ ] Категории слов переведены на английский
- [ ] Уровни диалогов изменены на CEFR
- [ ] Фильтры и поиск работают корректно

### ✅ Качество данных
- [ ] LLM генерирует качественные переводы
- [ ] Примеры использования релевантны
- [ ] Диалоги естественные и полезные
- [ ] Предложения слов работают корректно

### ✅ Производительность
- [ ] TTS кэширование работает для английского
- [ ] API запросы оптимизированы
- [ ] Локальное хранение мигрировано
- [ ] Нет memory leaks

---

## 6. Риски и как их избежать

### 🚨 Критические риски

#### 6.1 Потеря данных пользователя
**Риск**: При изменении структуры [`Word`](src/types/index.ts:3) интерфейса старые данные могут стать несовместимыми.

**Решение**:
```typescript
// Добавить миграцию данных
const migrateWordData = (oldWord: OldWord): Word => {
  return {
    id: oldWord.id,
    english: oldWord.hebrew, // Временно, потом пользователь может переводить
    russian: oldWord.russian,
    transcription: oldWord.transcription,
    category: mapHebrewCategoryToEnglish(oldWord.category),
    // ... остальные поля
  };
};
```

#### 6.2 Качество LLM переводов
**Риск**: Низкое качество автоматических переводов и генерации.

**Решение**:
- Тестировать промпты на [`scripts/test-api-chunks-best-model.ts`](scripts/test-api-chunks-best-model.ts)
- Использовать несколько моделей для сравнения
- Добавить валидацию результатов

#### 6.3 TTS проблемы
**Риск**: Плохое произношение английских слов.

**Решение**:
- Настроить качественные голоса в [`MicrosoftTTSProvider`](src/services/tts/providers/MicrosoftTTSProvider.ts)
- Добавить поддержку разных акцентов (американский, британский)
- Тестировать на [`scripts/test-gender-voices.ts`](scripts/test-gender-voices.ts)

### ⚠️ Средние риски

#### 6.4 Спряжения глаголов
**Риск**: Английская система времен сложнее для отображения чем в иврите.

**Решение**:
- Использовать стандартные английские времена
- Добавить примеры для каждого времени
- Сделать UI более гибким для разных форм

#### 6.5 Производительность API
**Риск**: Увеличение времени ответа из-за более сложных английских промптов.

**Решение**:
- Оптимизировать промпты в [`prompts.ts`](src/services/openrouter/prompts.ts)
- Использовать параллельную обработку
- Добавить прогресс-бары

---

## 7. Дополнительные улучшения

### Новые возможности для английского:
1. **Фразовые глаголы**: Отдельная категория для phrasal verbs
2. **Идиомы**: Специальная обработка английских idioms
3. **Акценты**: Выбор между американским/британским произношением
4. **Неправильные глаголы**: Специальная таблица irregular verbs

### Технические улучшения:
1. **Кэширование**: Улучшенное кэширование для английских данных
2. **Офлайн режим**: Базовая функциональность без интернета
3. **Экспорт**: Возможность экспорта словаря в Anki формат

---

## 8. Завершение миграции

### Финальные шаги:
1. Полное тестирование всех функций
2. Обновление документации
3. Создание backup старой версии
4. Релиз новой версии
5. Сбор обратной связи от пользователей

### Критерии успеха:
- ✅ Все базовые функции работают с английским языком
- ✅ Качество переводов и генерации диалогов высокое
- ✅ TTS корректно произносит английские слова
- ✅ UI остается интуитивным на русском языке
- ✅ Производительность не хуже текущей версии

---

**Общее время реализации**: 6 недель (46-56 часов работы)

**Дата начала**: По готовности команды  
**Предполагаемое завершение**: Через 6 недель после начала

**Ответственный**: Eugene  
**Приоритет**: Высокий