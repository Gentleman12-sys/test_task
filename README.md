# Шаблон для выполнения тестового задания

## Описание
Шаблон подготовлен для того, чтобы попробовать сократить трудоемкость выполнения тестового задания.

В шаблоне настоены контейнеры для `postgres` и приложения на `nodejs`.  
Для взаимодействия с БД используется `knex.js`.  
В контейнере `app` используется `build` для приложения на `ts`, но можно использовать и `js`.

Шаблон не является обязательным!\
Можно использовать как есть или изменять на свой вкус.

Все настройки можно найти в файлах:
- compose.yaml
- dockerfile
- package.json
- tsconfig.json
- src/config/env/env.ts
- src/config/knex/knexfile.ts

## Команды:

Быстрый запуск:
```bash
docker compose build --no-cache
docker compose up -d
```

Запуск базы данных:
```bash
docker compose up -d --build postgres
```

Для выполнения миграций и сидов не из контейнера:
```bash
npm run knex:dev migrate latest
```

```bash
npm run knex:dev seed run
```
Также можно использовать и остальные команды (`migrate make <name>`,`migrate up`, `migrate down` и т.д.)

Для запуска приложения в режиме разработки:
```bash
npm run dev
```

Запуск проверки самого приложения:
```bash
docker compose up -d --build app
```

Для финальной проверки рекомендую:
```bash
docker compose down --rmi local --volumes
docker compose up --build
```

Настройки .env:
```bash
PORT=3000
NODE_ENV=production

# === Database (PostgreSQL) ===
DB_HOST=postgres
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=postgres

# === Wildberries API (ОБЯЗАТЕЛЬНО) ===
WB_API_BASE=https://common-api.wildberries.ru/api/v1/tariffs/box
WB_API_KEY=ваш_токен_здесь

# === Google Sheets (ОПЦИОНАЛЬНО) ===
# GOOGLE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"..."}
# GOOGLE_SHEETS_CONFIG=[{"spreadsheetId":"...","sheetName":"stocks_coefs","range":"A1:J1000"}]

# === Scheduler ===
TARIFF_SYNC_CRON=0 * * * *
SHEETS_SYNC_CRON=0 */6 * * *
TIMEZONE=Europe/Moscow
LOG_LEVEL=info
```


Примеры запросов: 
```bash
ВЕЗДЕ localhost:3000
GET /health → {"status":"ok","time":"2026-02-26T..."}
GET /api/tariff/latest → {"date":"2026-02-26","count":82,"data":[{"nmid":0,"warehouse_name":"Коледино","coef":1.95,"amount":89.7,...}]}
GET /api/tariff/2026-02-26 → {"date":"2026-02-26","count":82,"data":[...]}
GET /api/tariff/range?startDate=2026-02-20&endDate=2026-02-26 → {"startDate":"2026-02-20","endDate":"2026-02-26","count":574,"data":[...]}
GET /api/tariff/dates → {"dates":["2026-02-20","2026-02-26"],"count":2}
POST /api/tariff/sync → {"status":"success","message":"Tariff sync started"}
POST /api/sheets/export → {"status":"success","message":"Sheets export started"}
```


PS: С наилучшими пожеланиями!
