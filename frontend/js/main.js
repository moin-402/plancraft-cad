import { Viewport } from "./render/viewport.js";
import { createScene } from "./render/scene.js";
import { chooseGridStep } from "./render/grid.js";
import { paperWorldSize } from "./core/paper.js";
import { getEntities, subscribe } from "./core/store.js";
import { undo, redo } from "./core/history.js";
import { snapPoint } from "./core/snap.js";
import { createLineTool } from "./tools/lineTool.js";
import * as hud from "./ui/hud.js";
import { showCursor, showGrid, showZoom } from "./ui/statusbar.js";

const svg = document.getElementById("canvas");
const paperSelect = document.getElementById("paper-select");

const viewport = new Viewport();
const scene = createScene(svg);
let paperKey = "freeform";
let overlay = { preview: null, snap: null };   // temporary drawing helpers

function redraw() {
  const { stepMm } = scene.render(viewport, paperKey, getEntities(), overlay);
  showGrid(stepMm);
  showZoom(viewport.zoomPercent);
}

// Redraw whenever the drawing data changes (new line, undo, redo).
subscribe(redraw);

// Things tools are allowed to use.
const ctx = {
  snap: (world) =>
    snapPoint(world, viewport, getEntities(), chooseGridStep(viewport.scale).stepMm),
  setOverlay: (next) => {
    overlay = next;
    redraw();
  },
};

// --- Tools ---
// Tools not listed here (select, rectangle, wall...) are not built yet.
const tools = { line: createLineTool(ctx) };
let activeTool = null;

function chooseTool(name) {
  if (activeTool && activeTool.deactivate) activeTool.deactivate();
  activeTool = tools[name] || null;
  svg.classList.toggle("drawing", Boolean(activeTool));
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

// --- Mouse: panning, drawing ---
let panning = false;
let spaceDown = false;
let last = { x: 0, y: 0 };

// Stops the canvas click from stealing keyboard focus from the length box.
svg.addEventListener("mousedown", (e) => e.preventDefault());

svg.addEventListener("pointerdown", (e) => {
  const p = pointerPos(e);
  const wantsPan = e.button === 1 || (e.button === 0 && (!activeTool || spaceDown));

  if (wantsPan) {
    panning = true;
    last = p;
    svg.setPointerCapture(e.pointerId);
    svg.classList.add("panning");
    e.preventDefault();
    return;
  }
  if (e.button === 0 && activeTool) {
    const world = viewport.screenToWorld(p.x, p.y);
    activeTool.pointerDown(world, e);
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
    const pt = activeTool.pointerMove(world, e);   // snapped point
    showCursor(pt.x, pt.y);
  } else {
    showCursor(world.x, world.y);
  }
});

svg.addEventListener("pointerleave", () => {
  if (activeTool && activeTool.pointerLeave) activeTool.pointerLeave();
});

function stopPan() {
  panning = false;
  svg.classList.remove("panning");
}
svg.addEventListener("pointerup", stopPan);
svg.addEventListener("pointercancel", stopPan);

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

new ResizeObserver(resize).observe(svg);
resize();