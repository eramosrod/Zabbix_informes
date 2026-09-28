FROM node:18-alpine
RUN apk add --no-cache tzdata
ENV TZ=Europe/Madrid
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "app/index.js"]
