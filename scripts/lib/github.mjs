import { execFileSync } from "node:child_process";

const API = "https://api.github.com";

let cachedToken;

/**
 * 인증 토큰 해석 순서: GITHUB_TOKEN/GH_TOKEN 환경변수 → `gh auth token`.
 * 토큰이 없으면 비인증으로 동작한다(시간당 60회 제한).
 */
export function resolveToken() {
  if (cachedToken !== undefined) return cachedToken;

  const fromEnv = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (fromEnv) {
    cachedToken = fromEnv.trim();
    return cachedToken;
  }

  try {
    const out = execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    cachedToken = out || null;
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

function headers(accept = "application/vnd.github+json") {
  const h = {
    Accept: accept,
    "User-Agent": "portfolio-sync",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = resolveToken();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function request(url, { accept, allow404 = false } = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: headers(accept) });

    if (res.status === 404 && allow404) return null;

    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      const reset = Number(res.headers.get("x-ratelimit-reset") || 0);
      if (remaining === "0" && reset) {
        const waitMs = Math.max(0, reset * 1000 - Date.now()) + 2000;
        if (waitMs > 5 * 60 * 1000) {
          throw new Error(
            `GitHub API 레이트리밋 초과. ${new Date(reset * 1000).toISOString()} 이후 재시도하세요.`,
          );
        }
        await sleep(waitMs);
        continue;
      }
    }

    if (res.status >= 500 && attempt < 3) {
      await sleep(1000 * attempt);
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`GitHub API ${res.status} ${url}\n${body.slice(0, 400)}`);
    }

    return accept && accept.includes("raw") ? res.text() : res.json();
  }
  throw new Error(`GitHub API 요청 실패(재시도 초과): ${url}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function listRepos(owner) {
  const repos = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await request(
      `${API}/users/${owner}/repos?per_page=100&page=${page}&sort=pushed&type=owner`,
    );
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos;
}

export async function getReadme(owner, repo) {
  return request(`${API}/repos/${owner}/${repo}/readme`, {
    accept: "application/vnd.github.raw",
    allow404: true,
  });
}

export async function getLanguages(owner, repo) {
  return (await request(`${API}/repos/${owner}/${repo}/languages`, { allow404: true })) ?? {};
}

/** 기본 브랜치의 전체 파일 트리. 너무 큰 레포는 truncated 플래그가 붙는다. */
export async function getTree(owner, repo, branch) {
  const data = await request(
    `${API}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { allow404: true },
  );
  if (!data) return { paths: [], truncated: false };
  const paths = (data.tree ?? []).filter((n) => n.type === "blob").map((n) => n.path);
  return { paths, truncated: Boolean(data.truncated) };
}

/**
 * 동기화 봇이 만든 커밋을 건너뛰고, 사람이 마지막으로 커밋한 시각을 찾는다.
 *
 * 포트폴리오 레포 자신을 분석 대상에 포함하면, 스케줄러가 데이터를 push 할 때마다
 * pushed_at 이 갱신되어 다음 실행에서 또 "변경됨"으로 판정되는 자기 참조 루프가 생긴다.
 * 봇 커밋을 제외한 시각을 기준으로 삼으면 루프가 끊긴다.
 */
export async function getLastHumanCommitDate(owner, repo, botName) {
  const commits = await request(`${API}/repos/${owner}/${repo}/commits?per_page=50`, {
    allow404: true,
  });
  if (!Array.isArray(commits)) return null;

  for (const c of commits) {
    const author = c.commit?.author?.name ?? "";
    const committer = c.commit?.committer?.name ?? "";
    if (author === botName || committer === botName) continue;
    return c.commit?.committer?.date ?? c.commit?.author?.date ?? null;
  }
  return null;
}

export async function getFileContent(owner, repo, path, ref) {
  const url = `${API}/repos/${owner}/${repo}/contents/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
  return request(url, { accept: "application/vnd.github.raw", allow404: true });
}
