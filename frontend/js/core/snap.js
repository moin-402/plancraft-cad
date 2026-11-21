const SNAP_PIXELS = 10;   // how close (on screen) counts as "near"

// world: {x, y} in mm. Returns {x, y, kind} where kind is "endpoint" or "grid".
export function snapPoint(world, viewport, entities, gridStepMm) {
  // Convert the on-screen tolerance into millimetres at the current zoom.
  const toleranceMm = SNAP_PIXELS / viewport.scale;

  let best = null;
  let bestDistance = toleranceMm;

  for (const e of entities) {
    if (e.type !== "line") continue;
    const ends = [{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }];
    for (const p of ends) {
      const d = Math.hypot(p.x - world.x, p.y - world.y);
      if (d <= bestDistance) {
        bestDistance = d;
        best = { x: p.x, y: p.y, kind: "endpoint" };
      }
    }
  }
  if (best) return best;

  // Otherwise snap to the nearest grid point, rounded to whole mm.
  return {
    x: Math.round(Math.round(world.x / gridStepMm) * gridStepMm),
    y: Math.round(Math.round(world.y / gridStepMm) * gridStepMm),
    kind: "grid",
  };
}