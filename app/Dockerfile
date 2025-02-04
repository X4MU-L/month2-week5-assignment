# syntax=docker/dockerfile:1.4

# Base node image for all stages
FROM node:18-alpine AS base
LABEL maintainer="CoreBank Team"

# Install dependencies only when needed
RUN apk add --no-cache \
    tini \
    curl \
    && rm -rf /var/cache/apk/*

# Use tini as entry point
ENTRYPOINT ["/sbin/tini", "--"]

# Create app directory and set permissions
RUN mkdir -p /usr/src/app && \
    chown -R node:node /usr/src/app

WORKDIR /usr/src/app

# Dependencies stage
FROM base AS deps
USER node
COPY --chown=node:node package*.json ./

# Install dependencies with cache mounting
RUN --mount=type=cache,target=/usr/src/app/.npm,uid=1000,gid=1000 \
    npm set cache /usr/src/app/.npm && \
    npm ci

# Development stage
FROM deps AS development
USER node
COPY --chown=node:node . .
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production dependencies
FROM deps AS prod-deps
USER node
RUN --mount=type=cache,target=/usr/src/app/.npm,uid=1000,gid=1000 \
    npm prune --production

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Copy runtime dependencies and source
COPY --chown=node:node --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --chown=node:node . .

USER node
EXPOSE 3000

CMD ["node", "server.js"]

# Nginx base stage
FROM nginx:alpine AS nginx-base
RUN apk add --no-cache openssl
RUN mkdir -p /etc/nginx/ssl

# Development Nginx stage
FROM nginx-base AS nginx-dev
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx-selfsigned.key \
    -out /etc/nginx/ssl/nginx-selfsigned.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=www.corebank.com"

# Production Nginx stage
FROM nginx-base AS nginx-prod
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx-selfsigned.key \
    -out /etc/nginx/ssl/nginx-selfsigned.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=www.corebank.com"