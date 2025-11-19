# syntax=docker/dockerfile:1.4
# Optimized multi-stage build for pnpm monorepo following Docker best practices
# Based on: https://docs.docker.com/get-started/workshop/09_image_best/

ARG NODE_VERSION=24.5.0

# -------- Base: Setup pnpm --------
FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# -------- Dependencies (Layer-Cacheable) --------
FROM base AS deps
WORKDIR /app
# Copy dependency files first for optimal layer caching
COPY pnpm-lock.yaml package.json ./
RUN pnpm fetch --prod

# -------- Dev Dependencies --------
FROM deps AS build-deps
RUN pnpm fetch

# -------- Build Stage --------
FROM build-deps AS build
# Copy source code after dependencies are cached
COPY . .
RUN pnpm install --frozen-lockfile --offline --ignore-scripts
# Build all packages (TypeScript project references)
RUN pnpm run build:packages

# -------- Deploy Individual Apps --------
FROM build AS deploy-migrator
RUN pnpm --filter @cronicorn/migrator run build
RUN pnpm deploy --filter=@cronicorn/migrator --prod --legacy /prod/migrator
# Copy migrations folder to deployment directory
RUN cp -r /app/packages/adapter-drizzle/migrations /prod/migrator/node_modules/@cronicorn/adapter-drizzle/

FROM build AS deploy-api
RUN pnpm --filter @cronicorn/api run build
RUN pnpm deploy --filter=@cronicorn/api --prod --legacy /prod/api

FROM build AS deploy-scheduler
RUN pnpm --filter @cronicorn/scheduler-app run build
RUN pnpm deploy --filter=@cronicorn/scheduler-app --prod --legacy /prod/scheduler

FROM build AS deploy-ai-planner
RUN pnpm --filter @cronicorn/ai-planner-app run build
RUN pnpm deploy --filter=@cronicorn/ai-planner-app --prod --legacy /prod/ai-planner

FROM build AS deploy-web
# Pass build-time environment variables for Vite
ARG VITE_SITE_URL
ARG VITE_API_URL
ARG NODE_ENV=production
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_API_URL=$VITE_API_URL
ENV NODE_ENV=$NODE_ENV
# Build API first (web depends on @cronicorn/api/client)
RUN pnpm --filter @cronicorn/api run build
# Now build web (TanStack Start SSR build with Nitro)
RUN pnpm --filter @cronicorn/web run build
RUN pnpm deploy --filter=@cronicorn/web --prod --legacy /prod/web
# Copy Nitro .output directory (contains server and client)
RUN cp -r /app/apps/web/.output /prod/web/

FROM build AS deploy-docs
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
# Build the docs site (this needs access to ../../docs/public)
RUN pnpm --filter @cronicorn/docs run build
# Deploy to isolated directory
RUN pnpm deploy --filter=@cronicorn/docs --prod --legacy /prod/docs
# Copy the pre-built static site (already contains all content)
RUN cp -r /app/apps/docs/build /prod/docs/
RUN cp -r /app/apps/docs/nginx/nginx.conf /prod/docs/

# -------- Runtime Images --------
# Migrator Runtime
FROM node:${NODE_VERSION}-alpine AS migrator
ENV NODE_ENV=production
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
USER node
WORKDIR /app
COPY --from=deploy-migrator --chown=node:node /prod/migrator .
CMD ["node", "dist/index.js"]

# API Runtime
FROM node:${NODE_VERSION}-alpine AS api
ENV NODE_ENV=production
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
USER node
WORKDIR /app
COPY --from=deploy-api --chown=node:node /prod/api .
CMD ["node", "dist/index.js"]

# Scheduler Runtime
FROM node:${NODE_VERSION}-alpine AS scheduler
ENV NODE_ENV=production
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
USER node
WORKDIR /app
COPY --from=deploy-scheduler --chown=node:node /prod/scheduler .
CMD ["node", "dist/index.js"]

# AI Planner Runtime
FROM node:${NODE_VERSION}-alpine AS ai-planner
ENV NODE_ENV=production
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
USER node
WORKDIR /app
COPY --from=deploy-ai-planner --chown=node:node /prod/ai-planner .
CMD ["node", "dist/index.js"]

# Web Runtime (Node.js with TanStack Start SSR + Nitro)
FROM node:${NODE_VERSION}-alpine AS web
ENV NODE_ENV=production
ENV PORT=5173
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
USER node
WORKDIR /app
COPY --from=deploy-web --chown=node:node /prod/web .
EXPOSE 5173
CMD ["node", ".output/server/index.mjs"]

# Docs Runtime (nginx)
FROM nginx:alpine AS docs
COPY --from=deploy-docs /prod/docs/build /usr/share/nginx/html
# Copy custom nginx configuration
COPY --from=deploy-docs /prod/docs/nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80