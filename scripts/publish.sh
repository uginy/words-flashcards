#!/bin/sh
# Этот скрипт увеличивает указанный тип версии (patch, minor, major),
# создает коммит, тег, отправляет изменения в удаленный репозиторий и деплоит на Vercel.

# Выход немедленно, если команда завершается с ненулевым статусом.
set -e

# По умолчанию 'patch', если аргумент не передан
VERSION_TYPE=${1:-patch} # $1 - первый аргумент командной строки

if [ "$VERSION_TYPE" != "patch" ] && [ "$VERSION_TYPE" != "minor" ] && [ "$VERSION_TYPE" != "major" ]; then
  echo "Ошибка: Неверный тип версии '$VERSION_TYPE'. Используйте 'patch', 'minor' или 'major'."
  exit 1
fi

echo "Публикация с инкрементом версии: $VERSION_TYPE"

# Основная команда
# npm version $VERSION_TYPE -m "version: %s"
npm version $VERSION_TYPE -m "version: %s" && git push && git push --tags && vercel deploy --prod

echo "Скрипт публикации ($VERSION_TYPE) успешно выполнен!"