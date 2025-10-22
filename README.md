# 🧠 Інноваційна методологія оцінки здібностей

> Спрощена система оцінки здібностей через AI-аналіз від Mistral Nemo

[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/Python-3.11-green)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-teal)](https://fastapi.tiangolo.com/)
[![Mistral](https://img.shields.io/badge/AI-Mistral_Nemo-purple)](https://mistral.ai/)

---

## 🎯 Що це?

Система оцінки 5 категорій здібностей:
- 📊 **Аналітичні** - логіка, системне мислення  
- 🎨 **Творчі** - креативність, інноваційність
- 👥 **Соціальні** - емпатія, комунікація
- 🔧 **Технічні** - практичність, реалізація
- 🔬 **Дослідницькі** - експерименти, відкриття

**10 питань → AI аналіз → Детальний профіль здібностей**

---

## ⚡ Швидкий старт

### 1. Встановіть Docker Desktop
- Завантажте: https://www.docker.com/products/docker-desktop/
- Запустіть Docker Desktop

### 2. Клонуйте репозиторій
```bash
git clone <repo-url>
cd metodology
```

### 3. Запустіть одною командою
```bash
docker-compose up --build
```

⏱️ **Перший запуск**: ~10-20 хвилин (завантаження Mistral Nemo 7.1 GB)  
⏱️ **Наступні запуски**: ~30 секунд

### 4. Відкрийте браузер
```
Frontend: http://localhost:3000
Backend:  http://localhost:8000
API Docs: http://localhost:8000/docs
```

---

## 🏗️ Архітектура

```
┌──────────────┐      POST /analyze       ┌──────────────┐
│   Frontend   │ ────────────────────────> │   Backend    │
│ Vanilla JS   │                           │   FastAPI    │
│ :3000        │ <──────────────────────── │   :8000      │
└──────────────┘      JSON response        └───────┬──────┘
                                                   │
                                                   │ Analyze
                                                   ▼
                                            ┌──────────────┐
                                            │   Mistral    │
                                            │     Nemo     │
                                            │   :11434     │
                                            └──────────────┘
```

### Спрощений потік:
1. Користувач проходить 10 етапів
2. Frontend збирає відповіді
3. POST запит на `/analyze` з усіма відповідями
4. Backend передає Mistral Nemo
5. AI аналізує та повертає результати
6. Frontend візуалізує профіль здібностей

---

## 📁 Структура проекту

```
metodology/
├── backend/
│   ├── app.py                  # FastAPI (2 endpoints)
│   ├── mistral_analyzer.py     # Mistral Nemo інтеграція
│   ├── requirements.txt        # Python залежності
│   └── Dockerfile
│
├── frontend/
│   ├── index.html             # Головна сторінка
│   ├── game.js                # Вся логіка (один файл)
│   ├── styles.css             # Стилі
│   ├── questions.json         # 10 статичних питань
│   └── Dockerfile
│
├── docker-compose.yml         # Оркестрація сервісів
└── README.md                  # Ця документація
```

---

## 🛠️ Технології

| Компонент | Технологія |
|-----------|------------|
| Frontend | Vanilla JS, HTML5, CSS3 |
| Backend | Python 3.11, FastAPI, Uvicorn |
| AI | Mistral Nemo через Ollama |
| Container | Docker, Docker Compose |
| Server | Nginx (frontend) |

---

## 📡 API Endpoints

### `GET /health`
Перевірка статусу системи
```json
{
  "api": "running",
  "mistral": "ready",
  "timestamp": "2025-10-22T16:34:45"
}
```

### `POST /analyze`
Аналіз відповідей користувача
```json
{
  "responses": {
    "stage1": {"choice": 0, "category": "analytical", "weight": 0.9},
    ...
  }
}
```

**Відповідь:**
```json
{
  "ability_scores": {
    "analytical": 75.5,
    "creative": 68.3,
    "social": 45.2,
    "technical": 82.0,
    "research": 71.4
  },
  "confidence": 0.85,
  "insights": ["...", "..."]
}
```

---

## 🐛 Troubleshooting

### Mistral недоступний?
```bash
# Завантажити модель
docker exec -it metodology-ollama ollama pull mistral-nemo

# Перезапустити backend
docker restart metodology-backend

# Перевірити health
curl http://localhost:8000/health
```

### Контейнери не запускаються?
```bash
docker-compose down
docker-compose up --build
```

### Перевірити логи:
```bash
docker logs metodology-backend
docker logs metodology-frontend
docker logs metodology-ollama
```

---

## 📚 Детальна документація

Створено детальну документацію у файлі README з усіма деталями:
- Повний опис архітектури
- Детальна API документація
- Опис роботи кожного компонента
- Повний troubleshooting guide
- Інструкції з кастомізації

---

## ✨ Особливості

- ✅ **Спрощена архітектура** - мінімум коду, максимум функціональності
- ✅ **Локальна приватність** - всі дані на вашій машині
- ✅ **Без складностей** - один файл JS, статичні питання
- ✅ **AI аналіз** - справжній Mistral Nemo, не шаблони
- ✅ **Українська мова** - повна підтримка
- ✅ **Docker** - запуск однією командою
- ✅ **Адаптивний дизайн** - працює на всіх пристроях

---

## 🚀 Команди Docker

```bash
# Запустити все
docker-compose up

# Запустити в фоні
docker-compose up -d

# Перебудувати і запустити
docker-compose up --build

# Зупинити все
docker-compose down

# Зупинити і видалити volumes
docker-compose down -v

# Переглянути логи
docker-compose logs -f
```

---

## 📝 Changelog

### v2.0.0 (2025-10-22) - Спрощена версія
- ✅ Видалено LLaMA analyzer
- ✅ Видалено AI режим генерації питань
- ✅ Видалено behavioral tracking
- ✅ Видалено WebSocket
- ✅ Спрощено до 2 endpoints
- ✅ Один JS файл замість модулів
- ✅ Статичні питання в JSON
- ✅ Docker контейнеризація
- ✅ Mistral Nemo як єдина AI модель

---

## 📄 Ліцензія

Цей проект створений для освітніх цілей.

---

## 🤝 Contributing

Проект готовий до використання та тестування.

---

**Створено з ❤️ та AI для інноваційної оцінки здібностей**
