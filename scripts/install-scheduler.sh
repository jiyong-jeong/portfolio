#!/bin/bash
# 매일 자동 동기화를 실행하는 launchd 에이전트를 설치한다.
#
#   bash scripts/install-scheduler.sh          # 매일 09:00 실행
#   HOUR=3 MINUTE=30 bash scripts/install-scheduler.sh
#
# 맥이 꺼져 있거나 잠들어 있어 실행 시각을 놓치면, launchd 가 깨어난 직후 한 번 실행한다.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LABEL="com.jiyong-jeong.portfolio-sync"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
HOUR="${HOUR:-9}"
MINUTE="${MINUTE:-0}"

mkdir -p "$HOME/Library/LaunchAgents" "$ROOT/.logs"

cat >"$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$LABEL</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$ROOT/scripts/run-sync.sh</string>
    </array>

    <key>WorkingDirectory</key>
    <string>$ROOT</string>

    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>$HOUR</integer>
        <key>Minute</key>
        <integer>$MINUTE</integer>
    </dict>

    <key>StandardOutPath</key>
    <string>$ROOT/.logs/launchd.out.log</string>
    <key>StandardErrorPath</key>
    <string>$ROOT/.logs/launchd.err.log</string>

    <key>RunAtLoad</key>
    <false/>
    <key>ProcessType</key>
    <string>Background</string>
</dict>
</plist>
PLIST_EOF

# 이미 등록되어 있으면 먼저 내린다.
launchctl bootout "gui/$UID/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$UID" "$PLIST"
launchctl enable "gui/$UID/$LABEL"

printf '\n✓ 스케줄러를 설치했습니다\n\n'
printf '  레이블   : %s\n' "$LABEL"
printf '  실행 시각: 매일 %02d:%02d\n' "$HOUR" "$MINUTE"
printf '  스크립트 : %s/scripts/run-sync.sh\n' "$ROOT"
printf '  로그     : %s/.logs/sync.log\n\n' "$ROOT"
printf '유용한 명령\n'
printf '  즉시 실행    : launchctl kickstart -p gui/%s/%s\n' "$UID" "$LABEL"
printf '  등록 확인    : launchctl print gui/%s/%s | head -20\n' "$UID" "$LABEL"
printf '  로그 보기    : tail -f %s/.logs/sync.log\n' "$ROOT"
printf '  제거         : bash scripts/uninstall-scheduler.sh\n\n'
