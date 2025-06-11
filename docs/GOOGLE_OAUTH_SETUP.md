# Настройка Google OAuth для локальной разработки

## Проблема
```
idpiframe_initialization_failed: Not a valid origin for the client: http://localhost:5173 has not been registered for client ID
```

## Решение

### 1. Откройте Google Cloud Console
Перейдите по ссылке: https://console.developers.google.com/

### 2. Выберите ваш проект
Убедитесь, что выбран правильный проект в верхней части страницы

### 3. Перейдите к настройкам OAuth
- Слева в меню выберите **"APIs & Services"**
- Нажмите **"Credentials"**

### 4. Найдите ваш OAuth 2.0 Client ID
Найдите клиент с ID: `1003233027814-06bikqev6opp8j82f2hm9rpcknnt3kr7.apps.googleusercontent.com`

### 5. Отредактируйте OAuth client
- Нажмите на иконку редактирования (карандаш) рядом с вашим OAuth client
- В разделе **"Authorized JavaScript origins"** добавьте:
  ```
  http://localhost:5173
  ```
- Также добавьте (для production):
  ```
  https://yourdomain.com
  ```

### 6. Сохраните изменения
Нажмите **"Save"** внизу страницы

### 7. Настройте OAuth Consent Screen (ВАЖНО!)
1. Перейдите в **APIs & Services** → **OAuth consent screen**
2. Нажмите **"EDIT APP"**
3. В секции **"Test users"** нажмите **"+ ADD USERS"**
4. Добавьте ваш email: `ardisukr@gmail.com`
5. Сохраните настройки

### 8. Подождите
Изменения могут занять несколько минут для применения (обычно до 5 минут)

## Дополнительные настройки

### Authorized redirect URIs (если потребуется)
```
http://localhost:5173
http://localhost:5173/
https://yourdomain.com
https://yourdomain.com/
```

### Проверка настроек
После сохранения убедитесь, что в списке "Authorized JavaScript origins" появился:
- ✅ `http://localhost:5173`

## Если проблема остается

1. **Очистите кэш браузера** (Ctrl+Shift+Delete)
2. **Перезапустите dev сервер** (`bun dev`)
3. **Подождите до 5 минут** для применения изменений в Google
4. **Проверьте правильность Client ID** в `.env` файле

## Скриншот того, как должно выглядеть:
```
OAuth 2.0 Client IDs
Name: [Ваше название]
Client ID: 1003233027814-06bikqev6opp8j82f2hm9rpcknnt3kr7.apps.googleusercontent.com

Authorized JavaScript origins:
• http://localhost:5173
• https://yourdomain.com (для production)
```
