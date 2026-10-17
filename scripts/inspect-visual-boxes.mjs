#!/usr/bin/env node
/**
 * scripts/inspect-visual-boxes.mjs
 * 
 * Bounding-Box Destekli Görsel Regresyon Hakemi (BF-QA-008)
 * 
 * Jev 1.14 ve Clef vizyon/kutulama mimarisinden ilham alarak:
 * Arayüz elemanlarının (kayan çubuk, arama çipleri, spotlight, toast, klasör menüsü)
 * sınırlayıcı kutularını (bounding box: x, y, width, height) piksel düzeyinde denetler;
 * viewport taşmalarını, eleman çakışmalarını, a11y asgari dokunma hedeflerini
 * ve hizalama bütünlüğünü otonom olarak doğrular.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Standardize visual bounding box representation.
 * @typedef {Object} BoundingBox
 * @property {string} id - Unique identifier or selector of element
 * @property {string} role - ARIA role or component role
 * @property {number} x - Horizontal coordinate (px)
 * @property {number} y - Vertical coordinate (px)
 * @property {number} width - Element width (px)
 * @property {number} height - Element height (px)
 * @property {number} [right] - x + width
 * @property {number} [bottom] - y + height
 * @property {boolean} [visible] - Whether element is rendered
 */

/**
 * Normalizes and validates raw box coordinates.
 */
export function normalizeBoundingBox(rawBox) {
  if (!rawBox || typeof rawBox !== "object") {
    throw new TypeError("Bounding box must be a valid object");
  }

  const id = String(rawBox.id || rawBox.selector || "unknown-box");
  const role = String(rawBox.role || rawBox.tagName || "generic");
  const parentId = rawBox.parentId ? String(rawBox.parentId) : "";
  const x = Number(rawBox.x ?? rawBox.left ?? 0);
  const y = Number(rawBox.y ?? rawBox.top ?? 0);
  const width = Math.max(0, Number(rawBox.width ?? 0));
  const height = Math.max(0, Number(rawBox.height ?? 0));
  const visible = rawBox.visible !== false && width > 0 && height > 0;

  return {
    id,
    role,
    parentId,
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
    right: Math.round((x + width) * 100) / 100,
    bottom: Math.round((y + height) * 100) / 100,
    visible,
  };
}

/**
 * Checks whether a bounding box is strictly contained within viewport boundaries.
 */
export function isWithinViewport(box, viewport = { width: 1280, height: 800 }) {
  const norm = normalizeBoundingBox(box);
  if (!norm.visible) return true; // hidden boxes do not overflow

  const fitsHorizontally = norm.x >= 0 && norm.right <= viewport.width;
  const fitsVertically = norm.y >= 0 && norm.bottom <= viewport.height;

  return {
    valid: fitsHorizontally && fitsVertically,
    overflowLeft: Math.max(0, -norm.x),
    overflowRight: Math.max(0, norm.right - viewport.width),
    overflowTop: Math.max(0, -norm.y),
    overflowBottom: Math.max(0, norm.bottom - viewport.height),
    box: norm,
  };
}

/**
 * Computes intersection rectangle and area between two bounding boxes.
 */
export function computeBoxIntersection(boxA, boxB) {
  const a = normalizeBoundingBox(boxA);
  const b = normalizeBoundingBox(boxB);

  if (!a.visible || !b.visible) {
    return { intersects: false, area: 0 };
  }

  const intersectLeft = Math.max(a.x, b.x);
  const intersectTop = Math.max(a.y, b.y);
  const intersectRight = Math.min(a.right, b.right);
  const intersectBottom = Math.min(a.bottom, b.bottom);

  const width = Math.max(0, intersectRight - intersectLeft);
  const height = Math.max(0, intersectBottom - intersectTop);
  const area = width * height;

  return {
    intersects: area > 0,
    area,
    intersectionBox: area > 0 ? {
      x: intersectLeft,
      y: intersectTop,
      width,
      height,
    } : null,
  };
}

/**
 * Validates a list of UI elements against geometric regression rules:
 * 1. Viewport boundary confinement (no clipped elements).
 * 2. Minimum accessibility touch/click targets (WCAG 2.1 / 2.2 target size).
 * 3. Unintended overlap detection between sibling or distinct surface components.
 */
export function evaluateLayoutIntegrity(boxes, options = {}) {
  const viewport = options.viewport || { width: 1280, height: 800 };
  const minTargetSize = options.minTargetSize || 20; // px
  const allowedOverlaps = new Set(options.allowedOverlaps || []);

  const normalized = boxes.map(normalizeBoundingBox);
  const issues = [];

  // 1. Viewport Confinement Check
  for (const box of normalized) {
    const vpCheck = isWithinViewport(box, viewport);
    if (!vpCheck.valid) {
      issues.push({
        type: "VIEWPORT_OVERFLOW",
        severity: "CRITICAL",
        boxId: box.id,
        role: box.role,
        details: `Element overflows viewport boundaries (overflow: L=${vpCheck.overflowLeft}px, R=${vpCheck.overflowRight}px, T=${vpCheck.overflowTop}px, B=${vpCheck.overflowBottom}px)`,
        coordinates: box,
      });
    }

    // 2. Minimum Target Size Check for interactive roles
    const isInteractive = /button|tab|link|input|menuitem|chip/i.test(box.role);
    if (isInteractive && box.visible) {
      if (box.width < minTargetSize || box.height < minTargetSize) {
        issues.push({
          type: "INSUFFICIENT_TARGET_SIZE",
          severity: "HIGH",
          boxId: box.id,
          role: box.role,
          details: `Interactive element ${box.id} (${box.width}x${box.height}px) is below minimum recommended target size (${minTargetSize}px)`,
          coordinates: box,
        });
      }
    }
  }

  // 3. Collision / Overlap Check between distinct elements
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const a = normalized[i];
      const b = normalized[j];
      const pairKey1 = `${a.id}:${b.id}`;
      const pairKey2 = `${b.id}:${a.id}`;

      if (allowedOverlaps.has(pairKey1) || allowedOverlaps.has(pairKey2)) {
        continue;
      }

      if (a.parentId === b.id || b.parentId === a.id) {
        continue;
      }

      const intersection = computeBoxIntersection(a, b);
      if (intersection.intersects && intersection.area > 4) { // ignore 1-2px border touching
        issues.push({
          type: "UNINTENDED_OVERLAP",
          severity: "HIGH",
          pair: [a.id, b.id],
          area: intersection.area,
          details: `Elements '${a.id}' and '${b.id}' overlap unexpectedly by ${intersection.area.toFixed(1)} px²`,
          intersectionBox: intersection.intersectionBox,
        });
      }
    }
  }

  return {
    valid: issues.length === 0,
    totalBoxes: normalized.length,
    issueCount: issues.length,
    issues,
    summary: issues.length === 0
      ? `All ${normalized.length} bounding boxes strictly satisfy layout geometry and viewport rules.`
      : `Found ${issues.length} geometric visual regression issues across ${normalized.length} elements.`,
  };
}

/**
 * Formats a Jev 1.14 / Clef compliant bounding-box prompt descriptor.
 * Can be sent to multimodal LLM or Jev MCP (jev_check / jev_classify) for judge verdict.
 */
export function formatJevBoxPrompt(boxes, question = "Are UI elements properly laid out without clipping or unwanted overlap?") {
  const norm = boxes.map(normalizeBoundingBox);
  return {
    question,
    state: JSON.stringify({
      boxType: "jev-1.14-multimodal-geometry",
      elementCount: norm.length,
      boxes: norm.map((b) => ({
        label: b.id,
        role: b.role,
        coords: [b.x, b.y, b.right, b.bottom],
        dims: `${b.width}x${b.height}`,
      })),
    }),
    yes_means: "Layout is strictly intact without clipping or regression",
    no_means: "Layout suffers from visual overflow, clipping, or collision",
  };
}

// Direct CLI invocation
if (process.argv[1] && process.argv[1].endsWith("inspect-visual-boxes.mjs")) {
  console.log("================================================================");
  console.log("  BookmarkFlow Bar Visual Bounding-Box Judge (BF-QA-008)");
  console.log("================================================================");

  // Baseline standard components test
  const sampleBoxes = [
    { id: "floating-bar", role: "navigation", x: 1220, y: 100, width: 56, height: 600 },
    { id: "spotlight-modal", role: "dialog", x: 340, y: 150, width: 600, height: 420 },
    { id: "filter-chip-all", role: "tab", parentId: "spotlight-modal", x: 360, y: 220, width: 64, height: 28 },
    { id: "filter-chip-folders", role: "tab", parentId: "spotlight-modal", x: 432, y: 220, width: 84, height: 28 },
    { id: "toast-container", role: "status", x: 490, y: 720, width: 300, height: 44 },
  ];

  const result = evaluateLayoutIntegrity(sampleBoxes);
  console.log(`Boxes analyzed: ${result.totalBoxes}`);
  console.log(`Status: ${result.valid ? "PASS" : "FAIL"}`);
  console.log(result.summary);
  if (!result.valid) {
    console.error("Issues found:", JSON.stringify(result.issues, null, 2));
    process.exit(1);
  }
}
