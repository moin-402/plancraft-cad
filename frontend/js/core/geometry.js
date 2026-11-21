// Pure geometry on drawing objects. All numbers are real-world millimetres.

// Return a copy of the entity shifted by (dx, dy).
export function moveEntity(e, dx, dy) {
  const out = { ...e };
  if ("x1" in out) {
    out.x1 += dx; out.y1 += dy;
    out.x2 += dx; out.y2 += dy;
  }
  if ("cx" in out) {
    out.cx += dx; out.cy += dy;
  }
  return out;
}

// Distance from point p to the line segment a-b.
function distToSegment(p, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((p.x - ax) * dx + (p.y - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (ax + t * dx), p.y - (ay + t * dy));
}

export function rectCorners(e) {
  return [
    { x: e.x1, y: e.y1 }, { x: e.x2, y: e.y1 },
    { x: e.x2, y: e.y2 }, { x: e.x1, y: e.y2 },
  ];
}

// How far a point is from the OUTLINE of an entity (used for clicking on it).
export function distanceToEntity(e, p) {
  if (e.type === "line") {
    return distToSegment(p, e.x1, e.y1, e.x2, e.y2);
  }
  if (e.type === "rect") {
    const c = rectCorners(e);
    let best = Infinity;
    for (let i = 0; i < 4; i++) {
      const a = c[i];
      const b = c[(i + 1) % 4];
      best = Math.min(best, distToSegment(p, a.x, a.y, b.x, b.y));
    }
    return best;
  }
  if (e.type === "circle") {
    return Math.abs(Math.hypot(p.x - e.cx, p.y - e.cy) - e.r);
  }
  return Infinity;
}

// Points other tools can snap to: line ends, rectangle corners, circle centres.
export function snapPointsOf(e) {
  if (e.type === "line") return [{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }];
  if (e.type === "rect") return rectCorners(e);
  if (e.type === "circle") return [{ x: e.cx, y: e.cy }];
  return [];
}