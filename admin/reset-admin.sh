#!/bin/bash
# Reset admin monitoring (removes all data)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "⚠️  WARNING: This will delete all Metabase data!"
read -p "Are you sure? (yes/no): " -r
echo

if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Stopping Metabase and removing data..."
    docker compose -f docker-compose.admin.yml down
    rm -rf metabase-data
    echo "✓ Data removed"
    echo ""
    echo "Start fresh with: ./start-admin.sh"
else
    echo "Reset cancelled."
fi
