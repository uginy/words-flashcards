# Исправление ошибки 403 Forbidden в Google Drive

## Описание проблемы

Ошибка `403 Forbidden` при PATCH запросе к Google Drive API указывает на проблемы с правами доступа или истёкший токен авторизации.

## Проведенные исправления

### 1. Добавлена проверка времени жизни токена

Токен Google OAuth имеет ограниченное время жизни (обычно 1 час). Добавлена проверка:

```typescript
private isTokenExpired(): boolean {
  const timestamp = localStorage.getItem('google_token_timestamp');
  if (!timestamp) return true;
  
  const tokenAge = Date.now() - Number.parseInt(timestamp, 10);
  const oneHour = 60 * 60 * 1000;
  return tokenAge > oneHour;
}
```

### 2. Автоматическое обновление токена

Добавлен метод для автоматического обновления токена перед запросами:

```typescript
private async ensureValidToken(): Promise<void> {
  if (!this.isAuthorized || this.isTokenExpired()) {
    const success = await this.authorize();
    if (!success) {
      throw new Error('Не удалось обновить токен доступа');
    }
  }
}
```

### 3. Retry логика для запросов

В метод `uploadFile` добавлена логика повторных попыток при ошибках 401/403:

```typescript
const maxRetries = 2;
let retryCount = 0;

while (retryCount <= maxRetries) {
  try {
    // Делаем запрос
    const request = window.gapi.client.request({...});
    await request;
    return; // Success
  } catch (error: unknown) {
    const errorObj = error as { status?: number; message?: string };
    
    // Если 401 или 403, пробуем обновить токен
    if ((errorObj.status === 401 || errorObj.status === 403) && retryCount < maxRetries) {
      try {
        await this.ensureValidToken();
        retryCount++;
        continue;
      } catch (refreshError) {
        throw new Error(`Ошибка обновления токена: ${refreshError}`);
      }
    }
    
    // Для других ошибок или если попытки исчерпаны
    throw new Error(`Ошибка загрузки файла ${fileName}: ${errorObj.message || 'Неизвестная ошибка'}`);
  }
}
```

### 4. Улучшенная обработка ошибок в UI

Добавлены более информативные сообщения об ошибках:

- Ошибки токена: "Попробуйте выйти и заново авторизоваться в Google Drive"
- Превышение лимитов: "Превышен лимит запросов. Попробуйте позже"
- Сетевые ошибки: "Проверьте подключение к интернету"

### 5. Правильная установка заголовков

В запросах к Google Drive API теперь явно устанавливается заголовок Authorization:

```typescript
headers: {
  'Content-Type': `multipart/related; boundary="${boundary}"`,
  Authorization: `Bearer ${this.accessToken}`
}
```

## Рекомендации по использованию

1. **При первой ошибке 403**: Попробуйте повторить операцию - токен должен обновиться автоматически
2. **При повторных ошибках**: Выйдите из аккаунта Google Drive и авторизуйтесь заново
3. **При частых ошибках**: Проверьте настройки OAuth в Google Cloud Console

## Проверка исправления

Исправление можно проверить:

1. Дождитесь истечения токена (1 час после авторизации)
2. Попробуйте загрузить данные в облако
3. Система должна автоматически обновить токен и повторить запрос

## Альтернативные решения

Если проблема сохраняется:

1. Проверьте права доступа к Google Drive API в проекте Google Cloud
2. Убедитесь, что scope включает `https://www.googleapis.com/auth/drive.file`
3. Проверьте квоты API в Google Cloud Console
4. Очистите localStorage и повторно авторизуйтесь
