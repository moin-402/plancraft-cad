const KEY = "plancraft.autosave.v1";

// text: the project as saved by project.serialize. dirty: unsaved changes?
export function save(text, dirty) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ text, dirty }));
  } catch {
    // storage full or blocked: autosave is a bonus, so ignore the failure
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.text !== "string") return null;
    return { text: data.text, dirty: Boolean(data.dirty) };
  } catch {
    return null;
  }
}