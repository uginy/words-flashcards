# Тест генерации SSML для Microsoft TTS

## Проверка настроек TTS

### Что проверить в коде:

1. **Сохранение в localStorage** ✅
   - `TTSManager.updateConfig()` корректно сохраняет все настройки в localStorage
   - `TTSManager.loadConfig()` загружает все поля включая новые: `selectedMaleVoice`, `selectedFemaleVoice`, `voiceStyleDegree`

2. **Передача конфигурации в провайдер** ✅
   - `TTSManager.updateProviders()` передает все параметры в `MicrosoftTTSProvider`
   - `TTSSettings.updateConfig()` сразу обновляет активный провайдер через `provider.updateConfig()`

3. **Генерация SSML** ✅
   - `MicrosoftSSMLBuilder.buildSSML()` учитывает все параметры:
     - `speechRate`, `speechPitch`, `speechVolume` в `<prosody>`
     - `voiceStyle` в `<mstts:express-as style="">`
     - `voiceStyleDegree` в `styledegree=""` (если не равно 1)
     - `voiceRole` в `role=""` 
     - `selectedMaleVoice`/`selectedFemaleVoice` для выбора голоса по полу

4. **Настройки в UI** ✅
   - Все новые поля добавлены в интерфейс TTSSettings
   - Корректные стили и роли согласно документации Microsoft
   - Отдельные настройки для мужских и женских голосов
   - Обработчики для всех полей включая `voiceStyleDegree`
   - Функции reset правильно сбрасывают все поля

## Пример генерируемого SSML

### Базовый SSML:
```xml
<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" version="1.0" xml:lang="he-IL">
  <voice name="he-IL-HilaNeural">
    <prosody rate="medium" pitch="medium" volume="medium">
      שלום עולם
    </prosody>
  </voice>
</speak>
```

### SSML со стилем и ролью:
```xml
<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" version="1.0" xml:lang="he-IL">
  <voice name="he-IL-AvriNeural">
    <mstts:express-as style="cheerful" styledegree="1.5" role="Boy">
      <prosody rate="fast" pitch="high" volume="loud">
        זה קול גברי שמח
      </prosody>
    </mstts:express-as>
  </voice>
</speak>
```

## Как проверить в живую:

1. Откройте приложение и перейдите в Settings
2. Выберите Microsoft Cognitive Services
3. Введите API key
4. Настройте различные параметры:
   - Выберите разные голоса для мужского/женского пола
   - Установите стиль (например, "cheerful")
   - Измените Style Degree (например, 1.5)
   - Выберите роль (например, "Boy")
   - Настройте речевые параметры (rate, pitch, volume)
5. Нажмите кнопки тестирования:
   - "Test Voice" - общий тест
   - "Test Male Voice" - тест мужского голоса
   - "Test Female Voice" - тест женского голоса
   - "Test SSML" - показывает конфигурацию в консоли
6. Проверьте консоль браузера на предмет:
   - Логов конфигурации TTS
   - Сгенерированного SSML
   - Ошибок запросов к API

## Ключевые моменты:

- ✅ Все настройки сохраняются в localStorage как `tts_config`
- ✅ SSML корректно генерируется с учетом всех параметров
- ✅ Выбор голоса по полу работает через `selectedMaleVoice`/`selectedFemaleVoice`
- ✅ Стили и роли соответствуют документации Microsoft
- ✅ Style Degree применяется только при наличии стиля и значении != 1
- ✅ Конфигурация сразу применяется к активному провайдеру
