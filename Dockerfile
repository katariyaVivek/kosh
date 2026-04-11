FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl \
  && echo "https://dl-cdn.alpinelinux.org/alpine/v3.17/main" >> /etc/apk/repositories \
  && echo "https://dl-cdn.alpinelinux.org/alpine/v3.17/community" >> /etc/apk/repositories \
  && apk add --no-cache openssl1.1-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
RUN npm install -g prisma@5.22.0

# Build the app
FROM base AS builder
# Install OpenSSL 1.1 for Prisma compatibility
RUN apk add --no-cache openssl \
  && echo "https://dl-cdn.alpinelinux.org/alpine/v3.17/main" >> /etc/apk/repositories \
  && echo "https://dl-cdn.alpinelinux.org/alpine/v3.17/community" >> /etc/apk/repositories \
  && apk add --no-cache openssl1.1-compat
# Install Prisma CLI globally to ensure it's in PATH
RUN npm install -g prisma@5.22.0
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client and apply migrations for build-time prerender
ENV DATABASE_URL="file:./data/kosh.db"
ENV PATH="/app/node_modules/.bin:$PATH"
RUN mkdir -p /app/data && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app/data && \
    prisma generate && \
    prisma migrate deploy --schema=./prisma/schema.prisma

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:./data/kosh.db"

### Ensure OpenSSL 1.1 is available for Prisma
RUN apk add --no-cache openssl \
  && echo "https://dl-cdn.alpinelinux.org/alpine/v3.17/main" >> /etc/apk/repositories \
  && echo "https://dl-cdn.alpinelinux.org/alpine/v3.17/community" >> /etc/apk/repositories \
  && apk add --no-cache openssl1.1-compat
# Install Prisma CLI globally so CMD can find it
RUN npm install -g prisma@5.22.0
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/crypto-js ./node_modules/crypto-js

# Create data directory for SQLite
RUN mkdir -p /app/data
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]

# Run as root to ensure volume write access
# (Self-hosted, single-user app; no multi-tenant security concerns)

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
