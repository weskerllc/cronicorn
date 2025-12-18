#!/bin/bash
# Stop admin monitoring

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Stopping Metabase..."
docker compose -f docker-compose.admin.yml down

echo "✓ Metabase stopped"
