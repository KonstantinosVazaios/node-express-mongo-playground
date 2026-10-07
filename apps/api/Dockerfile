# syntax=docker/dockerfile:1

# Build context is the REPO ROOT (see docker-compose.yml), because npm
# workspaces share one package-lock.json at the root.
#
# Stages:  deps -> build -> prod-deps -> runtime   (+ dev, for hot reload)
# Only the final stage ends up in the production image; the compiler, dev
# dependencies and source files stay behind in the earlier stages.

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app

# --- deps: every dependency (incl. dev) needed to compile -------------------
FROM base AS deps
# Copy ONLY the manifests first. Docker caches this layer, so `npm ci` reruns
# only when dependencies change, not on every source edit.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --workspace @hr/api --include-workspace-root

# --- dev: used by docker-compose.override.yml (source is bind-mounted) ------
FROM deps AS dev
ENV NODE_ENV=development
WORKDIR /app/apps/api
CMD ["npx", "tsx", "watch", "src/server.ts"]

# --- build: TypeScript -> JavaScript ------------------------------------------
FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/api apps/api
RUN npm run build --workspace @hr/api

# --- prod-deps: production dependencies only ----------------------------------
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --workspace @hr/api --omit=dev && mkdir -p apps/api/node_modules

# --- runtime: the image that actually ships ------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/apps/api/dist ./apps/api/dist
WORKDIR /app/apps/api

# Don't run as root: if the app is compromised, the attacker is the
# unprivileged "node" user (built into the official image), not root.
USER node
EXPOSE 3000

# Run node directly, NOT `npm start`. npm doesn't forward SIGTERM to its
# child process, so the graceful shutdown in server.ts would never run and
# Docker would SIGKILL us after the timeout.
CMD ["node", "dist/server.js"]
