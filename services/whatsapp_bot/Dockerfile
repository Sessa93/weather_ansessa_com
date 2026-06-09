FROM node:20-bookworm
WORKDIR /app

# Install Playwright system dependencies (Chromium)
RUN npx playwright install --with-deps chromium

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

# Persistent volume for browser auth session
RUN mkdir -p /data/auth
VOLUME /data/auth

ENV PORT=8085
ENV AUTH_DIR=/data/auth
ENV HEADLESS=true

EXPOSE 8085

CMD ["npm", "start"]
