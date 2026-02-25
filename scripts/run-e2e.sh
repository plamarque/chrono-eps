#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

# Build first
npm run build

# Kill any existing preview on our port
lsof -ti:4174 | xargs kill -9 2>/dev/null || true
sleep 1

# Start preview in background
npx vite preview --config vite.preview-e2e.config.js &
PREVIEW_PID=$!

# Wait for server to be ready
echo "Waiting for preview server..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:4174/chrono-eps/ | grep -q 200; then
    echo "Server ready."
    break
  fi
  sleep 1
  if [ $i -eq 30 ]; then
    echo "Server failed to start."
    kill $PREVIEW_PID 2>/dev/null || true
    exit 1
  fi
done

# Run Playwright with existing server
REUSE_SERVER=1 npx playwright test

# Cleanup
kill $PREVIEW_PID 2>/dev/null || true
