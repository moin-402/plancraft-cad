// The drawing data. Real-world coordinates in INTEGER millimetres.
// Nothing in here knows about screens, pixels or zoom.

let entities = [];   // each: { id, type: "line", x1, y1, x2, y2 }
let nextId = 1;
const listeners = [];

export function getEntities() {
  return entities;   // read only: never change this array directly
}

// Call fn() whenever the drawing changes (used to redraw the screen).
export function subscribe(fn) {
  listeners.push(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

// Rule: coordinates are always stored as whole millimetres.
function toIntegerMm(entity) {
  const out = { ...entity };
  for (const key of ["x1", "y1", "x2", "y2"]) {
    if (key in out) out[key] = Math.round(out[key]);
  }
  return out;
}

export function addEntity(entity) {
  const stored = { ...toIntegerMm(entity), id: nextId++ };
  entities = [...entities, stored];   // new array each time
  notify();
  return stored;
}

// Used by undo/redo to put the drawing back to an earlier state.
export function setEntities(list) {
  entities = list;
  notify();
}