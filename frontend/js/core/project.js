import { getEntities } from "./store.js";
import { PAPER_SIZES_MM } from "./paper.js";

export const FORMAT = "plancraft";
export const VERSION = 1;

// The fields each object type must have. Anything else in a file is ignored.
const FIELDS = {
  line: ["x1", "y1", "x2", "y2"],
  rect: ["x1", "y1", "x2", "y2"],
  circle: ["cx", "cy", "r"],
};

// Drawing -> text for a file.
export function serialize({ name, paperKey }) {
  return JSON.stringify(
    {
      format: FORMAT,
      version: VERSION,
      name,
      unit: "mm",
      paper: paperKey,
      savedAt: new Date().toISOString(),
      entities: getEntities(),
    },
    null,
    2
  );
}

// Check one object from a file. Returns a clean copy, or null if it is damaged.
function cleanEntity(raw) {
  if (!raw || typeof raw !== "object") return null;
  const fields = FIELDS[raw.type];
  if (!fields) return null;

  const out = { type: raw.type };
  for (const f of fields) {
    if (typeof raw[f] !== "number" || !Number.isFinite(raw[f])) return null;
    out[f] = Math.round(raw[f]);   // geometry is always whole millimetres
  }
  if (out.type === "circle" && out.r <= 0) return null;
  if (Number.isInteger(raw.id) && raw.id > 0) out.id = raw.id;
  return out;
}

// Text from a file -> { ok: true, project } or { ok: false, error }.
export function parse(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "The file is not valid JSON." };
  }
  if (!data || data.format !== FORMAT) {
    return { ok: false, error: "This is not a PlanCraft project file." };
  }
  if (typeof data.version !== "number" || data.version > VERSION) {
    return { ok: false, error: "This file was made by a newer version of PlanCraft." };
  }
  if (!Array.isArray(data.entities)) {
    return { ok: false, error: "The file has no drawing data." };
  }

  const entities = [];
  for (let i = 0; i < data.entities.length; i++) {
    const e = cleanEntity(data.entities[i]);
    if (!e) return { ok: false, error: `Object number ${i + 1} is damaged.` };
    entities.push(e);
  }

  // Keep the ids from the file only if every object has a unique one.
  const ids = entities.map((e) => e.id);
  const idsOk = ids.every((id) => id !== undefined) && new Set(ids).size === ids.length;
  if (!idsOk) entities.forEach((e, i) => { e.id = i + 1; });

  const name =
    typeof data.name === "string" && data.name.trim()
      ? data.name.trim().slice(0, 80)
      : "Untitled";
  const paper =
    typeof data.paper === "string" && Object.hasOwn(PAPER_SIZES_MM, data.paper)
      ? data.paper
      : "freeform";

  return { ok: true, project: { name, paper, entities } };
}