// Smallest box (in mm) containing every object, or null for an empty drawing.
export function drawingBounds(entities) {
  if (entities.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const include = (x, y) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };

  for (const e of entities) {
    if (e.type === "line" || e.type === "rect") {
      include(e.x1, e.y1);
      include(e.x2, e.y2);
    } else if (e.type === "circle") {
      include(e.cx - e.r, e.cy - e.r);
      include(e.cx + e.r, e.cy + e.r);
    }
  }
  return { minX, minY, maxX, maxY };
}