import assert from "node:assert/strict";
import test from "node:test";

import {
  collectDcoRangeCommits,
  createDcoRevisionRange,
  hasValidDcoSignoff,
  validateDcoCommits,
} from "./validate-dco.mjs";

const baseSha = "a".repeat(40);
const headSha = "b".repeat(40);
const commitSha = "c".repeat(40);

test("a canonical DCO trailer is accepted", () => {
  assert.equal(hasValidDcoSignoff("Describe the change\n\nSigned-off-by: Random J Developer <random@developer.example.org>\n"), true);
});

test("a sign-off in the message body is not accepted as a trailer", () => {
  const message = "Signed-off-by: Random J Developer <random@developer.example.org>\n\nThis is still the body.";
  assert.equal(hasValidDcoSignoff(message), false);
});

test("a malformed sign-off email fails closed", () => {
  assert.equal(hasValidDcoSignoff("Describe the change\n\nSigned-off-by: Random J Developer <not-an-email>"), false);
});

test("all commits in a PR range require sign-offs", () => {
  const errors = validateDcoCommits([
    { sha: "d".repeat(40), message: "Signed commit\n\nSigned-off-by: Developer <developer@example.com>" },
    { sha: "e".repeat(40), message: "Unsigned commit" },
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^e{40}: missing a valid Signed-off-by:/u);
});

test("empty PR commit ranges fail closed", () => {
  assert.deepEqual(validateDcoCommits([]), ["DCO revision range contains no commits; base/head inputs may be incorrect."]);
});

test("base and head inputs must be full immutable commit SHAs", () => {
  assert.throws(() => createDcoRevisionRange("main", headSha), /full 40-character Git commit SHA/u);
  assert.throws(() => createDcoRevisionRange(baseSha, `${headSha} --help`), /full 40-character Git commit SHA/u);
  assert.throws(() => createDcoRevisionRange(baseSha, baseSha), /must identify different commits/u);
});

test("commit collection uses exactly the GitHub base..head range", () => {
  const calls = [];
  const git = (args) => {
    calls.push(args);
    if (args[0] === "rev-list") return commitSha;
    if (args[0] === "show") return "Change\n\nSigned-off-by: Developer <developer@example.com>";
    return "";
  };

  assert.deepEqual(collectDcoRangeCommits(baseSha, headSha, git), [
    { sha: commitSha, message: "Change\n\nSigned-off-by: Developer <developer@example.com>" },
  ]);
  assert.deepEqual(calls, [
    ["cat-file", "-e", `${baseSha}^{commit}`],
    ["cat-file", "-e", `${headSha}^{commit}`],
    ["rev-list", "--reverse", `${baseSha}..${headSha}`],
    ["show", "-s", "--format=%B", commitSha],
  ]);
});
