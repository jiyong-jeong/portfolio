#!/bin/bash
# 하루 한 번 실행되는 자동 동기화 엔트리포인트.
#
#  1. git pull 로 원격 변경분을 먼저 반영
#  2. scripts/sync.mjs 실행 — 새 레포/변경된 레포만 Claude 로 분석
#  3. out/ 재빌드 — 로컬 상시 호스팅(scripts/install-hosting.sh)이 설치된 경우에만
#  4. data/ 에 변경이 생기면 커밋하고 push
#     (push 되면 GitHub Actions 가 사이트를 다시 빌드·배포한다)
#
# launchd 에서 호출되며, 수동으로는 `npm run scheduler:run` 으로 실행할 수 있다.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

LOG_DIR="$ROOT/.logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/sync.log"

# 로그가 5MB 를 넘으면 한 세대만 보관하고 새로 시작한다.
if [[ -f "$LOG_FILE" ]] && [[ $(wc -c <"$LOG_FILE") -gt 5242880 ]]; then
  mv "$LOG_FILE" "$LOG_FILE.1"
fi

exec >>"$LOG_FILE" 2>&1

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "════════ 동기화 시작 ════════"

# launchd 는 로그인 셸의 PATH 를 물려받지 않으므로 직접 보강한다.
# claude 는 보통 ~/.local/bin 에 설치된다.
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# nvm 을 쓰는 환경이면 설치된 node 중 가장 최신 버전을 고른다.
# (nvm.sh 를 source 하면 default 로 지정된 낮은 버전이 잡힐 수 있어 직접 선택한다.)
NVM_NODE_BIN="$(find "$HOME/.nvm/versions/node" -maxdepth 2 -type d -name bin 2>/dev/null | sort -V | tail -1)"
if [[ -n "$NVM_NODE_BIN" ]]; then
  export PATH="$NVM_NODE_BIN:$PATH"
fi

for cmd in node git claude; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log "✗ 필수 명령을 찾을 수 없습니다: $cmd (PATH=$PATH)"
    exit 1
  fi
done
log "node $(node -v) / $(command -v claude)"

if [[ ! -d .git ]]; then
  log "✗ git 저장소가 아닙니다: $ROOT"
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"

# 1. 원격 변경분 반영 (원격이 없거나 실패해도 분석은 진행한다)
if git remote get-url origin >/dev/null 2>&1; then
  log "원격에서 최신 변경분을 가져옵니다 (origin/$BRANCH)"
  git pull --rebase --autostash origin "$BRANCH" || log "⚠ git pull 실패 — 로컬 상태로 계속 진행합니다"
else
  log "⚠ origin 원격이 설정되어 있지 않습니다. 커밋만 하고 push 는 건너뜁니다."
fi

# 2. 동기화 실행
log "레포지토리 분석을 시작합니다"
node scripts/sync.mjs
SYNC_EXIT=$?
log "sync.mjs 종료 코드: $SYNC_EXIT"

# 다이어그램 문법 검사 (실패해도 배포는 막지 않는다 — 사이트에 폴백 UI 가 있다)
node scripts/validate-diagrams.mjs || log "⚠ 일부 다이어그램이 파싱되지 않습니다"

# 3. 로컬 상시 호스팅용 정적 빌드 갱신
#
# git pull 로 코드가 바뀌었을 수도, sync.mjs 로 데이터가 바뀌었을 수도 있으므로
# 조건을 따지지 않고 항상 다시 만든다. (하루 한 번이라 비용보다 신선함이 중요하다)
# serve 는 요청마다 디스크를 읽으므로 에이전트를 재시작할 필요는 없다.
#
# NEXT_PUBLIC_BASE_PATH 는 반드시 비운다.
# GitHub Pages 용 /portfolio 가 붙으면 커스텀 도메인에서 경로가 전부 깨진다.
if [[ -f "$HOME/Library/LaunchAgents/com.jiyong-jeong.portfolio-serve.plist" ]]; then
  log "로컬 호스팅용 정적 빌드를 갱신합니다"
  if NEXT_PUBLIC_BASE_PATH= npm run build; then
    log "✓ out/ 갱신 완료"
  else
    # 빌드가 깨져도 이전 out/ 이 계속 서빙되므로 사이트가 내려가지는 않는다.
    log "⚠ 빌드 실패 — 직전 out/ 이 그대로 서빙됩니다"
  fi
else
  log "로컬 호스팅 에이전트가 없어 정적 빌드를 건너뜁니다"
fi

# 4. 변경분 커밋 & push
if [[ -z "$(git status --porcelain data)" ]]; then
  log "데이터 변경 없음 — 커밋할 내용이 없습니다"
  log "════════ 동기화 종료 ════════"
  exit $SYNC_EXIT
fi

CHANGED=$(git status --porcelain data | wc -l | tr -d ' ')
ADDED=$(git status --porcelain data/projects | grep -c '^??' || true)
log "데이터 변경 감지: 파일 $CHANGED개 (신규 $ADDED개)"

git add data
git -c user.name="portfolio-sync" \
    -c user.email="portfolio-sync@users.noreply.github.com" \
    commit -m "chore(data): 레포지토리 분석 결과 자동 갱신 ($(date '+%Y-%m-%d'))" \
    -m "sync.mjs 가 새로 추가되었거나 마지막 커밋 시각이 갱신된 레포를 재분석했습니다." \
  || { log "✗ 커밋 실패"; exit 1; }

if git remote get-url origin >/dev/null 2>&1; then
  if git push origin "$BRANCH"; then
    log "✓ push 완료 — GitHub Actions 가 사이트를 재배포합니다"
  else
    log "✗ push 실패 — 인증 상태를 확인하세요 (gh auth status)"
    exit 1
  fi
fi

log "════════ 동기화 종료 ════════"
exit $SYNC_EXIT
