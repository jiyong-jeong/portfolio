import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { collectLocalContext, languageBytes, parseLsTree, resolveLocalRepo } from "./local-context.mjs";
import { createRedactor } from "./redact.mjs";

const ANALYSIS = {
  maxReadmeChars: 24000,
  maxDocChars: 6000,
  maxDocFiles: 6,
  maxManifestChars: 4000,
  maxTreeEntries: 250,
  excludePaths: ["node_modules/"],
};

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), "local-repo-"));
  const g = (...args) => execFileSync("git", ["-C", dir, ...args], { stdio: "ignore" });
  g("init", "-q", "-b", "main");
  mkdirSync(join(dir, "docs"));
  mkdirSync(join(dir, "node_modules"));
  writeFileSync(join(dir, "README.md"), "# demo\n담당자 kim@acme.co.kr, AcmePay 연동\n");
  writeFileSync(join(dir, "go.mod"), "module example.com/demo\n");
  writeFileSync(join(dir, "main.go"), "package main\n");
  writeFileSync(join(dir, "docs", "design.md"), "DB postgres://u:pw1234@db/x\n");
  writeFileSync(join(dir, "node_modules", "x.js"), "x");
  g("add", "-A");
  g("-c", "user.name=t", "-c", "user.email=t@test", "commit", "-q", "-m", "init");
  // 커밋 이후의 작업 트리 변경은 읽히면 안 된다
  writeFileSync(join(dir, "README.md"), "# uncommitted\n");
  return dir;
}

test("parseLsTree / languageBytes", () => {
  const entries = parseLsTree("100644 blob abc     120\tmain.go\n100644 blob def      30\tweb/app.tsx\n");
  assert.deepEqual(entries, [
    { path: "main.go", size: 120 },
    { path: "web/app.tsx", size: 30 },
  ]);
  assert.deepEqual(languageBytes(entries), { Go: 120, TypeScript: 30 });
});

test("커밋된 내용만 읽고, 마스킹을 적용하고, 레포 링크는 비운다", () => {
  const dir = makeRepo();
  const repo = resolveLocalRepo({ name: "demo", path: dir, ref: "main" });
  assert.equal(repo.local, true);
  assert.equal(repo.html_url, null);

  const ctx = collectLocalContext(repo, ANALYSIS, createRedactor({ replace: { AcmePay: "고객사A" }, deny: [] }));

  assert.match(ctx.readme, /^# demo/);
  assert.doesNotMatch(ctx.readme, /uncommitted|acme|AcmePay/i);
  assert.match(ctx.readme, /고객사A/);
  assert.ok(!ctx.tree.paths.some((p) => p.startsWith("node_modules/")));
  assert.deepEqual(
    ctx.files.map((f) => f.path),
    ["go.mod", "docs/design.md"],
  );
  assert.match(ctx.files[1].content, /\[REDACTED\]@db/);
  assert.equal(ctx.meta.url, null);
  assert.equal(ctx.meta.primaryLanguage, "Go");
});

test("경로가 없으면 에러", () => {
  assert.throws(() => resolveLocalRepo({ name: "x", path: "/nonexistent/path" }), /로컬 경로가 없습니다/);
});
