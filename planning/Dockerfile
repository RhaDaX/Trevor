# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
ENV TZ=UTC

# Dépendances complètes pour le build
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Build Adonis + Vite
FROM deps AS build
COPY . .
# Sans NODE_ENV=production, Vite embarque la version de développement de React
RUN NODE_ENV=production node ace build

# Image finale : dépendances de production uniquement
FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/build/package.json /app/build/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/build ./
RUN mkdir -p storage/attachments && chown -R node:node storage
USER node
EXPOSE 3333
CMD ["sh", "-c", "node ace migration:run --force && node bin/server.js"]
