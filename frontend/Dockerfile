# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json* ./
RUN npm ci

# Vite inlines env vars at build time, so the API URL must be present now.
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# ---- Serve stage ----
FROM nginx:alpine AS serve

# SPA-aware nginx config (fallback to index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
