# Решение ошибки "access_denied" - Приложение не прошло проверку Google

## Проблема:
```
Доступ заблокирован: приложение "Words Flashcards" не прошло проверку Google
Ошибка 403: access_denied
```

## ✅ Быстрое решение (рекомендуется):

### Вариант 1: Добавить себя как тестировщика

1. **Откройте Google Cloud Console**: https://console.cloud.google.com/
2. **Перейдите в OAuth consent screen**:
   - Слева в меню: APIs & Services → OAuth consent screen
3. **Найдите секцию "Test users"**
4. **Нажмите "+ ADD USERS"**
5. **Добавьте ваш email**: `ardisukr@gmail.com`
6. **Сохраните**

### Вариант 2: Обойти предупреждение (для разработки)

1. **Когда появится окно с предупреждением**
2. **Нажмите "Advanced" или "Дополнительно"** (внизу слева)
3. **Нажмите "Go to Words Flashcards (unsafe)"** или "Перейти в приложение (небезопасно)"
4. **Разрешите доступ**

## 📝 Пошаговая инструкция для OAuth Consent Screen:

### 1. Откройте Google Cloud Console
- Перейдите: https://console.cloud.google.com/
- Выберите ваш проект

### 2. Настройте OAuth Consent Screen
- Слева: **APIs & Services** → **OAuth consent screen**
- User Type: **External** (уже выбрано)
- Нажмите **EDIT APP**

### 3. Заполните основную информацию:
```
App name: Words Flashcards
User support email: ardisukr@gmail.com
Developer contact email: ardisukr@gmail.com
```

### 4. Добавьте тестировщиков:
- Прокрутите вниз до секции **"Test users"**
- Нажмите **"+ ADD USERS"**
- Введите: `ardisukr@gmail.com`
- Нажмите **"SAVE"**

### 5. Сохраните настройки:
- Нажмите **"SAVE AND CONTINUE"** на каждом шаге
- Дойдите до конца мастера

## 🔄 После настройки:

1. **Очистите кэш браузера** (Ctrl+Shift+Delete)
2. **Перезапустите приложение**
3. **Попробуйте авторизацию снова**

## ⚡ Альтернативное быстрое решение:

Если не хотите настраивать OAuth Consent Screen, можно:

1. **В окне предупреждения нажать "Advanced"**
2. **Затем "Go to Words Flashcards (unsafe)"**
3. **Это безопасно для локальной разработки!**

## 📚 Для production:

Когда будете готовы к публикации:
1. Заполните полную информацию в OAuth Consent Screen
2. Подайте заявку на проверку Google (Verification)
3. Это займет несколько дней/недель

## 🎯 Рекомендация:

**Добавьте себя как тестировщика** - это самый простой и правильный способ для разработки!
