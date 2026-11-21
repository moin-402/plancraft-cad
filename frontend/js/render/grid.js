import { MM_PER_INCH } from "../core/units.js";

// Candidate spacings in inches: 1", 3", 6", 1', 2', 4', 10', 20', 50', 100'
const STEPS_INCHES = [1, 3, 6, 12, 24, 48, 120, 240, 600, 1200];
const MIN_PIXEL_GAP = 14;   // never draw lines closer than this
const MAJOR_EVERY = 4;      // every 4th line is darker

// Pick the smallest spacing whose lines are still comfortably apart on screen.
export function chooseGridStep(scale) {
  for (const inches of STEPS_INCHES) {
    const stepMm = inches * MM_PER_INCH;
    if (stepMm * scale >= MIN_PIXEL_GAP) return { stepMm, majorEvery: MAJOR_EVERY };
  }
  const last = STEPS_INCHES[STEPS_INCHES.length - 1] * MM_PER_INCH;
  return { stepMm: last, majorEvery: MAJOR_EVERY };
}

// Returns SVG path strings for the minor and major lines.
export function buildGridPaths(viewport, stepMm, majorEvery) {
  const r = viewport.visibleRect();
  let minor = "";
  let major = "";

  // Vertical lines
  const firstI = Math.ceil(r.minX / stepMm);
  const lastI = Math.floor(r.maxX / stepMm);
  for (let i = firstI; i <= lastI; i++) {
    const sx = Math.round(viewport.worldToScreenX(i * stepMm)) + 0.5;  // +0.5 = crisp 1px line
    const seg = `M${sx} 0V${viewport.height}`;
    if (i % majorEvery === 0) major += seg; else minor += seg;
  }

  // Horizontal lines
  const firstJ = Math.ceil(r.minY / stepMm);
  const lastJ = Math.floor(r.maxY / stepMm);
  for (let j = firstJ; j <= lastJ; j++) {
    const sy = Math.round(viewport.worldToScreenY(j * stepMm)) + 0.5;
    const seg = `M0 ${sy}H${viewport.width}`;
    if (j % majorEvery === 0) major += seg; else minor += seg;
  }

  return { minor, major };
}