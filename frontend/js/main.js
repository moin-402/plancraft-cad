import { Viewport } from "./render/viewport.js";
import { createScene } from "./render/scene.js";
import { chooseGridStep } from "./render/grid.js";
import { paperWorldSize } from "./core/paper.js";
import {
  getEntities, subscribe, updateEntities, removeEntities, loadEntities,
} from "./core/store.js";
import { undo, redo, commit, reset as resetHistory } from "./core/history.js";
import { snapPoint } from "./core/snap.js";
import { moveEntity } from "./core/geometry.js";
import { drawingBounds } from "./core/bounds.js";
import * as selection from "./core/selection.js";
import * as project from "./core/project.js";
import * as autosave from "./core/autosave.js";
import { createSelectTool } from "./tools/selectTool.js";
import { createLineTool } from "./tools/lineTool.js";
import { createRectTool } from "./tools/rectTool.js";
import { createCircleTool } from "./tools/circleTool.js";
import * as hud from "./ui/hud.js";
import * as properties from "./ui/properties.js";
import { initMenus } from "./ui/menu.js";
import { downloadText, pickTextFile } from "./ui/fileio.js";
import { showCursor, showGrid, showZoom } from "./ui/statusbar.js";

const svg = document.getElementById("canvas");
const paperSelect = document.getElementById("paper-select");
const titleEl = document.getElementById("project-title");

const viewport = new Viewport();
const scene = createScene(svg);
let paperKey = "freeform";
let overlay = { preview: null, snap: null };   // temporary drawing helpers

// --- Project state ---
let projectName = "Untitled";   // "Untitled" means it has never been named
let dirty = false;              // true when there are changes not saved to a file

function updateTitle() {
  const label = `${projectName}${dirty ? " *" : ""}`;
  titleEl.textContent = label;
  document.title = `${label} - PlanCraft CAD`;
}

// --- Autosave (a safety copy in the browser, written shortly after each change) ---
let autosaveTimer = null;

function autosaveNow() {
  autosave.save(project.serialize({ name: projectName, paperKey }), dirty);
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(autosaveNow, 400);
}

function markClean() {
  dirty = false;
  updateTitle();
  autosaveNow();
}

// --- Drawing ---
function redraw() {
  const { stepMm } = scene.render(
    viewport, paperKey, getEntities(), overlay, new Set(selection.getIds())
  );
  showGrid(stepMm);
  showZoom(viewport.zoomPercent);
}

// Redraw and refresh the properties panel when the drawing or selection changes.
function refreshAll() {
  properties.render(selection.selectedEntities());
  redraw();
}
subscribe(refreshAll);
selection.onChange(refreshAll);

// Any change to the drawing means "unsaved changes".
subscribe(() => {
  dirty = true;
  updateTitle();
  scheduleAutosave();
});

// Zoom so the paper (or, in freeform, the whole drawing) fills the view.
function fitToContent() {
  const size = paperWorldSize(paperKey);
  let r = size
    ? { minX: 0, minY: 0, maxX: size.w, maxY: size.h }
    : drawingBounds(getEntities());
  if (!r) r = { minX: -1000, minY: -1000, maxX: 17000, maxY: 11000 };   // empty drawing

  // Avoid zooming in absurdly far on a tiny drawing.
  const w = Math.max(r.maxX - r.minX, 3000);
  const h = Math.max(r.maxY - r.minY, 3000);
  const cx = (r.minX + r.maxX) / 2;
  const cy = (r.minY + r.maxY) / 2;
  viewport.fitRect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, 60);
}

// Things tools are allowed to use.
const ctx = {
  viewport,
  snap: (world, exclude) =>
    snapPoint(world, viewport, getEntities(), chooseGridStep(viewport.scale).stepMm, exclude),
  setOverlay: (next) => {
    overlay = next;
    redraw();
  },
};

// --- Tools ---
// Tools not listed here (wall, door, window...) are not built yet.
const tools = {
  select: createSelectTool(ctx),
  line: createLineTool(ctx),
  rectangle: createRectTool(ctx),
  circle: createCircleTool(ctx),
};
let activeTool = null;

function cancelTool() {
  if (activeTool && activeTool.cancel) activeTool.cancel();
}

function chooseTool(name) {
  if (activeTool && activeTool.deactivate) activeTool.deactivate();
  activeTool = tools[name] || null;
  svg.classList.toggle("tool-select", name === "select");
  svg.classList.toggle("drawing", Boolean(activeTool) && name !== "select");
}

document.querySelectorAll(".tool").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tool").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    chooseTool(btn.dataset.tool);
  });
});

hud.onSubmit((text) => {
  if (activeTool && activeTool.submitLength) activeTool.submitLength(text);
});

// --- Editing actions (used by both keys and menus) ---
function doUndo() {
  cancelTool();
  undo();
}

function doRedo() {
  cancelTool();
  redo();
}

function deleteSelected() {
  const ids = selection.getIds();
  if (ids.length === 0) return;
  removeEntities(ids);
  commit();
}

function selectAll() {
  if (activeTool !== tools.select) return;   // only while the Select tool is active
  selection.set(getEntities().map((e) => e.id));
}

// --- Project actions: New, Open, Save ---

// Replace the whole drawing with a project (used by New, Open and autosave restore).
function applyProject(p) {
  cancelTool();
  selection.clear();
  loadEntities(p.entities);
  resetHistory();
  projectName = p.name;
  paperKey = p.paper;
  paperSelect.value = paperKey;
  overlay = { preview: null, snap: null };
  fitToContent();
  redraw();
}

function newProject() {
  if (dirty && !confirm("Start a new project? Unsaved changes will be lost.")) return;
  applyProject({ name: "Untitled", paper: "freeform", entities: [] });
  markClean();
}

async function openProject() {
  if (dirty && !confirm("Open another project? Unsaved changes will be lost.")) return;

  const file = await pickTextFile();
  if (!file) return;

  const result = project.parse(file.text);
  if (!result.ok) {
    alert(`Could not open that file.\n\n${result.error}`);
    return;
  }
  const p = result.project;
  if (p.name === "Untitled") {
    p.name = file.name.replace(/\.plancraft\.json$|\.json$/i, "") || "Untitled";
  }
  applyProject(p);
  markClean();
}

// Remove characters that are not allowed in file names.
const safeFileName = (name) => name.replace(/[\\/:*?"<>|]/g, "-");

function saveProject(askForName) {
  if (askForName || projectName === "Untitled") {
    const answer = prompt("Project name:", projectName === "Untitled" ? "" : projectName);
    if (answer === null || !answer.trim()) return;   // cancelled
    projectName = answer.trim();
  }
  const text = project.serialize({ name: projectName, paperKey });
  downloadText(`${safeFileName(projectName)}.plancraft.json`, text);
  markClean();
}

initMenus({
  new: newProject,
  open: openProject,
  save: () => saveProject(false),
  saveAs: () => saveProject(true),
  undo: doUndo,
  redo: doRedo,
  selectAll,
  delete: deleteSelected,
  zoomFit: () => {
    fitToContent();
    redraw();
  },
});

function resize() {
  const rect = svg.getBoundingClientRect();
  viewport.setSize(rect.width, rect.height);
  redraw();
}

// Mouse position relative to the canvas, in screen pixels.
function pointerPos(event) {
  const rect = svg.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

// --- Mouse: panning and tools ---
let panning = false;
let spaceDown = false;
let last = { x: 0, y: 0 };

function startPan(p, e) {
  panning = true;
  last = p;
  svg.setPointerCapture(e.pointerId);
  svg.classList.add("panning");
  e.preventDefault();
}

function stopPan() {
  panning = false;
  svg.classList.remove("panning");
}

// Stops the canvas click from stealing keyboard focus from the input box.
svg.addEventListener("mousedown", (e) => e.preventDefault());

svg.addEventListener("pointerdown", (e) => {
  const p = pointerPos(e);

  // Pan: middle button, Space + left button, or left button with no tool.
  if (e.button === 1 || (e.button === 0 && (!activeTool || spaceDown))) {
    startPan(p, e);
    return;
  }
  if (e.button === 0 && activeTool) {
    const world = viewport.screenToWorld(p.x, p.y);
    svg.setPointerCapture(e.pointerId);   // keeps drags working outside the canvas
    // The select tool answers "pan" when you pressed on empty space.
    if (activeTool.pointerDown(world, e) === "pan") startPan(p, e);
  }
});

svg.addEventListener("pointermove", (e) => {
  const p = pointerPos(e);
  if (panning) {
    viewport.panBy(p.x - last.x, p.y - last.y);
    last = p;
    redraw();
  }
  const world = viewport.screenToWorld(p.x, p.y);
  if (activeTool && !panning) {
    const pt = activeTool.pointerMove(world, e);
    showCursor(pt.x, pt.y);
  } else {
    showCursor(world.x, world.y);
  }
});

svg.addEventListener("pointerup", (e) => {
  if (panning) {
    stopPan();
    return;
  }
  if (activeTool && activeTool.pointerUp) {
    const p = pointerPos(e);
    activeTool.pointerUp(viewport.screenToWorld(p.x, p.y), e);
  }
});

svg.addEventListener("pointercancel", stopPan);

svg.addEventListener("pointerleave", () => {
  if (activeTool && activeTool.pointerLeave) activeTool.pointerLeave();
});

// Right-click stops the current drawing (and hides the browser menu).
svg.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  cancelTool();
});

// --- Zooming (mouse wheel, centred on the cursor) ---
svg.addEventListener("wheel", (e) => {
  e.preventDefault();
  const p = pointerPos(e);
  viewport.zoomAt(p.x, p.y, e.deltaY < 0 ? 1.1 : 1 / 1.1);
  redraw();
  const world = viewport.screenToWorld(p.x, p.y);
  showCursor(world.x, world.y);
}, { passive: false });

// --- Keyboard ---
function typingInField(e) {
  return e.target.tagName === "INPUT" || e.target.tagName === "SELECT";
}

document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  const ctrl = e.ctrlKey || e.metaKey;

  if (e.code === "Space" && !typingInField(e)) {
    spaceDown = true;
    e.preventDefault();
    return;
  }
  if (e.key === "Escape") {
    cancelTool();
    return;
  }

  // Files
  if (ctrl && key === "s") {
    e.preventDefault();
    saveProject(e.shiftKey);
    return;
  }
  if (ctrl && key === "o") {
    e.preventDefault();
    openProject();
    return;
  }

  if (ctrl && key === "a" && !typingInField(e)) {
    e.preventDefault();
    selectAll();
    return;
  }
  if (e.key === "Home" && !typingInField(e)) {
    e.preventDefault();
    fitToContent();
    redraw();
    return;
  }

  // Delete the selected objects.
  if ((e.key === "Delete" || e.key === "Backspace") && !typingInField(e)) {
    if (selection.getIds().length > 0) {
      e.preventDefault();
      deleteSelected();
    }
    return;
  }

  // Arrow keys nudge the selection by one grid step.
  if (e.key.startsWith("Arrow") && !typingInField(e)) {
    const selected = selection.selectedEntities();
    if (selected.length === 0) return;
    e.preventDefault();
    const step = Math.round(chooseGridStep(viewport.scale).stepMm);
    const dx = e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0;
    const dy = e.key === "ArrowUp" ? step : e.key === "ArrowDown" ? -step : 0;
    updateEntities(selected.map((obj) => moveEntity(obj, dx, dy)));
    commit();
    return;
  }

  if (ctrl && key === "z" && !e.shiftKey) {
    e.preventDefault();
    doUndo();
    return;
  }
  if (ctrl && (key === "y" || (key === "z" && e.shiftKey))) {
    e.preventDefault();
    doRedo();
  }
});

document.addEventListener("keyup", (e) => {
  if (e.code === "Space") spaceDown = false;
});

// --- Paper selection ---
paperSelect.addEventListener("change", () => {
  paperKey = paperSelect.value;
  fitToContent();
  paperSelect.blur();
  redraw();
  dirty = true;
  updateTitle();
  scheduleAutosave();
});

// --- Start up ---
chooseTool("select");   // Select is the default tool
new ResizeObserver(resize).observe(svg);
resize();

// Bring back the autosaved drawing, if there is one.
const saved = autosave.load();
if (saved) {
  const result = project.parse(saved.text);
  if (result.ok && result.project.entities.length > 0) {
    applyProject(result.project);
    dirty = saved.dirty;
  }
}
updateTitle();