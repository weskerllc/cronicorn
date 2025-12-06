#!/bin/bash
# Start admin monitoring with Metabase

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting Metabase admin monitoring..."
docker compose -f docker-compose.admin.yml up -d

echo "✓ Metabase started successfully"
echo ""
echo "Access Metabase at: http://localhost:${METABASE_PORT:-3030}"
echo ""
echo "First time setup:"
echo "1. Create an admin account"
echo "2. Add database connection (see README.md)"
echo ""
echo "View logs: ./logs-admin.sh"
echo "Stop: ./stop-admin.sh"
