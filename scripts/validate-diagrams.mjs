#!/usr/bin/env node
/**
 * data/projects/*.json 에 들어있는 Mermaid 소스가 실제로 파싱되는지 검사한다.
 * 사이트는 브라우저에서 다이어그램을 그리므로, jsdom 으로 최소한의 DOM 을 만들어
 * mermaid 의 파서를 그대로 돌린다.
 *
 *   node scripts/validate-diagrams.mjs
 *
 * 종료 코드 0 = 전부 통과, 1 = 파싱 실패한 다이어그램 있음.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { JSDOM } from "jsdom";

import { PROJECTS_DIR } from "./lib/config.mjs";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/",
});

// mermaid 는 브라우저 전역을 전제로 동작한다. import 전에 채워 넣는다.
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// Node 21+ 는 globalThis.navigator 가 getter 라 직접 대입할 수 없다.
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
  writable: true,
});
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.DOMPurify = undefined;
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const mermaid = (await import("mermaid")).default;
mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "base" });

const files = readdirSync(PROJECTS_DIR).filter((f) => f.endsWith(".json"));
let total = 0;
const failures = [];

for (const file of files) {
  const project = JSON.parse(readFileSync(join(PROJECTS_DIR, file), "utf8"));
  for (const [i, diagram] of (project.diagrams ?? []).entries()) {
    total += 1;
    try {
      await mermaid.parse(diagram.mermaid);
    } catch (err) {
      failures.push({
        slug: project.slug,
        index: i,
        title: diagram.title,
        message: String(err?.message ?? err).split("\n")[0],
      });
    }
  }
}

console.log(`검사한 다이어그램: ${total}개 (프로젝트 ${files.length}개)`);

if (failures.length === 0) {
  console.log("✓ 모든 다이어그램이 정상적으로 파싱됩니다.");
  process.exit(0);
}

console.log(`✗ 파싱 실패 ${failures.length}개\n`);
for (const f of failures) {
  console.log(`  - ${f.slug} [${f.index}] ${f.title}`);
  console.log(`    ${f.message}`);
}
process.exit(1);
