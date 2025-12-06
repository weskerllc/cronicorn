#!/bin/bash
# Admin Monitoring Helper Script
# Manages Metabase admin monitoring for Cronicorn

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_help() {
  echo "Usage: $0 [command]"
  echo ""
  echo "Commands:"
  echo "  start       Start Metabase admin monitoring (development)"
  echo "  start-prod  Start Metabase admin monitoring (production)"
  echo "  stop        Stop Metabase"
  echo "  restart     Restart Metabase"
  echo "  logs        View Metabase logs"
  echo "  status      Check if Metabase is running"
  echo "  reset       Stop and remove all Metabase data (fresh start)"
  echo "  help        Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 start         # Start Metabase for development"
  echo "  $0 logs          # View logs"
  echo "  $0 stop          # Stop Metabase"
  echo ""
  echo "After starting, access Metabase at: http://localhost:3030"
  echo "See docs/admin-monitoring.md for setup instructions"
}

start_dev() {
  echo -e "${GREEN}Starting Metabase (development)...${NC}"
  docker compose -f docker-compose.dev.yml --profile admin up -d metabase
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Metabase started successfully${NC}"
    echo ""
    echo "Access Metabase at: http://localhost:3030"
    echo ""
    echo "First time setup:"
    echo "1. Create an admin account"
    echo "2. Add database connection (see docs/admin-monitoring.md)"
    echo ""
    echo "View logs: $0 logs"
  else
    echo -e "${RED}✗ Failed to start Metabase${NC}"
    exit 1
  fi
}

start_prod() {
  echo -e "${GREEN}Starting Metabase (production)...${NC}"
  docker compose --profile admin up -d metabase
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Metabase started successfully${NC}"
    echo ""
    echo "Access Metabase at: http://localhost:3030"
    echo ""
    echo "First time setup:"
    echo "1. Create an admin account"
    echo "2. Add database connection (see docs/admin-monitoring.md)"
    echo ""
    echo "View logs: $0 logs"
  else
    echo -e "${RED}✗ Failed to start Metabase${NC}"
    exit 1
  fi
}

stop() {
  echo -e "${YELLOW}Stopping Metabase...${NC}"
  
  # Try both dev and prod compose files
  docker compose -f docker-compose.dev.yml down metabase 2>/dev/null || true
  docker compose down metabase 2>/dev/null || true
  
  echo -e "${GREEN}✓ Metabase stopped${NC}"
}

restart() {
  echo -e "${YELLOW}Restarting Metabase...${NC}"
  stop
  sleep 2
  start_dev
}

logs() {
  echo -e "${GREEN}Showing Metabase logs (Ctrl+C to exit)...${NC}"
  echo ""
  
  # Try dev compose first, then prod
  if docker compose -f docker-compose.dev.yml ps metabase 2>/dev/null | grep -q metabase; then
    docker compose -f docker-compose.dev.yml logs -f metabase
  elif docker compose ps metabase 2>/dev/null | grep -q metabase; then
    docker compose logs -f metabase
  else
    echo -e "${RED}✗ Metabase is not running${NC}"
    exit 1
  fi
}

status() {
  echo "Checking Metabase status..."
  echo ""
  
  # Check if container is running
  if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "cronicorn.*metabase"; then
    echo -e "${GREEN}✓ Metabase is running${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep metabase
    echo ""
    echo "Access at: http://localhost:3030"
  else
    echo -e "${YELLOW}✗ Metabase is not running${NC}"
    echo ""
    echo "Start with: $0 start"
  fi
}

reset() {
  echo -e "${YELLOW}⚠️  WARNING: This will delete all Metabase data!${NC}"
  echo "This includes all dashboards, queries, and settings."
  echo ""
  read -p "Are you sure you want to continue? (yes/no): " -r
  echo ""
  
  if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Stopping Metabase and removing data...${NC}"
    
    # Stop containers
    docker compose -f docker-compose.dev.yml down metabase 2>/dev/null || true
    docker compose down metabase 2>/dev/null || true
    
    # Remove volumes
    docker volume rm cronicorn_metabase-data 2>/dev/null || true
    
    # Remove files
    if [ -d "../files/metabase-data" ]; then
      rm -rf "../files/metabase-data"
    fi
    
    echo -e "${GREEN}✓ Metabase data removed${NC}"
    echo ""
    echo "Start fresh with: $0 start"
  else
    echo "Reset cancelled."
  fi
}

# Main script logic
case "${1:-help}" in
  start)
    start_dev
    ;;
  start-prod)
    start_prod
    ;;
  stop)
    stop
    ;;
  restart)
    restart
    ;;
  logs)
    logs
    ;;
  status)
    status
    ;;
  reset)
    reset
    ;;
  help|--help|-h)
    print_help
    ;;
  *)
    echo -e "${RED}Unknown command: $1${NC}"
    echo ""
    print_help
    exit 1
    ;;
esac
