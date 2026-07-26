# portfolio

GitHub 레포지토리를 자동으로 읽어 만드는 개인 포트폴리오 사이트입니다.

계정의 모든 레포지토리를 하나씩 분석해 **기술스택 · 프로젝트 설명 · 아키텍처 다이어그램**을
정리하고, 매일 한 번 새 레포지토리나 변경된 레포지토리를 찾아 자동으로 갱신합니다.

- 사이트: https://jiyong-jeong.github.io/portfolio
- 스택: Next.js 16 (App Router, static export) · React 19 · Tailwind CSS v4 · Mermaid

## 동작 방식

```
GitHub API ──▶ 레포 목록 + pushed_at
                    │
                    ├─ state.json 과 비교해 신규/변경된 레포만 선별
                    ▼
          README · 파일트리 · 매니페스트 수집
                    │
                    ▼
             claude CLI (headless)
                    │
                    ▼
       data/projects/<repo>.json  (기술스택 / 설명 / Mermaid 다이어그램)
                    │
                    ▼
      git commit & push ──▶ GitHub Actions ──▶ GitHub Pages
```

핵심은 `data/state.json` 입니다. 레포마다 **마지막으로 반영한 `pushed_at`** 을 기록해 두고,
스케줄러가 돌 때마다 GitHub 의 현재 `pushed_at` 과 비교합니다. 더 최신이면 그 레포만 다시
분석하므로, 매일 돌아도 실제 분석은 바뀐 레포에만 일어납니다.

## 디렉토리 구조

```
portfolio.config.json      대상 계정, 제외 목록, 분석 옵션, 프로필
data/
  projects/<repo>.json     레포별 분석 결과 (사이트가 이걸 읽어 렌더링)
  state.json               레포별 마지막 반영 시각 — 갱신 판단의 기준
  profile.json, meta.json  설정에서 생성되는 사이트 메타데이터
scripts/
  sync.mjs                 분석 파이프라인 진입점
  lib/github.mjs           GitHub API 클라이언트 (gh 토큰 자동 사용)
  lib/context.mjs          README·트리·매니페스트 수집
  lib/analyze.mjs          claude 호출 + 출력 검증/정규화
  lib/mermaid-check.mjs    생성된 다이어그램 문법 검사
  validate-diagrams.mjs    저장된 다이어그램 일괄 검사
  run-sync.sh              스케줄러 엔트리 (pull → sync → commit → push)
  install-scheduler.sh     launchd 등록
src/
  app/                     홈 · /projects/[slug] · /about
  components/Mermaid.tsx   클라이언트 사이드 다이어그램 렌더러 (테마 연동)
  lib/data.ts              빌드 타임 데이터 로더 + 기술스택 집계
```

## 사용법

### 개발

```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # 정적 export → out/
```

### 데이터 갱신

```bash
npm run sync                         # 신규/변경된 레포만 분석
npm run sync:force                   # 전체 재분석
npm run sync:dry                     # 무엇이 분석될지만 확인
node scripts/sync.mjs --only <repo>  # 특정 레포만
npm run validate                     # 저장된 다이어그램 문법 검사
```

GitHub 인증은 `gh auth token` → `GITHUB_TOKEN` 환경변수 순으로 찾습니다.
토큰이 없으면 비인증(시간당 60회 제한)으로 동작합니다.

### 자동 스케줄러 (macOS launchd)

```bash
npm run scheduler:install               # 매일 09:00 실행
HOUR=3 MINUTE=30 npm run scheduler:install

npm run scheduler:run                   # 지금 한 번 실행
tail -f .logs/sync.log                  # 로그 확인
npm run scheduler:uninstall             # 해제
```

스케줄러는 `pull → sync → commit → push` 를 수행하고, push 되면 GitHub Actions 가
사이트를 다시 빌드해 Pages 에 배포합니다. 맥이 꺼져 있어 실행 시각을 놓치면
launchd 가 깨어난 직후 한 번 실행합니다.

## 설정

`portfolio.config.json` 에서 조정합니다.

| 키 | 설명 |
| --- | --- |
| `owner` | 분석 대상 GitHub 계정 |
| `selfRepo` | 이 포트폴리오 레포 이름 (분석 대상에서 제외) |
| `exclude` | 추가로 제외할 레포 이름 배열 |
| `includeForks` / `includeArchived` | 포크·아카이브 레포 포함 여부 |
| `analysis.model` | 분석에 쓸 모델 (`sonnet`, `opus` 등) |
| `analysis.maxAttempts` | 스키마 검증 실패 시 재시도 횟수 |
| `profile` | 사이트에 표시할 이름·소개·연락처 |

## 데이터 품질에 대해

- 분석 결과는 스키마 검증을 통과해야 저장됩니다. 실패하면 재시도하고,
  그래도 실패하면 메타데이터만으로 최소 카드를 만든 뒤 `state.json` 에 실패로 기록해
  다음 실행 때 다시 시도합니다.
- Mermaid 소스는 저장 전에 실제 파서로 검사해, 문법 오류가 있는 다이어그램은 버립니다.
- 그럼에도 렌더링에 실패하면 사이트에서 오류 대신 다이어그램 소스를 보여줍니다.
