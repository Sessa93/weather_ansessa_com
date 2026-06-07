FROM node:20-alpine
WORKDIR /app

# tzdata so the TZ env var (e.g. Europe/Rome) resolves for scheduling/logging
RUN apk add --no-cache tzdata

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
