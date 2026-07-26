#!/bin/bash
# 상시 호스팅 launchd 에이전트를 제거한다. (터널 정의와 DNS 레코드는 그대로 남는다)

set -uo pipefail

for LABEL in com.jiyong-jeong.portfolio-serve com.jiyong-jeong.portfolio-tunnel; do
  PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

  launchctl bootout "gui/$UID/$LABEL" 2>/dev/null \
    && echo "✓ 에이전트를 내렸습니다: $LABEL" \
    || echo "· 실행 중인 에이전트가 없습니다: $LABEL"

  if [[ -f "$PLIST" ]]; then
    rm -f "$PLIST"
    echo "✓ plist 를 삭제했습니다: $PLIST"
  else
    echo "· plist 가 없습니다: $PLIST"
  fi
done
