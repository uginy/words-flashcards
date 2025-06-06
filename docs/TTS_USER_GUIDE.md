# Руководство пользователя TTS (Text-to-Speech)

## Обзор

Приложение Words Flashcards поддерживает функцию озвучивания текста (TTS) для улучшения изучения языков. Система автоматически определяет язык текста и использует соответствующие голоса для произношения слов и фраз.

## Поддерживаемые языки

- **Русский** (ru-RU)
- **Английский** (en-US) 
- **Иврит** (he-IL)

## Настройка Microsoft TTS API

### Получение бесплатного API ключа

Microsoft предоставляет бесплатный уровень Speech Services с лимитом **500,000 символов в месяц**.

#### Пошаговая инструкция:

1. **Создайте учетную запись Azure**
   - Перейдите на [portal.azure.com](https://portal.azure.com)
   - Зарегистрируйтесь или войдите в существующую учетную запись

2. **Создайте ресурс Speech Services**
   - В поиске Azure найдите "Speech Services"
   - Нажмите "Create" (Создать)
   - Заполните форму:
     - **Subscription**: Выберите вашу подписку
     - **Resource Group**: Создайте новую или выберите существующую
     - **Region**: Выберите регион (рекомендуется West Europe)
     - **Name**: Укажите уникальное имя для ресурса
     - **Pricing Tier**: Выберите "Free F0" для бесплатного уровня

3. **Получите API ключ**
   - После создания ресурса перейдите в него
   - В меню слева выберите "Keys and Endpoint"
   - Скопируйте один из ключей (Key 1 или Key 2)
   - Запомните регион (Region/Location)

### Настройка в приложении

1. **Откройте настройки**
   - В приложении нажмите на иконку настроек
   - Перейдите в раздел "TTS Settings"

2. **Введите данные API**
   - **API Key**: Вставьте скопированный ключ из Azure
   - **Region**: Укажите регион (например, "westeurope")

3. **Настройте параметры**
   - **Primary Provider**: Выберите "Microsoft" для основного провайдера
   - **Enable Fallback**: Включите для резервного использования системного TTS
   - **Rate**: Скорость речи (0.5 - 2.0)
   - **Pitch**: Высота тона (0.5 - 2.0)

4. **Протестируйте настройки**
   - Нажмите кнопку "Test TTS"
   - Вы должны услышать тестовую фразу

## Система Fallback

Если Microsoft TTS недоступен (нет ключа, превышен лимит, проблемы с сетью), система автоматически переключается на встроенный системный TTS браузера.

### Приоритет провайдеров:
1. **Microsoft TTS** (если настроен)
2. **System TTS** (встроенный в браузер)

## Доступные голоса

### Microsoft TTS Голоса:

**Иврит (he-IL):**
- Hila (женский)
- Avri (мужской)

**Русский (ru-RU):**
- Svetlana (женский)
- Dmitry (мужской)

**Английский (en-US):**
- Jenny (женский)
- Guy (мужской)

### System TTS:
Использует голоса, установленные в операционной системе.

## Использование

### В карточках слов:
- Нажмите на иконку динамика рядом с текстом
- Система автоматически определит язык и воспроизведет текст

### В диалогах:
- Используйте кнопки воспроизведения в диалоговых окнах
- Каждая реплика может быть озвучена отдельно

## Устранение неисправностей

### Ошибка "Microsoft TTS provider is not properly configured"
**Причина**: Не указан API ключ или регион
**Решение**: 
- Проверьте настройки TTS
- Убедитесь, что API ключ введен корректно
- Проверьте правильность региона

### Ошибка "Failed to get access token: 401"
**Причина**: Неверный API ключ
**Решение**:
- Проверьте правильность ключа в Azure Portal
- Убедитесь, что ресурс Speech Services активен
- Попробуйте использовать другой ключ (Key 2)

### Ошибка "Failed to get access token: 403"
**Причина**: Превышен лимит или проблемы с биллингом
**Решение**:
- Проверьте использование в Azure Portal
- Убедитесь, что не превышен лимит 500k символов/месяц
- Проверьте статус подписки Azure

### Ошибка "TTS synthesis failed: 404"
**Причина**: Неверный регион или эндпоинт
**Решение**:
- Проверьте правильность региона в настройках
- Убедитесь, что регион соответствует созданному ресурсу в Azure

### Нет звука при воспроизведении
**Причины и решения**:
- Проверьте громкость системы и браузера
- Убедитесь, что в браузере разрешено воспроизведение звука
- Попробуйте отключить блокировщики рекламы
- Проверьте настройки автовоспроизведения в браузере

### Медленная работа TTS
**Причины и решения**:
- Проверьте скорость интернет-соединения
- Попробуйте выбрать ближайший регион Azure
- Включите fallback на системный TTS для быстрого резерва

### Неправильное произношение
**Решения**:
- Попробуйте другой голос для языка
- Используйте настройки Rate и Pitch для корректировки
- Для сложных слов можно использовать системный TTS как альтернативу

## Ограничения

### Microsoft TTS:
- Бесплатный лимит: 500,000 символов/месяц
- Требует интернет-соединение
- Задержка при первом запросе (получение токена)

### System TTS:
- Ограниченный выбор голосов
- Качество зависит от операционной системы
- Может не поддерживать все языки

## Советы по использованию

1. **Экономия лимита**: Используйте Microsoft TTS для важных слов, системный TTS для частого использования
2. **Оффлайн работа**: Включите fallback для работы без интернета
3. **Качество звука**: Microsoft TTS обеспечивает более естественное произношение
4. **Персонализация**: Настройте Rate и Pitch под свои предпочтения

## Поддержка

При возникновении проблем:
1. Проверьте раздел "Устранение неисправностей"
2. Убедитесь, что все настройки введены корректно
3. Попробуйте использовать тестовую функцию в настройках
4. При необходимости переключитесь на системный TTS