FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG VITE_API_BASE_URL=/api
ARG VITE_APP_TIMEZONE=Asia/Makassar
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_TIMEZONE=$VITE_APP_TIMEZONE

RUN npm run build

FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q --spider -T 5 http://127.0.0.1/ || exit 1

EXPOSE 80
