FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl \
  && echo "https://dl-cdn.alpinelinux.org/alpine/v3.17/main" >> /etc/apk/repositories \
  && echo "https://dl-cdn.alpinelinux.org/alpine/v3.17/community" >> /etc/apk/repositories \
  && apk add --no-cache openssl1.1-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build the app
FROM base AS builder
# Install OpenSSL 1.1 for Prisma compatibility
RUN apk add --no-cache openssl \
  && echo "https://dl-cdn.alpinelinux.org/alpine/v3.17/main" >> /etc/apk/repositories \
  && echo "https://dl-cdn.alpinelinux.org/alpine/v3.17/community" >> /etc/apk/repositories \
  && apk add --no-cache openssl1.1-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client and apply migrations for build-time prerender
ENV DATABASE_URL="file:./prisma/kosh.db"
RUN npx prisma@5.22.0 generate && \
    npx prisma@5.22.0 migrate deploy --schema=./prisma/schema.prisma

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

### Ensure OpenSSL 1.1 is available for Prisma
RUN apk add --no-cache openssl \
  && echo "https://dl-cdn.alpinelinux.org/alpine/v3.17/main" >> /etc/apk/repositories \
  && echo "https://dl-cdn.alpinelinux.org/alpine/v3.17/community" >> /etc/apk/repositories \
  && apk add --no-cache openssl1.1-compat
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

# Create data directory for SQLite
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node server.js"]
