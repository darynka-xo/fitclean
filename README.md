# FitClean

Система управления прачечной для фитнес-клубов с интеграцией умных шкафчиков и WhatsApp уведомлениями.

## Содержание

- [Архитектура](#архитектура)
- [Технологии](#технологии)
- [Установка](#установка)
- [Конфигурация](#конфигурация)
- [API документация](#api-документация)
- [Структура проекта](#структура-проекта)
- [Развертывание](#развертывание)

## Архитектура

Система состоит из следующих компонентов:

| Компонент | Описание |
|-----------|----------|
| Backend API | FastAPI сервер, обрабатывающий бизнес-логику |
| Frontend | Next.js веб-приложение для администрирования |
| База данных | Supabase (PostgreSQL) |
| Хранилище файлов | Supabase Storage |
| Уведомления | UltraMsg WhatsApp API |

## Технологии

### Backend
- Python 3.11+
- FastAPI
- SQLAlchemy
- Pydantic
- Uvicorn

### Frontend
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Supabase Client

### Инфраструктура
- Nginx (reverse proxy)
- Systemd (управление процессами)
- Supabase (BaaS)

## Установка

### Требования

- Python 3.11+
- Node.js 20+
- Nginx
- Доступ к Supabase проекту

### Backend

```bash
cd api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
npm run build
```

## Конфигурация

### Backend (api/.env)

```env
DATABASE_URL=postgresql://user:password@host:port/database
SECRET_KEY=your-secret-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ULTRAMSG_INSTANCE_ID=instance-id
ULTRAMSG_TOKEN=your-token
```

### Frontend (frontend/.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=/api/v1
```

## API документация

После запуска сервера документация доступна по адресам:

| Формат | URL |
|--------|-----|
| Swagger UI | http://server/docs |
| ReDoc | http://server/redoc |
| OpenAPI JSON | http://server/openapi.json |

### Основные эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/v1/health | Проверка состояния сервера |
| GET | /api/v1/clubs | Список клубов |
| GET | /api/v1/orders | Список заказов |
| POST | /api/v1/orders | Создание заказа |
| GET | /api/v1/users | Список пользователей |
| POST | /api/v1/users | Создание пользователя |
| GET | /api/v1/photos/order/{id} | Фото заказа |
| POST | /api/v1/whatsapp/send | Отправка WhatsApp сообщения |

## Структура проекта

```
fitclean/
├── api/                          # Backend
│   ├── app/
│   │   ├── core/                 # Конфигурация, безопасность
│   │   ├── models/               # SQLAlchemy модели
│   │   ├── routes/               # API эндпоинты
│   │   ├── schemas/              # Pydantic схемы
│   │   ├── services/             # Бизнес-логика
│   │   └── main.py               # Точка входа
│   ├── requirements.txt
│   └── .env
│
├── frontend/                     # Frontend
│   ├── src/
│   │   ├── app/                  # Next.js страницы
│   │   │   ├── admin/            # Админ панель
│   │   │   ├── board/            # Доска заказов
│   │   │   ├── courier/          # Интерфейс курьера
│   │   │   ├── laundry/          # Интерфейс прачечной
│   │   │   └── login/            # Авторизация
│   │   ├── components/           # React компоненты
│   │   ├── utils/                # Утилиты
│   │   └── types/                # TypeScript типы
│   ├── package.json
│   └── .env.local
│
└── tablet/                       # Планшетное приложение (отдельный проект)
```

## Развертывание

### Systemd сервисы

Backend:
```ini
# /etc/systemd/system/fitclean-backend.service
[Unit]
Description=FitClean Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/api
Environment="PATH=/path/to/api/venv/bin"
ExecStart=/path/to/api/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Frontend:
```ini
# /etc/systemd/system/fitclean-frontend.service
[Unit]
Description=FitClean Frontend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/frontend
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
    }

    location /redoc {
        proxy_pass http://127.0.0.1:8000/redoc;
    }

    location /openapi.json {
        proxy_pass http://127.0.0.1:8000/openapi.json;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Команды управления

```bash
# Запуск сервисов
systemctl start fitclean-backend fitclean-frontend nginx

# Остановка сервисов
systemctl stop fitclean-backend fitclean-frontend

# Перезапуск
systemctl restart fitclean-backend fitclean-frontend

# Просмотр логов
journalctl -u fitclean-backend -f
journalctl -u fitclean-frontend -f
```

## Лицензия

Проприетарное программное обеспечение. Все права защищены.
