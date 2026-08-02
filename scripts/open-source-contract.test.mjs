import assert from "node:assert/strict";
import test from "node:test";

import { readRepositoryTextFiles, validateOpenSourceFiles } from "./validate-open-source.mjs";

const repositoryFiles = readRepositoryTextFiles();

function withFile(path, mutate) {
  const files = new Map(repositoryFiles);
  files.set(path, mutate(files.get(path)));
  return files;
}

test("current open-source repository contract is valid", () => {
  assert.deepEqual(validateOpenSourceFiles(repositoryFiles), []);
});

test("missing governance files fail closed", () => {
  const errors = validateOpenSourceFiles(withFile("GOVERNANCE.md", () => null));
  assert.ok(errors.some((error) => error.includes("GOVERNANCE.md: required open-source file is missing or empty")));
});

test("Apache 2.0 text changes fail closed", () => {
  const errors = validateOpenSourceFiles(withFile("LICENSE.md", (text) => text.replace("royalty-free", "fee-bearing")));
  assert.ok(errors.some((error) => error.includes("exactly match the official Apache License 2.0 text")));
});

test("DCO 1.1 text changes fail closed", () => {
  const errors = validateOpenSourceFiles(withFile("DCO", (text) => text.replace("changing it is not allowed", "changing it is allowed")));
  assert.ok(errors.some((error) => error.includes("exactly match the official Developer Certificate of Origin 1.1 text")));
});

test("retired proprietary restrictions fail closed in active public docs", () => {
  const files = withFile("SUPPORT.md", (text) => `${text}\n\nProprietary Source-Available Notice\n`);
  const errors = validateOpenSourceFiles(files);
  assert.ok(errors.some((error) => error.includes("SUPPORT.md: retired proprietary source-available restriction")));
});

test("README license and governance links fail closed", () => {
  const files = withFile("README.md", (text) => text.replace("[NOTICE](NOTICE)", "NOTICE"));
  const errors = validateOpenSourceFiles(files);
  assert.ok(errors.some((error) => error.includes("README.md: required contract fragment is missing: [NOTICE](NOTICE)")));
});

test("CONTRIBUTING DCO instructions fail closed", () => {
  const files = withFile("CONTRIBUTING.md", (text) => text.replace("git commit -s", "git commit"));
  const errors = validateOpenSourceFiles(files);
  assert.ok(errors.some((error) => error.includes("CONTRIBUTING.md: required contract fragment is missing: git commit -s")));
});
