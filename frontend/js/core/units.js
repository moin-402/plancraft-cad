// Internal unit: millimetres. Feet and inches exist only for DISPLAY and INPUT.

export const MM_PER_INCH = 25.4;
export const MM_PER_FOOT = 304.8;
const MM2_PER_SQFT = MM_PER_FOOT * MM_PER_FOOT;   // 92903.04

// How many screen pixels one mm is at "100% zoom" (a CSS inch is 96 px).
export const PX_PER_MM_AT_100 = 96 / MM_PER_INCH;

// 3810 (mm) -> 12' 6"     12.7 (mm) -> 0' 0 1/2"
// Rounds to the nearest 1/16 inch.
export function formatFeetInches(mm) {
  const sixteenths = Math.round((Math.abs(mm) / MM_PER_INCH) * 16);
  const sign = mm < 0 && sixteenths > 0 ? "-" : "";

  const feet = Math.floor(sixteenths / 192);   // 192 = 12 in * 16
  const rest = sixteenths % 192;
  const inches = Math.floor(rest / 16);

  let num = rest % 16;
  let den = 16;
  while (num > 0 && num % 2 === 0) { num /= 2; den /= 2; }  // 8/16 -> 1/2
  const fraction = num ? ` ${num}/${den}` : "";

  return `${sign}${feet}' ${inches}${fraction}"`;
}

// Area in square feet: 9290304 (mm2) -> "100.00 sq ft"
export function formatArea(mm2) {
  return `${(mm2 / MM2_PER_SQFT).toFixed(2)} sq ft`;
}

// Grid spacing label: 3048 -> 10'   76.2 -> 3"
export function formatGridStep(mm) {
  const inches = Math.round(mm / MM_PER_INCH);
  if (inches >= 12 && inches % 12 === 0) return `${inches / 12}'`;
  return `${inches}"`;
}

// ---------- Reading typed lengths ----------
// Accepted:  12'6"   12' 6 1/2"   12'   6"   12ft 6in
//            12 6 (feet inches)   12 (feet)   12.5 (feet)
//            3500mm   350cm   3.5m
// Returns whole millimetres, or null if the text can't be understood.

const NUM = "(\\d+(?:\\.\\d+)?)";
const METRIC = new RegExp(`^${NUM} ?(mm|cm|m)$`);
const EXPLICIT = new RegExp(`^(?:${NUM} ?(?:'|ft))? ?(?:${NUM}(?: (\\d+)/(\\d+))? ?(?:"|in))?$`);
const BARE = new RegExp(`^${NUM}(?: ${NUM}(?: (\\d+)/(\\d+))?)?$`);

function toMm(feet, inches, numer, denom) {
  const fraction = numer && Number(denom) !== 0 ? Number(numer) / Number(denom) : 0;
  return Math.round((feet * 12 + inches + fraction) * MM_PER_INCH);
}

export function parseLength(text) {
  const s = String(text).trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return null;

  let m = s.match(METRIC);
  if (m) {
    const factor = { mm: 1, cm: 10, m: 1000 }[m[2]];
    return Math.round(parseFloat(m[1]) * factor);
  }

  m = s.match(EXPLICIT);
  if (m && (m[1] || m[2])) {
    return toMm(parseFloat(m[1] || 0), parseFloat(m[2] || 0), m[3], m[4]);
  }

  m = s.match(BARE);
  if (m) {
    return toMm(parseFloat(m[1]), parseFloat(m[2] || 0), m[3], m[4]);
  }

  return null;
}

// "10 x 12"  or  "12'6\" x 10'"  ->  { w, h } in mm, or null.
export function parseSize(text) {
  const parts = String(text).trim().toLowerCase().split(/\s*[x×*,]\s*/);
  if (parts.length !== 2) return null;
  const w = parseLength(parts[0]);
  const h = parseLength(parts[1]);
  if (!w || !h || w <= 0 || h <= 0) return null;
  return { w, h };
}