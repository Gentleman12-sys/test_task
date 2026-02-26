#!/bin/sh
set -e

echo "Запуск миграций"

# CD в директорию с knexfile, чтобы относительные пути работали
cd /app/dist/config/knex
npx knex migrate:latest --knexfile knexfile.js

echo "🚀 Starting application..."
# Вернуться в /app для запуска приложения
cd /app
exec "$@"