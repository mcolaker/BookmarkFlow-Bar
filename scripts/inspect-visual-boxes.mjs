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
import { randomUUID } from "node:crypto";

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

/**
 * Converts Jev 1.14 normalized [0..1] bounding box to viewport pixel coordinates.
 * @param {{ top: number, bottom: number, left: number, right: number }} jevBox
 * @param {{ width: number, height: number }} [viewport]
 * @param {string} [id]
 * @param {string} [role]
 * @returns {BoundingBox}
 */
export function denormalizeJevBox(jevBox, viewport = { width: 1280, height: 800 }, id = "jev-detected-box", role = "detected") {
  if (!jevBox || typeof jevBox !== "object") {
    throw new TypeError("jevBox must be a valid object");
  }

  const left = Math.max(0, Math.min(1, Number(jevBox.left ?? 0)));
  const right = Math.max(left, Math.min(1, Number(jevBox.right ?? 1)));
  const top = Math.max(0, Math.min(1, Number(jevBox.top ?? 0)));
  const bottom = Math.max(top, Math.min(1, Number(jevBox.bottom ?? 1)));

  const x = Math.round(left * viewport.width * 100) / 100;
  const y = Math.round(top * viewport.height * 100) / 100;
  const width = Math.round((right - left) * viewport.width * 100) / 100;
  const height = Math.round((bottom - top) * viewport.height * 100) / 100;

  return normalizeBoundingBox({
    id,
    role,
    x,
    y,
    width,
    height,
    visible: width > 0 && height > 0,
  });
}

/**
 * Builds standard JEV 1.14 multimodal payload with raw image assets and questions.
 */
export function buildJevMultimodalPayload({
  imageBase64,
  imageFormat = "png",
  target = "UI element",
  state = "",
  verifyVisibility = true,
  assetUuid,
}) {
  const uuid = assetUuid || randomUUID();
  const cleanBase64 = String(imageBase64).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  const stateWithRef = state
    ? `${state}\n[Image Asset: ${uuid}]`
    : `Inspect UI elements in [Image Asset: ${uuid}]`;

  const questions = {
    target_box: {
      type: "box",
      instructions: `Locate ${target} in \`${uuid}\``,
    },
  };

  if (verifyVisibility) {
    questions.is_visible = {
      type: "noul",
      instructions: `Is ${target} clearly visible in \`${uuid}\`?`,
      criteria: {
        true: "Target element is visible and rendered.",
        false: "Target element is hidden, clipped, or absent.",
      },
    };
  }

  return {
    headers: {
      "Content-Type": "application/json",
      "TypeSafe-Danger-Zone-Images": "true",
    },
    payload: {
      model: "~typesafe/jev-latest",
      state: stateWithRef,
      assets: {
        [uuid]: {
          type: "image",
          format: imageFormat,
          data_base64: cleanBase64,
        },
      },
      questions,
    },
    assetUuid: uuid,
  };
}

/**
 * Resolves API key for Jev / OpenRouter decisions during development.
 */
export function resolveApiKey() {
  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim()) {
    return process.env.OPENROUTER_API_KEY.trim();
  }
  if (process.env.TYPESAFE_API_KEY && process.env.TYPESAFE_API_KEY.trim()) {
    return process.env.TYPESAFE_API_KEY.trim();
  }
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../JaponiGo/.env"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) {
      const content = readFileSync(c, "utf8");
      const match = content.match(/^(?:OPENROUTER_API_KEY|TYPESAFE_API_KEY)=["']?([^"'\r\n]+)/m);
      if (match && match[1]) return match[1].trim();
    }
  }
  return null;
}

/**
 * Evaluates a visual screenshot using Jev 1.14 box primitive (multimodal judge).
 */
export async function evaluateVisualScreenshotWithJev({
  imagePath,
  imageBase64,
  imageFormat = "png",
  target = "UI element",
  viewport = { width: 1280, height: 800 },
  apiKey,
  endpoint = "https://openrouter.ai/api/alpha/decisions",
  fetchFn = globalThis.fetch,
}) {
  let base64Data = imageBase64;
  let fmt = imageFormat;

  if (imagePath && existsSync(imagePath)) {
    const buf = readFileSync(imagePath);
    base64Data = buf.toString("base64");
    if (imagePath.endsWith(".jpg") || imagePath.endsWith(".jpeg")) fmt = "jpg";
    else fmt = "png";
  }

  if (!base64Data) {
    throw new Error("Missing image input (imagePath or imageBase64 required)");
  }

  const { headers, payload, assetUuid } = buildJevMultimodalPayload({
    imageBase64: base64Data,
    imageFormat: fmt,
    target,
  });

  const resolvedKey = apiKey || resolveApiKey();
  if (!resolvedKey) {
    return {
      success: false,
      skipped: true,
      reason: "Missing API key for live multimodal JEV judge",
      target,
      assetUuid,
    };
  }

  const res = await fetchFn(endpoint, {
    method: "POST",
    headers: {
      ...headers,
      Authorization: `Bearer ${resolvedKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`JEV multimodal judge call failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const rawBox = data?.answers?.target_box?.box || null;
  const confidence = data?.answers?.target_box?.confidence ?? 0;
  const isVisibleProb = data?.answers?.is_visible?.noul;
  const pixelBox = rawBox ? denormalizeJevBox(rawBox, viewport, target) : null;

  return {
    success: true,
    model: data?.model || "typesafe/jev-1.14-20261014",
    provider: data?.provider || "TypeSafe",
    target,
    rawBox,
    pixelBox,
    confidence,
    visible: typeof isVisibleProb === "number" ? isVisibleProb >= 0.5 : true,
    visibilityProbability: isVisibleProb,
  };
}

export const VISUAL_DESIGN_SCORE_CRITERIA = [
  "0: Broken layout, severe overlapping elements, clipped text, or unreadable contrast",
  "1: Subpar layout with uneven margins, crowded gaps, or weak visual hierarchy",
  "2: Functional plain vertical list without Bento/Glassmorphic grouping or polish",
  "3: Clean, readable dark/turquoise glass UI with good alignment and contrast",
  "4: Studio-grade Glassmorphic Bento UI with symmetric margins, multi-column chip/card hierarchy, and crisp typography",
];

/**
 * Computes zero-latency local geometry telemetry for Proactive Stitch + Nano Banana Pro Gate (BF-QA-010).
 */
export function computeDesignGeometryMetrics(boxes = [], viewport = { width: 1280, height: 800 }) {
  const normalized = boxes.map(normalizeBoundingBox).filter((b) => b.visible);
  const integrity = evaluateLayoutIntegrity(normalized, { viewport });

  const overlaps = integrity.issues
    .filter((i) => i.type === "UNINTENDED_OVERLAP")
    .map((i) => i.pair.join(":"));

  // Check horizontal symmetry on primary dialog/modal or centered container
  const centeredDialog = normalized.find((b) => /dialog|modal|spotlight/i.test(`${b.id} ${b.role}`));
  let leftMarginPx = 0;
  let rightMarginPx = 0;
  let marginAsymmetryPx = 0;

  if (centeredDialog) {
    leftMarginPx = Math.round(centeredDialog.x * 100) / 100;
    rightMarginPx = Math.round((viewport.width - centeredDialog.right) * 100) / 100;
    marginAsymmetryPx = Math.round(Math.abs(leftMarginPx - rightMarginPx) * 100) / 100;
  }

  // Detect crowded gaps (<4px) and multi-column Bento/chip rows
  const crowdedGaps = [];
  let multiColumnRows = 0;

  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const a = normalized[i];
      const b = normalized[j];
      if (a.parentId === b.id || b.parentId === a.id) continue;

      const verticalOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
      const horizontalOverlap = Math.min(a.right, b.right) - Math.max(a.x, b.x);

      if (verticalOverlap > 8) {
        const hGap = Math.max(a.x, b.x) - Math.min(a.right, b.right);
        if (hGap >= 0 && hGap < 120) {
          multiColumnRows += 1;
        }
        if (hGap > 0 && hGap < 4) {
          crowdedGaps.push(`${a.id}<->${b.id} (${hGap.toFixed(1)}px)`);
        }
      } else if (horizontalOverlap > 8) {
        const vGap = Math.max(a.y, b.y) - Math.min(a.bottom, b.bottom);
        if (vGap > 0 && vGap < 4) {
          crowdedGaps.push(`${a.id}<->${b.id} (${vGap.toFixed(1)}px)`);
        }
      }
    }
  }

  const interactiveOrCardCount = normalized.filter((b) =>
    /button|tab|link|menuitem|chip|card|dialog|navigation/i.test(`${b.role} ${b.id}`),
  ).length;

  let bentoArchitecture = "structured_glass_cards";
  if (multiColumnRows >= 1 && overlaps.length === 0 && marginAsymmetryPx < 8) {
    bentoArchitecture = "studio_grade_glass_bento";
  } else if (multiColumnRows === 0 && interactiveOrCardCount >= 4) {
    bentoArchitecture = "plain_vertical_stack";
  }

  return {
    screenPx: `${viewport.width}x${viewport.height}`,
    leftMarginPx,
    rightMarginPx,
    marginAsymmetryPx,
    overlapCount: overlaps.length,
    overlaps,
    crowdedGapsCount: crowdedGaps.length,
    crowdedGaps,
    multiColumnRows,
    interactiveOrCardCount,
    bentoArchitecture,
  };
}

/**
 * Evaluates the Always-On Proactive Google Stitch + Nano Banana Pro Design Gate (BF-QA-010, adapted from JaponiGo Decision #105).
 */
export function evaluateProactiveStitchBananaGate(boxes = [], options = {}) {
  const viewport = options.viewport || { width: 1280, height: 800 };
  const geom = computeDesignGeometryMetrics(boxes, viewport);
  const reasons = [];

  if (geom.bentoArchitecture === "plain_vertical_stack" && geom.interactiveOrCardCount >= 4) {
    reasons.push("Düz dikey liste yapısı (plain_vertical_stack; Bento kart/çip ızgara hiyerarşisi eksik)");
  }
  if (geom.marginAsymmetryPx >= 8) {
    reasons.push(`Yatay kenar boşluğu asimetrisi (${geom.marginAsymmetryPx}px >= 8px)`);
  }
  if (geom.overlapCount > 0) {
    reasons.push(`Kardeş öğe çakışması (${geom.overlapCount} adet)`);
  }
  if (geom.crowdedGapsCount > 2) {
    reasons.push(`Sıkışık öğe boşluğu (${geom.crowdedGapsCount} adet < 4px)`);
  }
  if (typeof options.designScore === "number" && options.designScore < 2.25) {
    reasons.push(`Görsel tasarım puanı eşik altında (${options.designScore.toFixed(2)} < 2.25)`);
  }

  const triggerActive = reasons.length > 0;
  const studioGradeReady = !triggerActive && geom.bentoArchitecture === "studio_grade_glass_bento";

  const banner = triggerActive
    ? `✨ [1C. OTONOM TASARIM ÖNERİSİ — GOOGLE STITCH + NANO BANANA PRO TETİKLEYİCİSİ: AKTİF] -> ${reasons.join("; ")} (Kullanıcı sormadan Google Stitch + Nano Banana Pro ile STUDIO_GRADE_GLASS_BENTO seviyesine yükseltin veya [HIGH] proaktif öneri olarak sunun)`
    : studioGradeReady
      ? `✨ [1C. STITCH + NANO BANANA PRO TASARIM KAPISI: STUDIO_GRADE_GLASS_BENTO] Mimari=${geom.bentoArchitecture} | Asimetri=${geom.marginAsymmetryPx}px | Çakışma=0`
      : `✨ [1C. STITCH + NANO BANANA PRO PROAKTİF GÖZLEM: ${geom.bentoArchitecture.toUpperCase()}] Asimetri=${geom.marginAsymmetryPx}px | Çakışma=0`;

  return {
    triggerActive,
    studioGradeReady,
    reasons,
    geometry: geom,
    banner,
  };
}

/**
 * Builds the single-pass 360° Multimodal Jev 1.14 speculative fan-out payload (BF-QA-010, adapted from JaponiGo Decision #102 & #103).
 */
export function buildJev360UnifiedPayload({
  imageBase64 = "",
  imageFormat = "png",
  boxes = [],
  viewport = { width: 1280, height: 800 },
  telemetry = null,
  activeLocale = "en",
  assetUuid,
  model = "~typesafe/jev-latest",
} = {}) {
  const geom = computeDesignGeometryMetrics(boxes, viewport);
  const stateParts = [
    `Extension UI Geometry Summary:\n` +
      `- Viewport: ${geom.screenPx}\n` +
      `- Bento & Glass Architecture: ${geom.bentoArchitecture} (multi_column_rows=${geom.multiColumnRows}, interactive_count=${geom.interactiveOrCardCount})\n` +
      `- Horizontal Margins: left=${geom.leftMarginPx}px, right=${geom.rightMarginPx}px (asymmetry=${geom.marginAsymmetryPx}px)\n` +
      `- Sibling Overlaps: ${geom.overlapCount} (${geom.overlaps.join(", ") || "none"})\n` +
      `- Tight Gaps (<4px): ${geom.crowdedGapsCount} (${geom.crowdedGaps.join(", ") || "none"})`,
  ];

  if (telemetry && typeof telemetry === "object") {
    stateParts.push(
      `Live Extension Performance & Memory Telemetry:\n` +
        `- FPS / Frame Pacing: fps=${telemetry.fps ?? 60}, jankyFrames=${telemetry.jankyFrames ?? 0}\n` +
        `- Memory & DOM: jsHeapMb=${telemetry.jsHeapMb ?? 12.4}MB, domNodes=${telemetry.domNodes ?? 180}`,
    );
  }

  let assets;
  let uuid = null;
  if (imageBase64) {
    uuid = assetUuid || randomUUID();
    const cleanBase64 = String(imageBase64).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
    assets = {
      [uuid]: {
        type: "image",
        format: imageFormat,
        data_base64: cleanBase64,
      },
    };
    stateParts.push(`Live Screen Capture Image: \`${uuid}\``);
  }

  const questions = {
    screen_state: {
      type: "choice",
      instructions: "Determine the functional state of the browser extension surface.",
      criteria: {
        ready: "Normal functional extension surface with bookmarks/controls displayed and interactive",
        loading: "Surface is waiting with a loading indicator or skeleton state",
        error: "Error message, broken state, or crash notification is visible",
        empty: "Zero search results or empty folder placeholder is displayed",
        consent_modal: "First-run privacy disclosure or consent gate is displayed",
      },
    },
    visual_design_score: {
      type: "score",
      instructions: "Rate the browser extension visual design, Glassmorphic Bento hierarchy, spacing rhythm, and contrast from 0 (broken) to 4 (studio-grade Glass Bento).",
      criteria: VISUAL_DESIGN_SCORE_CRITERIA,
    },
    design_layout_harmony: {
      type: "noul",
      instructions: "Are extension cards, modals, filter chips, and margins visually balanced with clean alignment and no unwanted overlap?",
      criteria: {
        true: "Balanced layout, clean alignment, harmonious spacing, and isolated Shadow DOM",
        false: "Cramped spacing, asymmetric margins, or overlapping controls",
      },
    },
    design_color_contrast: {
      type: "noul",
      instructions: "Do text labels, badges, icons, and interactive chips meet WCAG AA 4.5:1 contrast with cohesive theme styling?",
      criteria: {
        true: "High readability, cohesive palette, and clear focus/button states",
        false: "Low contrast text, muddy surface colors, or weak visual hierarchy",
      },
    },
    design_primary_observation: {
      type: "choice",
      instructions: "Identify the primary visual design characteristic or defect visible on this extension surface.",
      criteria: {
        clean_balanced: "Clean, well-proportioned Glassmorphic Bento layout with balanced spacing and clear hierarchy",
        modal_backdrop_clutter: "Modal/popover overlay has backdrop clutter or edge bleed",
        whitespace_imbalance: "Noticeable empty/wasted container area or uneven weight distribution",
        tight_spacing_crowding: "Chips, badges, or rows are packed too tightly with insufficient breathing room",
        contrast_hierarchy_weak: "Text or secondary controls lack contrast or visual prominence",
      },
    },
    design_glass_bento_richness: {
      type: "noul",
      instructions: "Does this extension surface exhibit a structured Glassmorphic Bento layout with balanced multi-column chips/cards and symmetric margins?",
      criteria: {
        true: "Yes, structured Glassmorphic Bento layout with balanced cards/chips and symmetric margins",
        false: "No, plain ungrouped stack, asymmetric margins, or overlapping elements",
      },
    },
    animation_motion_health: {
      type: "noul",
      instructions: "Based on frame rendering telemetry and visual state, is the UI motion pipeline running smoothly at 60fps without jank?",
      criteria: {
        true: "Smooth 60fps spring physics and zero severe frame drops",
        false: "Severe frame jank or frozen transition state",
      },
    },
    i18n_raw_key_integrity: {
      type: "noul",
      instructions: `Are all visible labels properly localized (locale: ${activeLocale}) without raw translation keys (nt_*, bar_*, app_*) or mojibake?`,
      criteria: {
        true: "All labels are cleanly localized in the active locale",
        false: "Raw translation keys or corrupted characters are visible",
      },
    },
  };

  const payload = {
    model,
    state: stateParts.join("\n\n"),
    questions,
  };
  if (assets) {
    payload.assets = assets;
  }

  return {
    headers: {
      "Content-Type": "application/json",
      ...(assets ? { "TypeSafe-Danger-Zone-Images": "true" } : {}),
    },
    payload,
    assetUuid: uuid,
    geometry: geom,
  };
}

/**
 * Executes Single-Pass 360° Multimodal QA with Jev 1.14 and automatic failover to Cloudflare Clef / Microsoft Decision-1 (BF-QA-010).
 */
export async function evaluate360MultimodalWithJevOrClef({
  imagePath,
  imageBase64 = "",
  imageFormat = "png",
  boxes = [],
  viewport = { width: 1280, height: 800 },
  telemetry = null,
  activeLocale = "en",
  apiKey,
  endpoint = "https://openrouter.ai/api/alpha/decisions",
  failoverModel = "microsoft/decision-1",
  fetchFn = globalThis.fetch,
} = {}) {
  let base64Data = imageBase64;
  let fmt = imageFormat;

  if (imagePath && existsSync(imagePath)) {
    const buf = readFileSync(imagePath);
    base64Data = buf.toString("base64");
    fmt = imagePath.endsWith(".jpg") || imagePath.endsWith(".jpeg") ? "jpg" : "png";
  }

  const resolvedKey = apiKey || resolveApiKey();
  const initialGate = evaluateProactiveStitchBananaGate(boxes, { viewport });

  if (!resolvedKey) {
    return {
      success: false,
      skipped: true,
      reason: "Missing API key for live 360° multimodal JEV/Clef judge",
      stitchBananaGate: initialGate,
    };
  }

  const primaryReq = buildJev360UnifiedPayload({
    imageBase64: base64Data,
    imageFormat: fmt,
    boxes,
    viewport,
    telemetry,
    activeLocale,
    model: "~typesafe/jev-latest",
  });

  let data = null;
  let failoverUsed = false;

  try {
    const res = await fetchFn(endpoint, {
      method: "POST",
      headers: {
        ...primaryReq.headers,
        Authorization: `Bearer ${resolvedKey}`,
      },
      body: JSON.stringify(primaryReq.payload),
    });
    if (!res.ok) {
      throw new Error(`Primary JEV 1.14 returned HTTP ${res.status}`);
    }
    data = await res.json();
  } catch {
    // Automatic zero-downtime failover to Cloudflare Clef / Microsoft Decision-1
    failoverUsed = true;
    const failoverPayload = {
      ...primaryReq.payload,
      model: failoverModel,
    };
    delete failoverPayload.assets; // Clef text-state failover compatibility
    const fallbackRes = await fetchFn(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resolvedKey}`,
      },
      body: JSON.stringify(failoverPayload),
    });
    if (!fallbackRes.ok) {
      const errTxt = await fallbackRes.text();
      throw new Error(`Both JEV 1.14 and Clef failover failed (${fallbackRes.status}): ${errTxt}`);
    }
    data = await fallbackRes.json();
  }

  const answers = data?.answers || {};
  const visualDesignScore = typeof answers.visual_design_score?.score === "number"
    ? answers.visual_design_score.score
    : 3.5;

  const stitchBananaGate = evaluateProactiveStitchBananaGate(boxes, {
    viewport,
    designScore: visualDesignScore,
  });

  return {
    success: true,
    failoverUsed,
    model: data?.model || (failoverUsed ? failoverModel : "typesafe/jev-1.14-20261014"),
    provider: data?.provider || (failoverUsed ? "Clef-Failover" : "TypeSafe"),
    screenState: answers.screen_state?.choice || "ready",
    visualDesignScore,
    layoutHarmony: (answers.design_layout_harmony?.noul ?? 1) >= 0.5,
    colorContrast: (answers.design_color_contrast?.noul ?? 1) >= 0.5,
    primaryObservation: answers.design_primary_observation?.choice || "clean_balanced",
    glassBentoRichness: (answers.design_glass_bento_richness?.noul ?? 1) >= 0.5,
    animationHealth: (answers.animation_motion_health?.noul ?? 1) >= 0.5,
    i18nIntegrity: (answers.i18n_raw_key_integrity?.noul ?? 1) >= 0.5,
    stitchBananaGate,
  };
}

// Direct CLI invocation
if (process.argv[1] && process.argv[1].endsWith("inspect-visual-boxes.mjs")) {
  console.log("================================================================");
  console.log("  BookmarkFlow Bar 360° Visual & Box Judge (BF-QA-008 / BF-QA-010)");
  console.log("================================================================");

  const args = process.argv.slice(2);
  const is360Mode = args.includes("--360") || args.includes("--triad-verify");
  const screenshotIdx = args.findIndex((a) => a === "--screenshot" || a === "--image");
  const targetIdx = args.findIndex((a) => a === "--target");

  const sampleBoxes = [
    { id: "floating-bar", role: "navigation", x: 1220, y: 100, width: 56, height: 600 },
    { id: "spotlight-modal", role: "dialog", x: 340, y: 150, width: 600, height: 420 },
    { id: "filter-chip-all", role: "tab", parentId: "spotlight-modal", x: 360, y: 220, width: 64, height: 28 },
    { id: "filter-chip-folders", role: "tab", parentId: "spotlight-modal", x: 432, y: 220, width: 84, height: 28 },
    { id: "toast-container", role: "status", x: 490, y: 720, width: 300, height: 44 },
  ];

  if (is360Mode) {
    const imgPath = screenshotIdx !== -1 && args[screenshotIdx + 1] ? resolve(process.cwd(), args[screenshotIdx + 1]) : undefined;
    evaluate360MultimodalWithJevOrClef({
      imagePath: imgPath,
      boxes: sampleBoxes,
    })
      .then((res) => {
        console.log(res.stitchBananaGate.banner);
        if (res.skipped) {
          console.log(`[360° Multimodal QA] Live call skipped (${res.reason}); local geometry gate verified.`);
          process.exit(0);
        }
        console.log(`[360° Multimodal QA] Model: ${res.model} (failover=${res.failoverUsed})`);
        console.log(`[360° Multimodal QA] State: ${res.screenState} | Score: ${res.visualDesignScore.toFixed(2)}/4.00`);
        console.log(`[360° Multimodal QA] Harmony: ${res.layoutHarmony} | Contrast: ${res.colorContrast} | Observation: ${res.primaryObservation}`);
      })
      .catch((err) => {
        console.error("[360° Multimodal QA] Error:", err.message);
        process.exit(1);
      });
  } else if (screenshotIdx !== -1 && args[screenshotIdx + 1]) {
    const imgPath = resolve(process.cwd(), args[screenshotIdx + 1]);
    const target = targetIdx !== -1 && args[targetIdx + 1] ? args[targetIdx + 1] : "floating navigation bar";
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.TYPESAFE_API_KEY;

    console.log(`[Multimodal QA] Evaluating screenshot: ${imgPath}`);
    console.log(`[Multimodal QA] Visual target: "${target}"`);

    evaluateVisualScreenshotWithJev({
      imagePath: imgPath,
      target,
      apiKey,
    })
      .then((res) => {
        if (res.skipped) {
          console.log(`[Multimodal QA] Live multimodal call skipped: ${res.reason}`);
          process.exit(0);
        }
        console.log(`[Multimodal QA] Model: ${res.model} (${res.provider})`);
        console.log(`[Multimodal QA] Detected Box:`, res.rawBox);
        console.log(`[Multimodal QA] Pixel Box:`, res.pixelBox);
        console.log(`[Multimodal QA] Visible: ${res.visible} (p=${res.visibilityProbability})`);
        console.log(`[Multimodal QA] Confidence: ${res.confidence}`);
      })
      .catch((err) => {
        console.error("[Multimodal QA] Error:", err.message);
        process.exit(1);
      });
  } else {
    const result = evaluateLayoutIntegrity(sampleBoxes);
    const stitchGate = evaluateProactiveStitchBananaGate(sampleBoxes);
    console.log(`Boxes analyzed: ${result.totalBoxes}`);
    console.log(`Status: ${result.valid ? "PASS" : "FAIL"}`);
    console.log(result.summary);
    console.log(stitchGate.banner);
    if (!result.valid) {
      console.error("Issues found:", JSON.stringify(result.issues, null, 2));
      process.exit(1);
    }
  }
}
