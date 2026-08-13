FROM node:22-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node src/ ./src/
COPY --chown=node:node guides/ ./guides/
COPY --from=frontend-build --chown=node:node /frontend/dist ./public

USER node
EXPOSE 10300

CMD ["node", "src/server.js"]
