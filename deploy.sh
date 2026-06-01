#!/usr/bin/env bash
# Pull latest code for ui + server, rebuild images, and roll containers.
# Designed to run on the deployment host (the ubuntu laptop).
#
# Usage:  ./deploy.sh
#   or:   ssh user@host 'bash -lc /path/to/deploy.sh'

set -euo pipefail

# Resolve repo locations relative to this script so it works no matter where
# it's invoked from. The script lives in dance-ui/, dance-server is a sibling.
UI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$UI_DIR/../dance-server" && pwd)"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

log "Pulling dance-ui"
git -C "$UI_DIR" pull --ff-only

log "Pulling dance-server"
git -C "$SERVER_DIR" pull --ff-only

log "Building images (old containers keep serving during this)"
docker compose -f "$UI_DIR/docker-compose.yml" build --pull

log "Rolling containers (only changed services restart)"
docker compose -f "$UI_DIR/docker-compose.yml" up -d --remove-orphans

log "Pruning dangling images"
docker image prune -f

log "Done. Current state:"
docker compose -f "$UI_DIR/docker-compose.yml" ps
