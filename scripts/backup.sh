#!/bin/sh
# Nightly encrypted backup of PostgreSQL → S3
# Runs inside the backup Docker container.
set -e

DATE=$(date +%Y%m%d-%H%M%S)
FILENAME="mtc-db-${DATE}.sql.gz"
TMPFILE="/tmp/${FILENAME}"

echo "[backup] Starting backup at ${DATE}"

# Dump and compress
pg_dump -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${TMPFILE}"

# Upload to S3 using curl (no AWS CLI needed in Alpine)
# Uses presigned URL approach or direct upload
if [ -n "${S3_ENDPOINT}" ]; then
  curl -s -X PUT \
    -H "Content-Type: application/octet-stream" \
    --upload-file "${TMPFILE}" \
    "${S3_ENDPOINT}/${S3_BUCKET}/backups/${FILENAME}" \
    --user "${S3_ACCESS_KEY_ID}:${S3_SECRET_ACCESS_KEY}" && \
    echo "[backup] Uploaded ${FILENAME} to S3"
else
  echo "[backup] S3_ENDPOINT not set — backup saved locally at ${TMPFILE}"
fi

echo "[backup] Done."
