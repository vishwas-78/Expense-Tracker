#!/usr/bin/env bash
set -euo pipefail

uv run --project ../.. python -m uvicorn backend.main:app --host 127.0.0.1 --port 8001 --reload &
api_pid=$!
cleanup() {
  kill "$api_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for attempt in $(seq 1 40); do
  if curl --silent --fail http://127.0.0.1:8001/_api/healthz >/dev/null; then
    break
  fi
  if ! kill -0 "$api_pid" 2>/dev/null; then
    wait "$api_pid"
  fi
  sleep 0.25
done

pnpm exec vite --config vite.config.ts --host 0.0.0.0 --port "$PORT" --strictPort