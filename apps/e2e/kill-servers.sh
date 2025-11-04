#!/bin/bash

# Kill all development servers that might be running in the background
# Useful when Playwright tests are interrupted and leave servers running

echo "Stopping development servers..."

# Kill processes on known ports
for port in 3000 3333 5173; do
  pid=$(lsof -ti:$port 2>/dev/null)
  if [ ! -z "$pid" ]; then
    echo "Killing process $pid on port $port"
    kill $pid 2>/dev/null
  fi
done

echo "Done! All dev servers stopped."
