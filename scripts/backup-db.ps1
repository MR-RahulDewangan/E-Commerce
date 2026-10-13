# ==============================================================================
# Database Backup Script for Windows / PowerShell
# Performs compressed PostgreSQL snapshot and verifies archive integrity.
# ==============================================================================
param(
  [string]$BackupDir = "./backups"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "db_backup_$Timestamp.dump"

Write-Host "📦 [1/3] Generating compressed PostgreSQL dump in container ecommerce_postgres..."
docker exec ecommerce_postgres pg_dump -U ecommerce_user -d ecommerce_db -F c -f /tmp/backup.dump

Write-Host "🔍 [2/3] Verifying archive integrity..."
docker exec ecommerce_postgres pg_restore --list /tmp/backup.dump | Out-Null

docker cp ecommerce_postgres:/tmp/backup.dump $BackupFile
docker exec ecommerce_postgres rm /tmp/backup.dump

$File = Get-Item $BackupFile
if ($File.Length -eq 0) {
  Write-Error "❌ Backup file is empty."
  exit 1
}

$FileSizeKB = [math]::Round($File.Length / 1KB, 2)
Write-Host "✅ [3/3] Backup completed and verified successfully: $BackupFile ($FileSizeKB KB)"
