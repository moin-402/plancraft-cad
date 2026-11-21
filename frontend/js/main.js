import { Viewport } from "./render/viewport.js";
import { createScene } from "./render/scene.js";
import { chooseGridStep } from "./render/grid.js";
import { paperWorldSize } from "./core/paper.js";
import { getEntities, subscribe, updateEntities, removeEntities } from "./core/store.js";
import { undo, redo, commit } from "./core/history.js";
import { snapPoint } from "./core/snap.js";
import { moveEntity } from "./core/geometry.js";
import * as selection from "./core/selection.js";
import { createSelectTool } from "./tools/selectTool.js";
import { createLineTool } from "./tools/lineTool.js";
import { createRectTool } from "./tools/rectTool.js";
import { createCircleTool } from "./tools/circleTool.js";
import * as hud from "./ui/hud.js";
import * as properties from "./ui/properties.js";
import { showCursor, showGrid, showZoom } from "./ui/statusbar.js";

const svg = document.getElementById("canvas");
const paperSelect = document.getElementById("paper-select");

const viewport = new Viewport();
const scene = createScene(svg);
let paperKey = "freeform";
let overlay = { preview: null, snap: null };   // temporary drawing helpers

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
  if (activeTool && activeTool.cancel) activeTool.cancel();
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
    if (activeTool && activeTool.cancel) activeTool.cancel();
    return;
  }

  // Delete the selected objects.
  if ((e.key === "Delete" || e.key === "Backspace") && !typingInField(e)) {
    const ids = selection.getIds();
    if (ids.length > 0) {
      e.preventDefault();
      removeEntities(ids);
      commit();
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
    if (activeTool && activeTool.cancel) activeTool.cancel();
    undo();
    return;
  }
  if (ctrl && (key === "y" || (key === "z" && e.shiftKey))) {
    e.preventDefault();
    if (activeTool && activeTool.cancel) activeTool.cancel();
    redo();
  }
});

document.addEventListener("keyup", (e) => {
  if (e.code === "Space") spaceDown = false;
});

// --- Paper selection ---
paperSelect.addEventListener("change", () => {
  paperKey = paperSelect.value;
  const size = paperWorldSize(paperKey);
  if (size) viewport.fitRect(0, 0, size.w, size.h);
  paperSelect.blur();
  redraw();
});

chooseTool("select");   // Select is the default tool
new ResizeObserver(resize).observe(svg);
resize();