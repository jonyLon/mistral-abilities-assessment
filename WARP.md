# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

# 🧠 Інноваційна методологія оцінки здібностей людини

Система оцінки здібностей через інтерактивну діяльність та AI-аналіз поведінки. Замість традиційних тестів-опитувань, користувач проходить 10-хвилинний інтерактивний досвід з AI-інтерпретацією результатів.

## 🏗️ Архітектура системи

```
📁 metodology/
├── 📂 backend/          # Python FastAPI + AI аналіз (Mistral Nemo/LLaMA)
│   ├── app.py          # Головний API сервер з WebSocket підтримкою  
│   ├── mistral_analyzer.py   # AI аналізатор через Ollama
│   ├── behavioral_processor.py  # Аналіз поведінкових патернів
│   └── requirements.txt # Залежності Python
├── 📂 frontend/         # Vanilla JS інтерактивна гра
│   ├── index.html      # Головна HTML сторінка з етапами тесту
│   ├── game-logic.js   # Основний оркестратор (модульна архітектура)
│   ├── core-game-management.js  # Управління станом гри
│   ├── event-tracking.js        # Відстеження поведінки користувача
│   ├── mode-selection-ai.js     # AI режим та генерація питань
│   ├── game-stages.js          # Реалізація окремих етапів
│   ├── results-analysis.js     # Обробка та відображення результатів
│   └── utilities-config.js     # Спільні утиліти та конфігурація
└── 📄 README.md        # Основна документація українською
```

### Компоненти системи:

1. **Frontend (Vanilla JS)**: Інтерактивна гра з 10 етапів оцінки різних здібностей
2. **Backend (FastAPI)**: RESTful API + WebSocket для реального часу
3. **AI Layer (Mistral Nemo)**: Локальний AI аналіз через Ollama для приватності
4. **Behavioral Analytics**: Аналіз патернів взаємодії (швидкість реакції, послідовність рішень)

### Потік даних:
```
Користувач → Інтерактивна гра → Event Tracking → FastAPI → AI Аналіз → Профіль здібностей
```

## 🚀 Команди розробки

### Backend (Python FastAPI)
```bash
# Перехід до backend директорії
cd backend

# Створення віртуального середовища (Windows)
python -m venv venv
venv\Scripts\activate

# Встановлення залежностей
pip install -r requirements.txt

# Запуск development сервера (з автоперезавантаженням)
python app.py
# АБО
uvicorn app:app --host 127.0.0.1 --port 8000 --reload

# Тестування API
python test_app.py

# Тестування української підтримки AI
python test_ukrainian.py
```

### Frontend (Vanilla JS)
```bash
# Перехід до frontend директорії  
cd frontend

# Запуск локального сервера (Python)
python -m http.server 3000

# АБО через Node.js (якщо встановлено)
npx serve -p 3000

# Відкрити в браузері
start http://localhost:3000
```

### AI Integration (Ollama + Mistral Nemo)
```bash
# Встановлення Ollama (якщо не встановлено)
# Завантажити з https://ollama.ai

# Завантаження та запуск Mistral Nemo моделі
ollama pull mistral-nemo:latest

# Перевірка статусу моделі
ollama list

# Запуск Ollama сервісу (зазвичай автоматично)
ollama serve
```

## 🤖 AI Integration Specifics

### Используемые модели:
- **Mistral Nemo** (основна): Локальна модель через Ollama для аналізу відповідей
- **LLaMA 3:8b-instruct** (резервна): Альтернативна модель

### Можливості AI системи:
1. **Генерація питань**: Динамічне створення питань на основі контексту користувача
2. **Аналіз відповідей**: Оцінка здібностей через текстові відповіді та поведінкові дані
3. **Українська мова**: Повна підтримка української мови в промптах та відповідях
4. **Локальність**: Всі дані обробляються локально для приватності

### Конфігурація моделі:
```python
# В mistral_analyzer.py
OLLAMA_URL = "http://localhost:11434"
MODEL_NAME = "mistral-nemo:latest"
TEMPERATURE = 0.7  # Баланс між креативністю та послідовністю
```

## 🧪 Тестування

### Автоматичні тести:
```bash
# Backend тести
cd backend
python test_app.py          # Базове API тестування
python test_ukrainian.py    # Тестування української мови в AI

# Перевірка behavioral_processor
python behavioral_processor.py

# Перевірка mistral_analyzer
python mistral_analyzer.py
```

### Мануальне тестування:
1. **Запустити backend**: `python app.py`
2. **Запустити frontend**: Відкрити `index.html` в браузері  
3. **Перевірити консоль**: Дивитись логи в Developer Tools
4. **Пройти тест**: Протестувати всі 10 етапів
5. **Перевірити результати**: AI аналіз має працювати

### Чеклист для мануального тестування:
- [ ] Вибір режиму (стандартний/AI) працює
- [ ] Всі 10 етапів ініціалізуються коректно  
- [ ] Event tracking записує дані
- [ ] Backend отримує дані через WebSocket/REST
- [ ] AI аналіз повертає валідні результати
- [ ] Результати відображаються з українським текстом

## 💻 Вимоги до розробників

### Правила іменування:
- **Використовуйте зрозумілі назви** ("для слабого програміста")
- **JavaScript**: camelCase для функцій, UPPER_CASE для констант
- **Python**: snake_case для всього
- **Файли**: kebab-case для frontend, snake_case для backend

### Workflow:
1. **Завжди питайте**, якщо щось незрозуміло
2. **Не робіть commit** без підтвердження користувача
3. **Пояснюйте кожну нову бібліотеку** її структуру та призначення
4. **Не встановлюйте непотрібні залежності**

### Структура коду:
- **Frontend модульність**: Код розділено на 7 модулів за функціональністю
- **Backend separation**: Аналіз поведінки окремо від AI аналізу  
- **Extensive logging**: Використовуйте console.log() для debugging
- **Error handling**: Завжди мають бути fallback механізми

## 🔧 Типові завдання розробки

### Додавання нового етапу тесту:
1. Додати опис етапу в `utilities-config.js` → `STAGE_DEFINITIONS`
2. Створити handler в `game-stages.js` → новий клас `[Name]StageHandler`
3. Додати HTML структуру в `index.html` → новий `<div class="game-stage">`
4. Зареєструвати етап в `GameStageRouter.initializeStage()`

### Модифікація AI аналізу:
1. **Промпти**: Редагувати в `mistral_analyzer.py` → `_build_analysis_prompt()`
2. **Обробка**: Змінити логіку в `behavioral_processor.py` 
3. **Fallback**: Оновити `_generate_fallback_analysis()` для offline режиму

### Додавання нової мови:
1. Створити переклади в `utilities-config.js` → додати `TRANSLATIONS`
2. Модифікувати AI промпти в `mistral_analyzer.py`
3. Тестувати через `test_ukrainian.py` аналог

## 🚨 Важливі обмеження

### Performance:
- **Event tracking throttling**: Mouse events обмежено до 50ms інтервалів
- **AI timeout**: Mistral запити мають 120s timeout
- **Fallback mechanisms**: Локальний аналіз якщо AI недоступний

### Privacy:
- **Локальний AI**: Всі дані залишаються на локальній машині
- **Ollama**: Модель працює локально, не надсилає дані в інтернет
- **Session storage**: Дані видаляються після завершення сесії

### Browser support:
- **ES6 modules**: Потрібен сучасний браузер з підтримкою modules
- **WebSocket**: Для real-time event tracking
- **Fetch API**: Для HTTP запитів до backend

## 🎯 Часті помилки та вирішення

### "Module not found" errors:
- Переконайтеся що сервер підтримує ES6 modules
- Перевірте правильність шляхів в import statements

### AI не відповідає:
- Перевірити чи запущено Ollama: `ollama serve`
- Перевірити чи завантажена модель: `ollama list`
- Дивіться логи в `mistral_analyzer.py`

### Event tracking не працює:
- Відкрийте DevTools → Console
- Перевірте чи ініціалізовано `BehaviorTracker`
- Перевірте Network tab для WebSocket з'єднань

### Етапи не переключаються:
- Дивіться консоль на помилки модулів
- Перевірте `GameState.currentStage` в debugger
- Перевірте чи всі DOM елементи присутні

---

**Створено для WARP.dev для ефективної роботи з інноваційною системою оцінки здібностей.**