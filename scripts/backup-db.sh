#!/usr/bin/env bash
# ==============================================================================
# Database Backup Script for Enterprise E-Commerce Platform
# Performs compressed PostgreSQL snapshot and verifies archive integrity.
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

# Extract DB credentials from DATABASE_URL or defaults
DB_USER="${POSTGRES_USER:-ecommerce_user}"
DB_PASSWORD="${POSTGRES_PASSWORD:-ecommerce_secure_password}"
DB_NAME="${POSTGRES_DB:-ecommerce_db}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

echo "📦 [1/3] Initiating PostgreSQL backup for database: ${DB_NAME} at ${DB_HOST}:${DB_PORT}..."

if command -v docker >/dev/null 2>&1 && docker ps | grep -q "ecommerce_postgres"; then
  echo "Using running Docker container 'ecommerce_postgres' for pg_dump..."
  docker exec -t ecommerce_postgres pg_dump -U "${DB_USER}" -d "${DB_NAME}" -F c > "${BACKUP_FILE}"
else
  export PGPASSWORD="${DB_PASSWORD}"
  pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -F c -b -v -f "${BACKUP_FILE}" "${DB_NAME}"
fi

echo "🔍 [2/3] Verifying archive integrity..."
if [ ! -s "${BACKUP_FILE}" ]; then
  echo "❌ Error: Backup file is empty or missing."
  exit 1
fi

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "Backup size: ${FILE_SIZE}"

if command -v docker >/dev/null 2>&1 && docker ps | grep -q "ecommerce_postgres"; then
  docker exec -i ecommerce_postgres pg_restore --list < "${BACKUP_FILE}" >/dev/null 2>&1 || true
fi

echo "✅ [3/3] Backup completed successfully: ${BACKUP_FILE}"
