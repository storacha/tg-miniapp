# storoku:ignore
# syntax=docker.io/docker/dockerfile:1

FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
RUN apk add --update --no-cache python3 build-base gcc && ln -sf /usr/bin/python3 /usr/bin/python
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* pnpm-workspace.yaml* ./
COPY app/package.json ./app/package.json
COPY app/vendor/telegram/package.json ./app/vendor/telegram/package.json
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/app/node_modules ./app/node_modules
COPY --from=deps /app/app/vendor/telegram/node_modules ./app/vendor/telegram/node_modules

COPY . .
COPY ./deploy/.env.production.local ./app/.env.production.local

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1


RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run -r build; \
  else echo "Lockfile not found." && exit 1; \
  fi  


RUN \
  npx @vercel/ncc build ./app/scripts/migrate.mjs -o ./app/build/scripts/migrate

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/app/public ./app/public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nodejs:nodejs /app/app/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/app/.next/static ./app/.next/static
COPY --from=builder --chown=nodejs:nodejs /app/app/build/scripts/migrate ./app/scripts/migrate

USER nodejs


EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["node", "app/server.js"]
