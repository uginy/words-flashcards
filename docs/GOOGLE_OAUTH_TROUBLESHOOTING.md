# Решение проблемы Google OAuth

## Статус: Реализована новая версия с Google Identity Services

Создана улучшенная версия GoogleDriveServiceV2 с поддержкой современного Google Identity Services API.

## Что было сделано:

1. ✅ **Добавлен Google Identity Services script** в index.html
2. ✅ **Создан GoogleDriveServiceV2** с новым API
3. ✅ **Обновлен useGoogleDrive хук** для работы с новой версией
4. ✅ **Улучшена обработка токенов** (localStorage для сохранения сессии)
5. ✅ **Добавлены подробные инструкции** в docs/GOOGLE_OAUTH_SETUP.md

## Возможные причины ошибки:

### 1. Authorized JavaScript origins не настроены
В Google Cloud Console добавьте:
- `http://localhost:5173`
- `http://localhost:5173/` (с слешем)

### 2. Кэш браузера
- Ctrl+Shift+Delete (очистить кэш)
- Или режим инкогнито

### 3. Задержка применения настроек Google
- Подождите 5-10 минут после настройки origins

### 4. Проверьте Client ID
Убедитесь что в .env файле правильный CLIENT_ID:
```
VITE_GOOGLE_CLIENT_ID=1003233027814-06bikqev6opp8j82f2hm9rpcknnt3kr7.apps.googleusercontent.com
```

## Инструкция по настройке в Google Console:

1. Откройте: https://console.developers.google.com/
2. Выберите проект с ID: `1003233027814-06bikqev6opp8j82f2hm9rpcknnt3kr7`
3. APIs & Services > Credentials
4. Найдите OAuth 2.0 Client ID
5. Нажмите редактировать (карандаш)
6. В "Authorized JavaScript origins" добавьте:
   - `http://localhost:5173`
7. Сохраните
8. Подождите 5-10 минут

## Тестирование новой версии:

1. Очистите кэш браузера
2. Перезапустите dev сервер: `bun dev`
3. Откройте настройки > Данные
4. Нажмите "Авторизоваться в Google Drive"

## Если проблема остается:

1. Убедитесь что используется localhost:5173 (не 127.0.0.1)
2. Попробуйте другой браузер
3. Проверьте что включен Google Drive API в проекте
4. Убедитесь что проект активен (не заблокирован)

## Fallback вариант:

Если OAuth не работает, можно временно использовать экспорт/импорт файлов для синхронизации данных между устройствами.
