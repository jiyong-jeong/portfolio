#!/bin/bash
# 자동 동기화 launchd 에이전트를 제거한다.

set -uo pipefail

LABEL="com.jiyong-jeong.portfolio-sync"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

launchctl bootout "gui/$UID/$LABEL" 2>/dev/null && echo "✓ 에이전트를 내렸습니다" || echo "· 실행 중인 에이전트가 없습니다"

if [[ -f "$PLIST" ]]; then
  rm -f "$PLIST"
  echo "✓ plist 를 삭제했습니다: $PLIST"
else
  echo "· plist 가 없습니다: $PLIST"
fi
