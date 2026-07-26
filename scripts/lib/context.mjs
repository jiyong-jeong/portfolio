import { getFileContent, getLanguages, getReadme, getTree } from "./github.mjs";

/** 기술 스택 판별에 도움이 되는 매니페스트/설정 파일들. 앞쪽일수록 우선순위가 높다. */
const MANIFEST_NAMES = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "go.mod",
  "Cargo.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "Gemfile",
  "composer.json",
  "hardhat.config.js",
  "hardhat.config.ts",
  "foundry.toml",
  "truffle-config.js",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "serverless.yml",
  "Chart.yaml",
  "kustomization.yaml",
  "kustomization.yml",
  "Jenkinsfile",
  "next.config.js",
  "next.config.ts",
  "nest-cli.json",
  "prisma/schema.prisma",
  "main.tf",
  "Makefile",
];

const DOC_EXCLUDE = /^(readme|license|licence|code_of_conduct|contributing|changelog)/i;

function pickManifests(paths, limit = 8) {
  const picked = [];
  for (const name of MANIFEST_NAMES) {
    if (picked.length >= limit) break;
    // 루트 우선, 없으면 얕은 depth 에서 첫 번째 매치를 사용한다.
    const exact = paths.find((p) => p === name);
    const nested = paths.find(
      (p) => p.endsWith(`/${name}`) && p.split("/").length <= 3 && !p.includes("node_modules/"),
    );
    const hit = exact ?? nested;
    if (hit && !picked.includes(hit)) picked.push(hit);
  }
  return picked;
}

function pickDocs(paths, limit) {
  return paths
    .filter((p) => /\.mdx?$/i.test(p))
    .filter((p) => !p.includes("node_modules/"))
    .filter((p) => !DOC_EXCLUDE.test(p.split("/").pop() ?? ""))
    .sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b))
    .slice(0, limit);
}

function truncate(text, max, label = "생략") {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n...(${label}: 전체 ${text.length}자 중 앞 ${max}자만 표시)`;
}

/** 하나의 레포에 대해 분석 프롬프트에 넣을 컨텍스트 묶음을 수집한다. */
export async function collectRepoContext(owner, repo, analysis) {
  const branch = repo.default_branch || "main";
  const [readme, languages, tree] = await Promise.all([
    getReadme(owner, repo.name).catch(() => null),
    getLanguages(owner, repo.name).catch(() => ({})),
    getTree(owner, repo.name, branch).catch(() => ({ paths: [], truncated: false })),
  ]);

  // 의존성·빌드 산출물·자동 생성 데이터는 트리에서 걸러낸다.
  // (포트폴리오 레포 자신처럼 생성물이 많은 경우 실제 소스가 묻히기 때문)
  const excludePaths = analysis.excludePaths ?? [];
  const paths = tree.paths.filter((p) => !excludePaths.some((prefix) => p.startsWith(prefix)));

  const manifestPaths = pickManifests(paths);
  const docPaths = pickDocs(paths, analysis.maxDocFiles);

  const files = [];
  for (const path of [...manifestPaths, ...docPaths]) {
    const content = await getFileContent(owner, repo.name, path, branch).catch(() => null);
    if (!content) continue;
    const isDoc = /\.mdx?$/i.test(path);
    files.push({
      path,
      content: truncate(content, isDoc ? analysis.maxDocChars : analysis.maxManifestChars),
    });
  }

  return {
    meta: {
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      homepage: repo.homepage,
      topics: repo.topics ?? [],
      primaryLanguage: repo.language,
      license: repo.license?.spdx_id ?? null,
      isFork: repo.fork,
      isArchived: repo.archived,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.subscribers_count ?? repo.watchers_count ?? 0,
      openIssues: repo.open_issues_count,
      sizeKb: repo.size,
      defaultBranch: branch,
      url: repo.html_url,
    },
    languages,
    tree: {
      truncated: tree.truncated,
      total: paths.length,
      paths: paths.slice(0, analysis.maxTreeEntries),
    },
    readme: truncate(readme ?? "", analysis.maxReadmeChars, "README 생략"),
    files,
  };
}
