#!/bin/bash
# 로컬 호스팅을 상시 실행하는 launchd 에이전트 두 개를 설치한다.
#
#   com.jiyong-jeong.portfolio-serve   out/ 을 로컬 포트로 서빙
#   com.jiyong-jeong.portfolio-tunnel  Cloudflare Tunnel 로 공개 도메인 연결
#
#   bash scripts/install-hosting.sh
#   PORT=8080 TUNNEL=portfolio bash scripts/install-hosting.sh
#
# 둘 다 KeepAlive 라 프로세스가 죽으면 launchd 가 되살리고, 로그인 시 자동으로 뜬다.
# 다만 맥이 잠들면 사이트도 내려간다 — 디스플레이 꺼짐 시 잠자기 방지를 켜둘 것.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3000}"
TUNNEL="${TUNNEL:-portfolio}"

SERVE_LABEL="com.jiyong-jeong.portfolio-serve"
TUNNEL_LABEL="com.jiyong-jeong.portfolio-tunnel"

mkdir -p "$HOME/Library/LaunchAgents" "$ROOT/.logs"

# $1 레이블  $2 스크립트  $3 추가 환경변수 키  $4 추가 환경변수 값
write_plist() {
  local label="$1" script="$2" env_key="$3" env_val="$4"
  cat >"$HOME/Library/LaunchAgents/$label.plist" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$label</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$ROOT/scripts/$script</string>
    </array>

    <key>WorkingDirectory</key>
    <string>$ROOT</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>$env_key</key>
        <string>$env_val</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ThrottleInterval</key>
    <integer>10</integer>

    <key>StandardOutPath</key>
    <string>$ROOT/.logs/launchd.$label.out.log</string>
    <key>StandardErrorPath</key>
    <string>$ROOT/.logs/launchd.$label.err.log</string>
</dict>
</plist>
PLIST_EOF
}

write_plist "$SERVE_LABEL"  "run-serve.sh"  "PORT"   "$PORT"
write_plist "$TUNNEL_LABEL" "run-tunnel.sh" "TUNNEL" "$TUNNEL"

for label in "$SERVE_LABEL" "$TUNNEL_LABEL"; do
  # 이미 등록되어 있으면 먼저 내린다.
  launchctl bootout "gui/$UID/$label" 2>/dev/null || true
  launchctl bootstrap "gui/$UID" "$HOME/Library/LaunchAgents/$label.plist"
  launchctl enable "gui/$UID/$label"
done

printf '\n✓ 상시 호스팅 에이전트를 설치했습니다\n\n'
printf '  정적 서버 : %s (포트 %s)\n' "$SERVE_LABEL" "$PORT"
printf '  터널      : %s (터널 %s)\n' "$TUNNEL_LABEL" "$TUNNEL"
printf '  로그      : %s/.logs/serve.log , tunnel.log\n\n' "$ROOT"
printf '유용한 명령\n'
printf '  상태 확인 : launchctl list | grep portfolio\n'
printf '  재시작    : launchctl kickstart -k gui/%s/%s\n' "$UID" "$SERVE_LABEL"
printf '  로그 보기 : tail -f %s/.logs/tunnel.log\n' "$ROOT"
printf '  제거      : bash scripts/uninstall-hosting.sh\n\n'
printf '맥이 잠들면 사이트도 내려갑니다.\n'
printf '시스템 설정 → 디스플레이 → 고급 → "디스플레이가 꺼져 있을 때 자동으로 잠자기 방지" 를 켜세요.\n\n'
