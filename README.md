# portfolio

GitHub 레포지토리를 자동으로 읽어 만드는 개인 포트폴리오 사이트입니다.

계정의 모든 레포지토리를 하나씩 분석해 **기술스택 · 프로젝트 설명 · 아키텍처 다이어그램**을
정리하고, 매일 한 번 새 레포지토리나 변경된 레포지토리를 찾아 자동으로 갱신합니다.

- 사이트: https://matthew-portfolio.xyz (커스텀 도메인, 로컬 호스팅)
- 미러: https://jiyong-jeong.github.io/portfolio (GitHub Pages)
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
        ┌───────────┴────────────┐
        ▼                        ▼
   out/ 재빌드            git commit & push
        │                        │
        ▼                        ▼
  serve (:3100)            GitHub Actions
        │                        │
        ▼                        ▼
 Cloudflare Tunnel         GitHub Pages
        │                        │
        ▼                        ▼
 matthew-portfolio.xyz    jiyong-jeong.github.io/portfolio
```

배포 경로가 둘입니다. 왼쪽이 정식 주소(내 맥에서 서빙), 오른쪽은 push 될 때마다
자동으로 따라가는 미러입니다. 맥이 꺼져 있어도 미러는 살아 있습니다.

핵심은 `data/state.json` 입니다. 레포마다 **마지막으로 반영한 `pushed_at`** 을 기록해 두고,
스케줄러가 돌 때마다 GitHub 의 현재 `pushed_at` 과 비교합니다. 더 최신이면 그 레포만 다시
분석하므로, 매일 돌아도 실제 분석은 바뀐 레포에만 일어납니다.

## 디렉토리 구조

```
portfolio.config.json      대상 계정, 제외 목록, 분석 옵션, 프로필
data/
  projects/<repo>.json     레포별 분석 결과 (사이트가 이걸 읽어 렌더링)
  tech/<slug>.json         기술별 학습용 개요 (정의·핵심 개념·예시·함정)
  state.json               레포별 마지막 반영 시각 — 갱신 판단의 기준
  profile.json, meta.json  설정에서 생성되는 사이트 메타데이터
scripts/
  sync.mjs                 분석 파이프라인 진입점
  lib/github.mjs           GitHub API 클라이언트 (gh 토큰 자동 사용)
  lib/context.mjs          README·트리·매니페스트 수집
  lib/analyze.mjs          claude 호출 + 출력 검증/정규화
  lib/tech-doc.mjs         기술 학습용 개요 생성 (기술당 1회, 이후 재사용)
  lib/mermaid-check.mjs    생성된 다이어그램 문법 검사
  validate-diagrams.mjs    저장된 다이어그램 일괄 검사
  run-sync.sh              스케줄러 엔트리 (pull → sync → 재빌드 → commit → push)
  install-scheduler.sh     launchd 등록 (매일 동기화)
  run-serve.sh             out/ 정적 서빙 (로컬 호스팅)
  run-tunnel.sh            Cloudflare Tunnel 실행
  install-hosting.sh       launchd 등록 (상시 호스팅 2개)
src/
  app/                     홈 · /projects/[slug] · /tech/[slug] · /about
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

스케줄러는 `pull → sync → out/ 재빌드 → commit → push` 를 수행합니다. push 되면
GitHub Actions 가 Pages 미러를 다시 배포하고, `out/` 재빌드는 로컬 호스팅 쪽에
즉시 반영됩니다. 맥이 꺼져 있어 실행 시각을 놓치면 launchd 가 깨어난 직후 한 번
실행합니다.

`out/` 재빌드는 **호스팅 에이전트가 설치돼 있을 때만** 수행합니다
(`~/Library/LaunchAgents/com.jiyong-jeong.portfolio-serve.plist` 존재 여부로 판단).
빌드가 실패해도 직전 `out/` 이 그대로 서빙되므로 사이트가 내려가지는 않습니다.

## 로컬 호스팅 + 커스텀 도메인

정식 주소 `matthew-portfolio.xyz` 는 **내 맥에서 직접 서빙**합니다.
정적 export 라 서버 런타임이 필요 없고, Cloudflare Tunnel 로 공개합니다.

```
브라우저 → Cloudflare 엣지 (HTTPS 종료, 서울)
              ↕ QUIC outbound 터널
         cloudflared (내 맥)
              ↓ http://localhost:3100
         serve out/
```

### 왜 터널인가

가정용 회선에 서버를 여는 정석은 포트포워딩 + DDNS + Let's Encrypt 지만,
공인 IP 가 수시로 바뀌고 NAT 뒤에 있으며 국내 ISP 가 80/443 인바운드를 막는
경우가 많습니다. Cloudflare Tunnel 은 **맥에서 Cloudflare 로 나가는 연결만**
쓰기 때문에 이 문제들이 전부 사라집니다.

| | 포트포워딩 | Cloudflare Tunnel |
| --- | --- | --- |
| 공유기 설정 | 필요 | 불필요 |
| 고정 IP / DDNS | 필요 | 불필요 |
| TLS 인증서 | 직접 발급·갱신 | Cloudflare 가 처리 |
| 집 공인 IP | 노출됨 | 노출 안 됨 |
| ISP 포트 차단 | 영향 받음 | 영향 없음 |

### 구성 요소

| 위치 | 내용 |
| --- | --- |
| `~/.cloudflared/config.yml` | 호스트명 → `localhost:3100` 라우팅 규칙 |
| `~/.cloudflared/<UUID>.json` | 터널 자격증명 |
| `~/.cloudflared/cert.pem` | `cloudflared tunnel login` 으로 받은 계정 인증서 |
| Cloudflare DNS | 루트와 `www` 가 터널을 가리키는 CNAME |

`~/.cloudflared/` 는 이 레포 밖에 있고 **자격증명이라 커밋하지 않습니다.**
다른 기기에서 재현하려면 아래 최초 설정을 다시 거쳐야 합니다.

### 설치

```bash
npm run hosting:install                 # 포트 3100, 터널 이름 portfolio
PORT=8080 TUNNEL=other npm run hosting:install

npm run hosting:uninstall               # 해제
```

launchd 에이전트 두 개가 등록됩니다. 둘 다 `KeepAlive` 라 프로세스가 죽으면
되살아나고 로그인 시 자동으로 뜹니다.

| 레이블 | 하는 일 |
| --- | --- |
| `com.jiyong-jeong.portfolio-serve` | `out/` 을 포트 3100 으로 서빙 |
| `com.jiyong-jeong.portfolio-tunnel` | cloudflared 터널 유지 |

```bash
launchctl list | grep portfolio                                   # 상태
tail -f .logs/serve.log                                           # 접속 로그
tail -f .logs/tunnel.log                                          # 터널 로그
launchctl kickstart -k gui/$UID/com.jiyong-jeong.portfolio-serve  # 재시작
```

### 최초 설정 (도메인 연결)

한 번만 하면 되는 과정입니다.

1. 도메인 등록 (가비아 등)
2. Cloudflare 에 **Connect a domain** — 등록기관은 그대로 두고 DNS 만 위임.
   무료 플랜은 네임서버 위임이 필수라 레코드만 추가하는 방식은 안 됩니다.
3. 등록기관에서 네임서버를 Cloudflare 것으로 변경
4. 전파 확인 — `dig NS <도메인> +short` 가 `*.ns.cloudflare.com` 을 반환할 때까지.
   갓 등록한 도메인은 레지스트리 존에 게시되기까지 수십 분 걸릴 수 있습니다.
   `whois` 에 네임서버가 보여도 `dig` 가 비어 있으면 아직 게시 전입니다.
5. 터널 생성과 DNS 연결

```bash
cloudflared tunnel login                # 브라우저에서 도메인 선택
cloudflared tunnel create portfolio     # 출력되는 UUID 를 config.yml 에 적는다
cloudflared tunnel route dns portfolio <도메인>
cloudflared tunnel route dns portfolio www.<도메인>
```

`~/.cloudflared/config.yml`:

```yaml
tunnel: portfolio
credentials-file: /Users/<사용자>/.cloudflared/<UUID>.json

ingress:
  - hostname: <도메인>
    service: http://localhost:3100
  - hostname: www.<도메인>
    service: http://localhost:3100
  - service: http_status:404
```

### 알아둘 점

- **포트는 3100 입니다.** 3000 은 `npm run dev` 가 쓰므로 비워둡니다.
  개발 서버가 공개 도메인에 실려 나가는 사고를 막기 위해 분리했습니다.
- **빌드 시 `basePath` 를 비워야 합니다.** GitHub Pages 용
  `NEXT_PUBLIC_BASE_PATH=/portfolio` 가 붙은 채로 빌드하면 커스텀 도메인에서
  모든 경로가 깨집니다. `run-serve.sh` 와 `run-sync.sh` 는 항상 비우고 빌드합니다.
- **`serve` 는 요청마다 디스크를 읽습니다.** 재빌드 후 에이전트를 재시작할 필요가 없습니다.
- **잠자기**: 두 스크립트 모두 `caffeinate -i -s` 로 감싸, 프로세스가 떠 있는 동안만
  잠자기를 억제합니다. 시스템 전원 설정을 영구히 바꾸지 않고, 에이전트를 내리면
  원래대로 돌아옵니다. 다만 **뚜껑을 닫으면(clamshell) 막을 수 없고**, 배터리가
  떨어지면 내려갑니다. 상시 운영하려면 전원 어댑터를 연결해 두세요.
- **`www` 는 현재 리다이렉트가 아니라 같은 내용을 서빙합니다.** 터널 ingress 에는
  리다이렉트 기능이 없습니다. 루트로 301 을 보내려면 Cloudflare 대시보드의
  **Rules → Redirect Rules** 를 쓰고, `config.yml` 의 www ingress 블록을 지웁니다.
- **가용성은 집 네트워크에 달려 있습니다.** 정전·인터넷 장애·재부팅이 그대로
  다운타임입니다. 그래서 GitHub Pages 미러를 함께 유지합니다.

## 설정

`portfolio.config.json` 에서 조정합니다.

| 키 | 설명 |
| --- | --- |
| `owner` | 분석 대상 GitHub 계정 |
| `selfRepo` | 이 포트폴리오 레포 이름 (분석 대상에 **포함**되며, 자기 참조 루프 방지에 사용) |
| `syncBotName` | 동기화 봇의 커밋 author 이름. 이 이름의 커밋은 변경으로 보지 않는다 |
| `exclude` | 제외할 레포 이름 배열 |
| `includeForks` / `includeArchived` | 포크·아카이브 레포 포함 여부 |
| `analysis.model` | 분석에 쓸 모델 (`sonnet`, `opus` 등) |
| `analysis.maxAttempts` | 스키마 검증 실패 시 재시도 횟수 |
| `analysis.excludePaths` | 파일 트리 수집에서 제외할 경로 접두사 (생성물·의존성) |
| `profile` | 사이트에 표시할 이름·소개·연락처 |

## 이 레포도 분석 대상입니다

포트폴리오 사이트 자신(`portfolio`)도 다른 레포와 똑같이 분석되어 프로젝트 목록에 나옵니다.

이때 자기 참조 루프가 생길 수 있습니다. 스케줄러가 데이터를 push 하면 이 레포의
`pushed_at` 이 갱신되고, 다음 실행에서 그것을 "변경됨"으로 판정해 매일 재분석·재배포가
반복되기 때문입니다.

그래서 이 레포에 한해 `pushed_at` 대신 **`syncBotName` 이 아닌 마지막 커밋 시각**을
기준으로 삼습니다. 봇이 데이터만 갱신한 경우에는 변경으로 보지 않고, 소스를 직접
수정했을 때만 다시 분석합니다.

## 기술 페이지 (`/tech/<slug>`)

기술 배지를 누르면 열리는 페이지로, 두 층으로 구성됩니다.

1. **기술 개요** — `data/tech/<slug>.json`. 정의, 핵심 개념, 사용 시점, 최소 예시 코드,
   흔한 함정. 레포 내용과 무관한 일반 지식이라 **기술당 한 번만 생성**하고 이후 재사용합니다.
   (`npm run sync:force` 로 다시 만들 수 있습니다)
2. **프로젝트별 활용 방식** — 각 프로젝트의 `techStack[].usage` 를 모아 보여줍니다.
   이쪽은 레포가 바뀌면 함께 갱신됩니다.

기술 개요가 아직 없으면 해당 섹션만 숨기고 나머지는 정상 동작합니다.

## 데이터 품질에 대해

- 분석 결과는 스키마 검증을 통과해야 저장됩니다. 실패하면 재시도하고,
  그래도 실패하면 메타데이터만으로 최소 카드를 만든 뒤 `state.json` 에 실패로 기록해
  다음 실행 때 다시 시도합니다.
- Mermaid 소스는 저장 전에 실제 파서로 검사해, 문법 오류가 있는 다이어그램은 버립니다.
- 그럼에도 렌더링에 실패하면 사이트에서 오류 대신 다이어그램 소스를 보여줍니다.
