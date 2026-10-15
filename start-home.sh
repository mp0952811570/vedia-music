#!/usr/bin/env bash
# Run Vedia Music on this PC and expose it through a free Cloudflare quick tunnel.
# Usage: ./start-home.sh   (prints the public URL; it changes on every restart)
set -e
cd "$(dirname "$0")"
[ -f .access_key ] || python3 -c "import secrets;print(secrets.token_hex(3))" > .access_key
tmux kill-session -t vedia 2>/dev/null || true
tmux kill-session -t vedia-tunnel 2>/dev/null || true
LOG=${TMPDIR:-/tmp}
tmux new-session -d -s vedia "cd $PWD && ACCESS_KEY=$(cat .access_key) PORT=3000 node server.js 2>&1 | tee $LOG/vedia.log"
tmux new-session -d -s vedia-tunnel "cloudflared tunnel --no-autoupdate --url http://127.0.0.1:3000 2>&1 | tee $LOG/tunnel.log"
for i in $(seq 1 30); do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG/tunnel.log" 2>/dev/null | head -1)
  [ -n "$URL" ] && break; sleep 1
done
echo "URL:  $URL/?key=$(cat .access_key)"
