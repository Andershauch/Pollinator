# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json .npmrc ./
# NPM_TOKEN is supplied as a BuildKit secret. It exists only while npm fetches
# the two private GitHub Packages and is never copied into a layer or image.
RUN --mount=type=secret,id=npm_token \
  NPM_TOKEN="$(cat /run/secrets/npm_token)" npm ci

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . ./

# The build does not connect to the database, but the Neon client requires a
# syntactically valid value while Next builds the route modules.
ARG DATABASE_URL=postgresql://user:pass@example.com/db
ENV DATABASE_URL=$DATABASE_URL
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
