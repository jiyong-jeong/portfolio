import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { createRedactor, findDenied, loadLocalRules } from "./redact.mjs";

const redact = createRedactor();

// 키 모양의 픽스처는 시크릿 스캐너에 걸리지 않도록 실행 시점에 조립한다. 실제 값은 절대 넣지 않는다.
const FAKE_AWS_KEY = "AKIA" + "X".repeat(16);
const FAKE_GOOGLE_KEY = "AIza" + "x".repeat(35);

test("클라우드 키와 개인키를 가린다", () => {
  const out = redact(
    `AccessKey: "${FAKE_AWS_KEY}"\nkey=${FAKE_GOOGLE_KEY}\n-----BEGIN RSA PRIVATE KEY-----\nMIIE\n-----END RSA PRIVATE KEY-----`,
  );
  assert.doesNotMatch(out, /AKIA|AIza|MIIE/);
});

test("비밀값 할당은 가리고 환경변수 참조는 남긴다", () => {
  assert.equal(redact('password: "hunter2hunter2"'), 'password: "[REDACTED]"');
  assert.equal(redact('secret = "${JWT_SECRET}"'), 'secret = "${JWT_SECRET}"');
});

test("접속 문자열의 비밀번호만 가리고 템플릿 변수는 둔다", () => {
  assert.equal(redact("postgres://kyb:pw1234@db:5432/x"), "postgres://kyb:[REDACTED]@db:5432/x");
  assert.equal(redact("postgres://{cfg.user}:{cfg.password}@{cfg.host}"), "postgres://{cfg.user}:{cfg.password}@{cfg.host}");
});

test("이메일·전화번호·사설 IP·사업자번호를 가린다", () => {
  const out = redact("a.kim@corp.co.kr 010-1234-5678 host 10.1.2.3 사업자 123-45-67890");
  assert.equal(out, "user@example.com 010-0000-0000 host 10.0.0.0 사업자 000-00-00000");
});

test("예시용 이메일과 버전 문자열은 건드리지 않는다", () => {
  assert.equal(redact("admin@example.com node 10.2.1"), "admin@example.com node 10.2.1");
});

test("로컬 규칙은 대소문자 무관, 긴 키부터 바꾼다", () => {
  const r = createRedactor({ replace: { "acme.co.kr": "example.com", "api.acme.co.kr": "api.example.com", AcmePay: "고객사A" }, deny: [] });
  assert.equal(r("https://API.acme.co.kr acmepay"), "https://api.example.com 고객사A");
});

test("로컬 규칙 파일이 없으면 빈 규칙, 있으면 replace 키가 deny 에 합쳐진다", () => {
  const dir = mkdtempSync(join(tmpdir(), "redact-"));
  assert.deepEqual(loadLocalRules(join(dir, "none.json")), { replace: {}, deny: [] });

  const file = join(dir, "rules.json");
  writeFileSync(file, JSON.stringify({ replace: { AcmePay: "고객사A" }, deny: ["acme.co.kr"] }));
  assert.deepEqual(loadLocalRules(file).deny.sort(), ["AcmePay", "acme.co.kr"].sort());
});

test("findDenied 는 중첩 값까지 대소문자 무관하게 찾는다", () => {
  const project = { summary: "결제 대행", highlights: ["ACMEPAY 연동"] };
  assert.deepEqual(findDenied(project, ["acmepay", "other"]), ["acmepay"]);
  assert.deepEqual(findDenied(project, []), []);
});
