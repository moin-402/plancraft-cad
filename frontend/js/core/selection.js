import { getEntities, subscribe } from "./store.js";

let ids = new Set();
const listeners = [];

export function onChange(fn) { listeners.push(fn); }
function notify() { listeners.forEach((fn) => fn()); }

export function has(id) { return ids.has(id); }
export function getIds() { return [...ids]; }

export function set(list) {
  ids = new Set(list);
  notify();
}

export function clear() {
  if (ids.size === 0) return;
  ids = new Set();
  notify();
}

export function toggle(id) {
  const next = new Set(ids);
  if (next.has(id)) next.delete(id); else next.add(id);
  ids = next;
  notify();
}

export function selectedEntities() {
  return getEntities().filter((e) => ids.has(e.id));
}

// When the drawing changes (undo, delete...), forget objects that no longer exist.
subscribe(() => {
  const alive = new Set(getEntities().map((e) => e.id));
  const kept = [...ids].filter((id) => alive.has(id));
  if (kept.length !== ids.size) {
    ids = new Set(kept);
    notify();
  }
});