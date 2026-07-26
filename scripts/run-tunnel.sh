#!/bin/bash
# Cloudflare Tunnel 을 실행해 로컬 정적 서버를 공개 도메인에 연결한다.
#
# launchd 에이전트(com.jiyong-jeong.portfolio-tunnel)가 상시 실행한다.
# 집에서 Cloudflare 로 나가는 outbound 연결만 쓰므로 포트포워딩·고정IP·인증서가 필요 없다.
#
# 터널 정의와 자격증명은 ~/.cloudflared/ 에 있다.
#   config.yml            : 어떤 호스트명을 어느 로컬 포트로 보낼지
#   <터널UUID>.json       : 터널 자격증명
#   cert.pem              : `cloudflared tunnel login` 으로 받은 계정 인증서

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

TUNNEL="${TUNNEL:-portfolio}"
CONFIG="${CLOUDFLARED_CONFIG:-$HOME/.cloudflared/config.yml}"

LOG_DIR="$ROOT/.logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/tunnel.log"

if [[ -f "$LOG_FILE" ]] && [[ $(wc -c <"$LOG_FILE") -gt 5242880 ]]; then
  mv "$LOG_FILE" "$LOG_FILE.1"
fi

exec >>"$LOG_FILE" 2>&1

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "════════ 터널 시작 ($TUNNEL) ════════"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

if ! command -v cloudflared >/dev/null 2>&1; then
  log "✗ cloudflared 를 찾을 수 없습니다 — brew install cloudflared (PATH=$PATH)"
  exit 1
fi

if [[ ! -f "$CONFIG" ]]; then
  log "✗ 설정 파일이 없습니다: $CONFIG"
  exit 1
fi

log "cloudflared $(cloudflared --version 2>&1 | head -1)"
log "설정: $CONFIG"

# 정적 서버 쪽과 마찬가지로 터널이 떠 있는 동안 잠자기를 억제한다.
# (잠자기 방지 요청은 중첩되어도 무해하다)
CAFFEINATE=()
if command -v caffeinate >/dev/null 2>&1; then
  CAFFEINATE=(caffeinate -i -s)
fi

exec "${CAFFEINATE[@]}" cloudflared --config "$CONFIG" --no-autoupdate tunnel run "$TUNNEL"
