# Сервисы генерации диалогов

Этот документ описывает созданные сервисы для генерации диалогов согласно архитектурному плану.

## Структура сервисов

### 1. `src/services/dialogGeneration.ts`
Основной сервис генерации диалогов с валидацией и обработкой.

**Основные функции:**
- `generateDialog()` - главная функция генерации диалогов
- `validateDialogContent()` - валидация сгенерированного контента  
- `processDialogResponse()` - обработка ответа от LLM
- `buildDialogPrompt()` - построение промпта для генерации

### 2. `src/services/openrouter/dialog-generation.ts`
Интеграция с OpenRouter API для генерации диалогов.

**Функции:**
- `generateDialogWithOpenRouter()` - генерация через OpenRouter API
- Поддержка различных уровней сложности (אלף, בית, גימל, דלת, הא)
- Retry логика с exponential backoff
- Обработка ошибок и отмены операций

### 3. `src/services/openrouter/prompts.ts` (расширен)
Добавлены промпты для генерации диалогов:
- `dialogGenerationSystemPrompt()` - системный промпт для диалогов
- `buildDialogGenerationPrompt()` - построение промпта с параметрами

### 4. `src/hooks/useDialogSpeech.ts`
Расширенный TTS сервис для диалогов с поддержкой:
- Очереди воспроизведения реплик
- Настройки голосов для разных персонажей
- Управление воспроизведением (play/pause/stop)
- Автоматическое воспроизведение диалогов

### 5. `src/store/dialogsStore.ts` (обновлен)
Zustand store интегрирован с реальной генерацией диалогов:
- Замена мокового кода на реальную интеграцию с LLM
- Прогресс-трекинг генерации
- Обработка ошибок и уведомлений

## Использование

### Генерация диалога
```typescript
import { generateDialog } from '../services/dialogGeneration';

const settings: DialogGenerationSettings = {
  level: 'בית',
  participantCount: 2,
  participants: [
    { id: 'p1', name: 'שרה', gender: 'female' },
    { id: 'p2', name: 'דוד', gender: 'male' }
  ],
  useExistingWords: true,
  includeNewWords: true,
  topic: 'בבית קפה'
};

const dialog = await generateDialog(settings, apiKey, model);
```

### Использование TTS для диалогов
```typescript
import { useDialogSpeech } from '../hooks/useDialogSpeech';

const {
  playDialog,
  playSingleCard,
  stopPlayback,
  isPlaying
} = useDialogSpeech({
  cards: dialog.cards,
  participants: dialog.participants,
  autoPlay: false
});

// Воспроизвести весь диалог
await playDialog();

// Воспроизвести одну реплику
await playSingleCard(cardIndex);
```

### Работа со store
```typescript
import { useDialogsStore } from '../store/dialogsStore';

const {
  generateDialog,
  dialogs,
  isBackgroundProcessing
} = useDialogsStore();

// Генерация диалога
await generateDialog(settings, toast);
```

## Поддерживаемые уровни

- **אלף** (Alef) - Beginner: простые слова и базовые предложения
- **בית** (Bet) - Elementary: общие фразы и базовая грамматика  
- **גימל** (Gimel) - Intermediate: сложные предложения и разнообразная лексика
- **דלת** (Dalet) - Advanced: сложный язык и идиомы
- **הא** (He) - Expert: сложный литературный и профессиональный язык

## Настройка голосов

Сервис автоматически выбирает голоса на иврите и пытается сопоставить их с полом персонажей:

```typescript
const participant: DialogParticipant = {
  id: 'p1',
  name: 'שרה',
  gender: 'female',
  voiceSettings: {
    pitch: 1.2,    // Высота голоса
    rate: 1.0,     // Скорость речи
    volume: 1.0    // Громкость
  }
};
```

## Тестирование

Запустить тест генерации диалогов:
```bash
bun run scripts/test-dialog-generation.ts
```

**Примечание:** Для полного тестирования требуется валидный OpenRouter API ключ.

## Интеграция с существующей архитектурой

Сервисы полностью интегрированы с:
- Системой типов (`src/types/`)
- OpenRouter инфраструктурой (`src/services/openrouter/`)
- Zustand stores (`src/store/`)
- Web Speech API (`src/hooks/useSpeechSynthesis.ts`)

Все промпты написаны на английском, но генерируют диалоги на иврите с переводом на русский.