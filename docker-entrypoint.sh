#!/bin/sh
set -e

# Ensure data directory exists and is writable
mkdir -p /app/data
chmod 777 /app/data

cd /app

# Run migrations — if they fail, log the error and exit cleanly
if prisma migrate deploy --schema=./prisma/schema.prisma; then
  echo "Migrations applied successfully."
else
  echo "ERROR: Prisma migration failed. Check logs for details."
  echo "Hint: Run 'docker compose logs kosh' for the full error output."
  echo "If the database schema is already up to date, you may need to"
  echo "manually mark the migration as applied:"
  echo "  docker compose exec kosh npx prisma migrate resolve --applied 20260409000000_key_rotation_reminders"
  exit 1
fi

exec "$@"
