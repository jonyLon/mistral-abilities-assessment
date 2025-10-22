FROM python:3.11-slim

WORKDIR /app

# Копіювати requirements та встановити залежності
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копіювати код додатку
COPY . .

# Відкрити порт
EXPOSE 8000

# Запустити сервер
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
