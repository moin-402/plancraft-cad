import { chooseGridStep, buildGridPaths } from "./grid.js";
import { paperWorldSize } from "../core/paper.js";
import { moveEntity } from "../core/geometry.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function make(tag, className) {
  const el = document.createElementNS(SVG_NS, tag);
  el.setAttribute("class", className);
  return el;
}

// Build the SVG shape for one drawing object. This is where mm become pixels.
function shape(e, vp, className) {
  if (e.type === "line") {
    const el = make("line", className);
    el.setAttribute("x1", vp.worldToScreenX(e.x1));
    el.setAttribute("y1", vp.worldToScreenY(e.y1));
    el.setAttribute("x2", vp.worldToScreenX(e.x2));
    el.setAttribute("y2", vp.worldToScreenY(e.y2));
    return el;
  }
  if (e.type === "rect") {
    const el = make("rect", className);
    const minX = Math.min(e.x1, e.x2);
    const maxX = Math.max(e.x1, e.x2);
    const minY = Math.min(e.y1, e.y2);
    const maxY = Math.max(e.y1, e.y2);
    el.setAttribute("x", vp.worldToScreenX(minX));
    el.setAttribute("y", vp.worldToScreenY(maxY));   // screen Y is flipped
    el.setAttribute("width", (maxX - minX) * vp.scale);
    el.setAttribute("height", (maxY - minY) * vp.scale);
    return el;
  }
  if (e.type === "circle") {
    const el = make("circle", className);
    el.setAttribute("cx", vp.worldToScreenX(e.cx));
    el.setAttribute("cy", vp.worldToScreenY(e.cy));
    el.setAttribute("r", e.r * vp.scale);
    return el;
  }
  return null;
}

export function createScene(svg) {
  const paper = make("rect", "paper");
  const gridMinor = make("path", "grid-minor");
  const gridMajor = make("path", "grid-major");
  const axisX = make("line", "axis-x");
  const axisY = make("line", "axis-y");
  const entityLayer = make("g", "entities");
  const previewLayer = make("g", "previews");
  const snapMarker = make("rect", "snap-marker");

  // Order = drawing order (later items appear on top).
  svg.append(paper, gridMinor, gridMajor, axisX, axisY, entityLayer, previewLayer, snapMarker);

  // entities: the drawing objects (mm).
  // overlay: temporary things { preview, snap, hoverId, dragOffset }.
  // selectedIds: a Set of selected object ids.
  function render(viewport, paperKey, entities, overlay, selectedIds) {
    const ov = overlay || {};

    // Paper sheet
    const size = paperWorldSize(paperKey);
    if (size) {
      paper.style.display = "";
      paper.setAttribute("x", viewport.worldToScreenX(0));
      paper.setAttribute("y", viewport.worldToScreenY(size.h));
      paper.setAttribute("width", size.w * viewport.scale);
      paper.setAttribute("height", size.h * viewport.scale);
    } else {
      paper.style.display = "none";
    }
    svg.classList.toggle("has-paper", Boolean(size));

    // Grid
    const { stepMm, majorEvery } = chooseGridStep(viewport.scale);
    const { minor, major } = buildGridPaths(viewport, stepMm, majorEvery);
    gridMinor.setAttribute("d", minor);
    gridMajor.setAttribute("d", major);

    // Axes through the world origin (0, 0)
    const x0 = viewport.worldToScreenX(0);
    const y0 = viewport.worldToScreenY(0);
    axisY.setAttribute("x1", x0); axisY.setAttribute("x2", x0);
    axisY.setAttribute("y1", 0);  axisY.setAttribute("y2", viewport.height);
    axisX.setAttribute("y1", y0); axisX.setAttribute("y2", y0);
    axisX.setAttribute("x1", 0);  axisX.setAttribute("x2", viewport.width);

    // Drawing objects. While dragging, selected ones are shown shifted;
    // the stored data only changes when the mouse is released.
    const items = [];
    for (const e of entities) {
      const isSelected = selectedIds.has(e.id);
      const shown = isSelected && ov.dragOffset
        ? moveEntity(e, ov.dragOffset.dx, ov.dragOffset.dy)
        : e;

      let cls = "entity";
      if (isSelected) cls += " selected";
      else if (ov.hoverId === e.id) cls += " hover";

      const el = shape(shown, viewport, cls);
      if (el) items.push(el);
    }
    entityLayer.replaceChildren(...items);

    // Dashed preview of the object being drawn
    const previewEl = ov.preview ? shape(ov.preview, viewport, "preview-shape") : null;
    previewLayer.replaceChildren(...(previewEl ? [previewEl] : []));

    // Snap marker: bigger green square on an endpoint, small blue on the grid
    const sn = ov.snap;
    if (sn) {
      const s = sn.kind === "endpoint" ? 12 : 6;
      snapMarker.style.display = "";
      snapMarker.setAttribute("class", `snap-marker snap-${sn.kind}`);
      snapMarker.setAttribute("x", viewport.worldToScreenX(sn.x) - s / 2);
      snapMarker.setAttribute("y", viewport.worldToScreenY(sn.y) - s / 2);
      snapMarker.setAttribute("width", s);
      snapMarker.setAttribute("height", s);
    } else {
      snapMarker.style.display = "none";
    }

    return { stepMm };
  }

  return { render };
}