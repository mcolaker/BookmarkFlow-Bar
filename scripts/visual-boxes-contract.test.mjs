import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeBoundingBox,
  isWithinViewport,
  computeBoxIntersection,
  evaluateLayoutIntegrity,
  formatJevBoxPrompt,
} from "./inspect-visual-boxes.mjs";

test("normalizeBoundingBox correctly normalizes standard coordinates and calculates right/bottom", () => {
  const raw = { id: "test-chip", role: "tab", x: 100, y: 150, width: 80, height: 32 };
  const norm = normalizeBoundingBox(raw);

  assert.equal(norm.id, "test-chip");
  assert.equal(norm.role, "tab");
  assert.equal(norm.x, 100);
  assert.equal(norm.y, 150);
  assert.equal(norm.width, 80);
  assert.equal(norm.height, 32);
  assert.equal(norm.right, 180);
  assert.equal(norm.bottom, 182);
  assert.equal(norm.visible, true);
});

test("isWithinViewport flags elements overflowing screen boundaries", () => {
  const viewport = { width: 1280, height: 800 };

  // Perfectly contained element
  const inside = { id: "spotlight", x: 300, y: 100, width: 600, height: 400 };
  const checkInside = isWithinViewport(inside, viewport);
  assert.equal(checkInside.valid, true);
  assert.equal(checkInside.overflowRight, 0);

  // Element clipped on right side
  const overflowRight = { id: "broken-bar", x: 1260, y: 50, width: 60, height: 500 };
  const checkRight = isWithinViewport(overflowRight, viewport);
  assert.equal(checkRight.valid, false);
  assert.equal(checkRight.overflowRight, 40); // 1320 - 1280 = 40px overflow

  // Element placed negatively (clipped on left)
  const overflowLeft = { id: "negative-peek", x: -10, y: 100, width: 20, height: 100 };
  const checkLeft = isWithinViewport(overflowLeft, viewport);
  assert.equal(checkLeft.valid, false);
  assert.equal(checkLeft.overflowLeft, 10);
});

test("computeBoxIntersection computes overlapping areas accurately", () => {
  const boxA = { id: "chip1", x: 100, y: 100, width: 50, height: 30 };
  const boxB = { id: "chip2", x: 130, y: 110, width: 50, height: 30 }; // overlaps from x:130 to 150 (20px), y:110 to 130 (20px)

  const intersection = computeBoxIntersection(boxA, boxB);
  assert.equal(intersection.intersects, true);
  assert.equal(intersection.area, 400); // 20 * 20 = 400 px²
  assert.deepEqual(intersection.intersectionBox, {
    x: 130,
    y: 110,
    width: 20,
    height: 20,
  });

  const boxDisjoint = { id: "disjoint", x: 200, y: 100, width: 50, height: 30 };
  const disjointCheck = computeBoxIntersection(boxA, boxDisjoint);
  assert.equal(disjointCheck.intersects, false);
  assert.equal(disjointCheck.area, 0);
});

test("evaluateLayoutIntegrity detects unhandled overlaps and insufficient target sizes", () => {
  const viewport = { width: 1280, height: 800 };
  const problematicLayout = [
    // Two overlapping buttons
    { id: "btn-save", role: "button", x: 200, y: 200, width: 100, height: 40 },
    { id: "btn-cancel", role: "button", x: 250, y: 210, width: 100, height: 40 },
    // Tiny tap target violating a11y standards
    { id: "tiny-icon", role: "button", x: 50, y: 50, width: 12, height: 12 },
  ];

  const evaluation = evaluateLayoutIntegrity(problematicLayout, { viewport, minTargetSize: 24 });
  assert.equal(evaluation.valid, false);
  assert.equal(evaluation.issueCount, 2);

  const overlapIssue = evaluation.issues.find((i) => i.type === "UNINTENDED_OVERLAP");
  assert.ok(overlapIssue);
  assert.deepEqual(overlapIssue.pair, ["btn-save", "btn-cancel"]);

  const sizeIssue = evaluation.issues.find((i) => i.type === "INSUFFICIENT_TARGET_SIZE");
  assert.ok(sizeIssue);
  assert.equal(sizeIssue.boxId, "tiny-icon");
});

test("formatJevBoxPrompt generates valid type-safe evaluation state for multimodal judge", () => {
  const boxes = [
    { id: "bar", role: "navigation", x: 0, y: 0, width: 50, height: 600 },
    { id: "modal", role: "dialog", x: 300, y: 100, width: 500, height: 400 },
  ];

  const prompt = formatJevBoxPrompt(boxes, "Is the modal free of bar obstruction?");
  assert.equal(prompt.question, "Is the modal free of bar obstruction?");
  assert.ok(prompt.state.includes("jev-1.14-multimodal-geometry"));
  assert.ok(prompt.yes_means.includes("strictly intact"));

  const parsed = JSON.parse(prompt.state);
  assert.equal(parsed.elementCount, 2);
  assert.equal(parsed.boxes[0].label, "bar");
  assert.deepEqual(parsed.boxes[0].coords, [0, 0, 50, 600]);
});
