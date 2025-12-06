#!/bin/bash
# View admin monitoring logs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Showing Metabase logs (Ctrl+C to exit)..."
docker compose -f docker-compose.admin.yml logs -f metabase
