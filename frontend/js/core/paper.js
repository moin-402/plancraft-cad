// Paper sizes in millimetres, landscape. Matches the dropdown in index.html.
export const PAPER_SIZES_MM = {
  A4: { w: 297, h: 210 },
  A3: { w: 420, h: 297 },
  A2: { w: 594, h: 420 },
  A1: { w: 841, h: 594 },
};

// 1:100 means 1 mm on paper = 100 mm of real building. (Becomes selectable later.)
export const DRAWING_SCALE = 100;

// Size of the sheet in REAL-WORLD mm, or null for "freeform".
export function paperWorldSize(key) {
  const p = PAPER_SIZES_MM[key];
  if (!p) return null;
  return { w: p.w * DRAWING_SCALE, h: p.h * DRAWING_SCALE };
}