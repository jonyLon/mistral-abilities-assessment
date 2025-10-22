FROM nginx:alpine

# Копіювати статичні файли
COPY index.html /usr/share/nginx/html/
COPY game.js /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY questions.json /usr/share/nginx/html/

# Відкрити порт
EXPOSE 80

# Nginx запуститься автоматично
