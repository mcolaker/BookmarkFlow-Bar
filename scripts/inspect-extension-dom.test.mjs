import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeInspectionNode,
  flattenInspectionTree,
  getSampleExtensionDomTree,
  formatInspectionOutput,
  parseArgs,
  runCli,
} from "./inspect-extension-dom.mjs";

test("normalizeInspectionNode parses node attributes and children correctly", () => {
  const rawNode = {
    tagName: "BUTTON",
    attributes: {
      role: "tab",
      class: "bf-filter-chip is-active",
      "aria-selected": "true",
      tabindex: "0",
    },
    textContent: "  Tümü  ",
    children: [],
  };

  const normalized = normalizeInspectionNode(rawNode);
  assert.equal(normalized.tagName, "button");
  assert.equal(normalized.role, "tab");
  assert.equal(normalized.className, "bf-filter-chip is-active");
  assert.equal(normalized.ariaSelected, "true");
  assert.equal(normalized.tabindex, "0");
  assert.equal(normalized.text, "Tümü");
  assert.equal(normalized.childCount, 0);
});

test("flattenInspectionTree recursively flattens hierarchy with proper level indentation", () => {
  const sample = getSampleExtensionDomTree();
  const normalized = normalizeInspectionNode(sample);
  const flattened = flattenInspectionTree(normalized);

  assert.ok(flattened.length >= 7, "flattened list must contain root and nested elements");
  assert.equal(flattened[0].tagName, "div");
  assert.equal(flattened[0].level, 0);

  const commandChips = flattened.find((n) => n.className?.includes("bf-command-chips"));
  assert.ok(commandChips, "must find bf-command-chips");
  assert.equal(commandChips.role, "tablist");

  const activeChip = flattened.find((n) => n.className?.includes("bf-filter-chip is-active"));
  assert.ok(activeChip, "must find active chip");
  assert.equal(activeChip.role, "tab");
  assert.equal(activeChip.ariaSelected, "true");
  assert.equal(activeChip.tabindex, "0");
});

test("formatInspectionOutput supports table and json formats", () => {
  const sample = getSampleExtensionDomTree();
  const normalized = normalizeInspectionNode(sample);

  const tableOutput = formatInspectionOutput(normalized, "table");
  assert.match(tableOutput, /Fast Tree Inspector/u);
  assert.match(tableOutput, /button/u);
  assert.match(tableOutput, /tablist/u);

  const jsonOutput = formatInspectionOutput(normalized, "json");
  const parsed = JSON.parse(jsonOutput);
  assert.equal(parsed.tagName, "div");
  assert.ok(Array.isArray(parsed.children));
});

test("parseArgs handles flags and arguments deterministically", () => {
  const args = parseArgs(["--port", "9333", "--format", "json", "--mock"]);
  assert.equal(args.port, 9333);
  assert.equal(args.format, "json");
  assert.equal(args.mock, true);
});

test("runCli succeeds in mock / dry-run mode without external connection", async () => {
  const res = await runCli(["--mock", "--format", "json"]);
  assert.equal(res.ok, true);
  assert.ok(res.nodeCount > 0);
});
