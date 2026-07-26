#!/bin/bash
# 정적 빌드 결과(out/)를 로컬 포트로 서빙한다.
#
# launchd 에이전트(com.jiyong-jeong.portfolio-serve)가 상시 실행하며,
# cloudflared 터널이 이 포트를 바라본다. 수동으로는 `npm run hosting:serve`.
#
#   PORT=3000 bash scripts/run-serve.sh

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

PORT="${PORT:-3000}"

LOG_DIR="$ROOT/.logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/serve.log"

# 요청 로그가 쌓이므로 5MB 를 넘으면 한 세대만 보관하고 새로 시작한다.
if [[ -f "$LOG_FILE" ]] && [[ $(wc -c <"$LOG_FILE") -gt 5242880 ]]; then
  mv "$LOG_FILE" "$LOG_FILE.1"
fi

exec >>"$LOG_FILE" 2>&1

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "════════ 정적 서버 시작 (포트 $PORT) ════════"

# launchd 는 로그인 셸의 PATH 를 물려받지 않으므로 직접 보강한다.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# nvm 을 쓰는 환경이면 설치된 node 중 가장 최신 버전을 고른다. (run-sync.sh 와 동일한 방식)
NVM_NODE_BIN="$(find "$HOME/.nvm/versions/node" -maxdepth 2 -type d -name bin 2>/dev/null | sort -V | tail -1)"
if [[ -n "$NVM_NODE_BIN" ]]; then
  export PATH="$NVM_NODE_BIN:$PATH"
fi

if ! command -v node >/dev/null 2>&1; then
  log "✗ node 를 찾을 수 없습니다 (PATH=$PATH)"
  exit 1
fi

SERVE_BIN="$ROOT/node_modules/.bin/serve"
if [[ ! -x "$SERVE_BIN" ]]; then
  log "✗ serve 가 설치되어 있지 않습니다 — npm install 을 먼저 실행하세요"
  exit 1
fi

# 빌드 산출물이 없으면 먼저 만든다.
# basePath 는 비워야 한다. (GitHub Pages 용 /portfolio 가 붙으면 경로가 깨진다)
if [[ ! -f "$ROOT/out/index.html" ]]; then
  log "out/ 이 없어 빌드를 먼저 실행합니다"
  NEXT_PUBLIC_BASE_PATH= npm run build || { log "✗ 빌드 실패"; exit 1; }
fi

log "node $(node -v) / serve $("$SERVE_BIN" --version 2>/dev/null | head -1)"

# caffeinate 로 감싸 서버가 떠 있는 동안 맥이 잠들지 않게 한다.
#   -i 유휴 잠자기 방지 (배터리에서도 동작)
#   -s 시스템 잠자기 방지 (전원 어댑터 연결 시)
# 프로세스가 끝나면 잠자기 방지도 함께 풀리므로 시스템 설정을 건드릴 필요가 없다.
# 단, 뚜껑을 닫으면(clamshell) caffeinate 로도 막을 수 없다.
CAFFEINATE=()
if command -v caffeinate >/dev/null 2>&1; then
  CAFFEINATE=(caffeinate -i -s)
  log "caffeinate 로 잠자기를 억제합니다"
fi

# --no-port-switching: 포트가 점유되어 있으면 조용히 다른 포트로 옮기지 않고 실패한다.
#   (몰래 3001 로 옮겨가면 터널이 502 를 내면서 원인을 찾기 어려워진다)
exec "${CAFFEINATE[@]}" "$SERVE_BIN" "$ROOT/out" \
  --listen "$PORT" \
  --no-clipboard \
  --no-port-switching
