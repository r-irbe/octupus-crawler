# IPF Crawler — Multi-Stage Dockerfile
# Implements: REQ-INFRA-001 (multi-stage, minimal image)
#             REQ-INFRA-002 (non-root user)
# Design: docs/specs/infrastructure/design.md §1

# Stage 1: Build
FROM node:22-slim AS build
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Install dependencies first (layer caching)
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml turbo.json ./
COPY packages/core/package.json packages/core/
COPY packages/config/package.json packages/config/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/observability/package.json packages/observability/
COPY packages/ssrf-guard/package.json packages/ssrf-guard/
COPY packages/testing/package.json packages/testing/
COPY packages/http-fetching/package.json packages/http-fetching/
COPY packages/crawl-pipeline/package.json packages/crawl-pipeline/
COPY packages/url-frontier/package.json packages/url-frontier/
COPY packages/worker-management/package.json packages/worker-management/
COPY packages/application-lifecycle/package.json packages/application-lifecycle/
COPY packages/completion-detection/package.json packages/completion-detection/
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source and build
COPY packages/ packages/
COPY tsconfig.base.json ./
RUN pnpm turbo build

# Stage 2: Production
FROM node:22-slim AS production
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# Copy built artifacts and production dependencies
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/packages/ packages/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# REQ-INFRA-002: Run as non-root user
USER node

EXPOSE 8081 9090

CMD ["node", "packages/application-lifecycle/dist/main.js"]
