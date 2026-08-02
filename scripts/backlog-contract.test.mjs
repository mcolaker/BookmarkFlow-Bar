import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { validateBacklogText } from "./validate-backlog.mjs";

const backlog = readFileSync(new URL("../docs/backlog/OPEN_TASKS.md", import.meta.url), "utf8");

test("current canonical backlog is valid", () => {
  assert.deepEqual(validateBacklogText(backlog), []);
});

test("duplicate stable IDs fail closed", () => {
  const mutated = backlog.replace("BF-EXT-001", "BF-I18N-001");
  assert.ok(validateBacklogText(mutated).some((error) => error.includes("yinelenen görev kimliği")));
});

test("missing acceptance criteria fail closed", () => {
  const mutated = backlog.replace(/- Kabul kriteri: .+/u, "- Kabul ölçütü: kaldırıldı");
  assert.ok(validateBacklogText(mutated).some((error) => error.includes("'Kabul kriteri' alanı eksik")));
});

test("invalid status fails closed", () => {
  const mutated = backlog.replace("P1, DONE.", "P1, PARTIAL.");
  assert.ok(validateBacklogText(mutated).some((error) => error.includes("öncelik/durum biçimi geçersiz")));
});

test("active task cannot omit its next action", () => {
  const mutated = backlog.replace("P1, DONE.", "P1, OPEN.");
  assert.ok(validateBacklogText(mutated).some((error) => error.includes("doğrulanabilir sonraki adımı")));
});
