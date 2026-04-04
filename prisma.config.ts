/**
 * Prisma configuration for v7+ migrations and client.
 * Database connection is provided via DATABASE_URL env var.
 */
const prismaConfig = {
  adapter: process.env.DATABASE_URL ?? "file:./prisma/kosh.db",
}

export default prismaConfig
