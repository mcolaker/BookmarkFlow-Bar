import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeBoundingBox,
  isWithinViewport,
  computeBoxIntersection,
  evaluateLayoutIntegrity,
  formatJevBoxPrompt,
  denormalizeJevBox,
  buildJevMultimodalPayload,
  evaluateVisualScreenshotWithJev,
  computeDesignGeometryMetrics,
  evaluateProactiveStitchBananaGate,
  buildJev360UnifiedPayload,
  evaluate360MultimodalWithJevOrClef,
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

test("denormalizeJevBox converts normalized 0..1 bounding box to pixel coordinates", () => {
  const jevBox = { top: 0.1, bottom: 0.7, left: 0.2, right: 0.5 };
  const viewport = { width: 1000, height: 500 };
  const pixelBox = denormalizeJevBox(jevBox, viewport, "menu-popover", "menu");

  assert.equal(pixelBox.id, "menu-popover");
  assert.equal(pixelBox.role, "menu");
  assert.equal(pixelBox.x, 200); // 0.2 * 1000
  assert.equal(pixelBox.y, 50);  // 0.1 * 500
  assert.equal(pixelBox.width, 300); // (0.5 - 0.2) * 1000
  assert.equal(pixelBox.height, 300); // (0.7 - 0.1) * 500
  assert.equal(pixelBox.right, 500);
  assert.equal(pixelBox.bottom, 350);
  assert.equal(pixelBox.visible, true);
});

test("buildJevMultimodalPayload sets up assets, box/noul questions, and danger zone headers", () => {
  const payloadData = buildJevMultimodalPayload({
    imageBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
    target: "spotlight search chip",
    assetUuid: "11111111-2222-3333-4444-555555555555",
  });

  assert.equal(payloadData.headers["TypeSafe-Danger-Zone-Images"], "true");
  assert.equal(payloadData.payload.model, "~typesafe/jev-latest");
  assert.ok(payloadData.payload.state.includes("11111111-2222-3333-4444-555555555555"));

  const asset = payloadData.payload.assets["11111111-2222-3333-4444-555555555555"];
  assert.ok(asset);
  assert.equal(asset.type, "image");
  assert.equal(asset.format, "png");
  assert.equal(asset.data_base64, "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB");

  assert.equal(payloadData.payload.questions.target_box.type, "box");
  assert.ok(payloadData.payload.questions.target_box.instructions.includes("spotlight search chip"));
  assert.equal(payloadData.payload.questions.is_visible.type, "noul");
});

test("evaluateVisualScreenshotWithJev parses simulated API response accurately", async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      model: "typesafe/jev-1.14-20261014",
      provider: "openrouter",
      answers: {
        target_box: {
          type: "box",
          box: { top: 0.2, bottom: 0.6, left: 0.1, right: 0.4 },
          confidence: 0.92,
        },
        is_visible: {
          type: "noul",
          noul: 0.95,
        },
      },
    }),
  });

  const res = await evaluateVisualScreenshotWithJev({
    imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
    target: "floating-bar",
    viewport: { width: 1000, height: 1000 },
    apiKey: "test-key-mock",
    fetchFn: mockFetch,
  });

  assert.equal(res.success, true);
  assert.equal(res.model, "typesafe/jev-1.14-20261014");
  assert.equal(res.confidence, 0.92);
  assert.equal(res.visible, true);
  assert.equal(res.visibilityProbability, 0.95);
  assert.deepEqual(res.pixelBox, {
    id: "floating-bar",
    role: "detected",
    parentId: "",
    x: 100,
    y: 200,
    width: 300,
    height: 400,
    right: 400,
    bottom: 600,
    visible: true,
  });
});

test("evaluateProactiveStitchBananaGate certifies studio_grade_glass_bento and triggers on plain vertical stack or asymmetry (BF-QA-010)", () => {
  const studioBoxes = [
    { id: "spotlight-modal", role: "dialog", x: 340, y: 150, width: 600, height: 420 },
    { id: "filter-chip-all", role: "tab", parentId: "spotlight-modal", x: 360, y: 220, width: 64, height: 28 },
    { id: "filter-chip-folders", role: "tab", parentId: "spotlight-modal", x: 432, y: 220, width: 84, height: 28 },
  ];
  const cleanGate = evaluateProactiveStitchBananaGate(studioBoxes, { viewport: { width: 1280, height: 800 } });
  assert.equal(cleanGate.triggerActive, false);
  assert.equal(cleanGate.studioGradeReady, true);
  assert.match(cleanGate.banner, /STUDIO_GRADE_GLASS_BENTO/u);

  const plainStackBoxes = [
    { id: "spotlight-modal", role: "dialog", x: 300, y: 100, width: 600, height: 500 }, // left=300, right=380 -> 80px asymmetry
    { id: "item-1", role: "button", parentId: "spotlight-modal", x: 320, y: 140, width: 200, height: 32 },
    { id: "item-2", role: "button", parentId: "spotlight-modal", x: 320, y: 180, width: 200, height: 32 },
    { id: "item-3", role: "button", parentId: "spotlight-modal", x: 320, y: 220, width: 200, height: 32 },
    { id: "item-4", role: "button", parentId: "spotlight-modal", x: 320, y: 260, width: 200, height: 32 },
  ];
  const triggeredGate = evaluateProactiveStitchBananaGate(plainStackBoxes, {
    viewport: { width: 1280, height: 800 },
    designScore: 1.9,
  });
  assert.equal(triggeredGate.triggerActive, true);
  assert.equal(triggeredGate.studioGradeReady, false);
  assert.ok(triggeredGate.reasons.length >= 3);
  assert.match(triggeredGate.banner, /GOOGLE STITCH \+ NANO BANANA PRO TETİKLEYİCİSİ: AKTİF/u);
});

test("evaluate360MultimodalWithJevOrClef executes single-pass 8-question inspection and automatically fails over to Clef (BF-QA-010)", async () => {
  const boxes = [
    { id: "spotlight-modal", role: "dialog", x: 340, y: 150, width: 600, height: 420 },
    { id: "filter-chip-all", role: "tab", parentId: "spotlight-modal", x: 360, y: 220, width: 64, height: 28 },
    { id: "filter-chip-folders", role: "tab", parentId: "spotlight-modal", x: 432, y: 220, width: 84, height: 28 },
  ];

  const payloadReq = buildJev360UnifiedPayload({
    imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
    boxes,
    activeLocale: "tr",
  });
  assert.equal(Object.keys(payloadReq.payload.questions).length, 8);
  assert.equal(payloadReq.payload.questions.visual_design_score.type, "score");
  assert.equal(payloadReq.payload.questions.screen_state.type, "choice");

  // Simulate primary JEV 1.14 HTTP 503 failure followed by successful Clef failover
  let callCount = 0;
  const mockFailoverFetch = async (_url, opts) => {
    callCount += 1;
    const body = JSON.parse(opts.body);
    if (callCount === 1) {
      assert.equal(body.model, "~typesafe/jev-latest");
      return { ok: false, status: 503, text: async () => "Service Unavailable" };
    }
    assert.equal(body.model, "microsoft/decision-1");
    return {
      ok: true,
      json: async () => ({
        model: "microsoft/decision-1",
        provider: "Clef-Failover",
        answers: {
          screen_state: { choice: "ready" },
          visual_design_score: { score: 3.85 },
          design_layout_harmony: { noul: 0.96 },
          design_color_contrast: { noul: 0.98 },
          design_primary_observation: { choice: "clean_balanced" },
          design_glass_bento_richness: { noul: 0.94 },
          animation_motion_health: { noul: 0.99 },
          i18n_raw_key_integrity: { noul: 0.99 },
        },
      }),
    };
  };

  const res = await evaluate360MultimodalWithJevOrClef({
    imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
    boxes,
    apiKey: "test-key",
    fetchFn: mockFailoverFetch,
  });

  assert.equal(callCount, 2);
  assert.equal(res.success, true);
  assert.equal(res.failoverUsed, true);
  assert.equal(res.model, "microsoft/decision-1");
  assert.equal(res.screenState, "ready");
  assert.equal(res.visualDesignScore, 3.85);
  assert.equal(res.layoutHarmony, true);
  assert.equal(res.colorContrast, true);
  assert.equal(res.stitchBananaGate.studioGradeReady, true);
});
