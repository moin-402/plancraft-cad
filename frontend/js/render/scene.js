import { chooseGridStep, buildGridPaths } from "./grid.js";
import { paperWorldSize } from "../core/paper.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function make(tag, className) {
  const el = document.createElementNS(SVG_NS, tag);
  el.setAttribute("class", className);
  return el;
}

export function createScene(svg) {
  const paper = make("rect", "paper");
  const gridMinor = make("path", "grid-minor");
  const gridMajor = make("path", "grid-major");
  const axisX = make("line", "axis-x");
  const axisY = make("line", "axis-y");
  const entityLayer = make("g", "entities");
  const previewLine = make("line", "preview-line");
  const snapMarker = make("rect", "snap-marker");

  // Order = drawing order (later items appear on top).
  svg.append(paper, gridMinor, gridMajor, axisX, axisY, entityLayer, previewLine, snapMarker);

  // entities: the drawing objects (mm). overlay: temporary things like the
  // dashed preview line and the snap marker: { preview, snap }.
  function render(viewport, paperKey, entities, overlay) {
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

    // Drawing objects: mm -> pixels happens here, only for display.
    const items = [];
    for (const e of entities) {
      if (e.type !== "line") continue;
      const el = make("line", "entity-line");
      el.setAttribute("x1", viewport.worldToScreenX(e.x1));
      el.setAttribute("y1", viewport.worldToScreenY(e.y1));
      el.setAttribute("x2", viewport.worldToScreenX(e.x2));
      el.setAttribute("y2", viewport.worldToScreenY(e.y2));
      items.push(el);
    }
    entityLayer.replaceChildren(...items);

    // Dashed preview line while drawing
    const pv = overlay && overlay.preview;
    if (pv) {
      previewLine.style.display = "";
      previewLine.setAttribute("x1", viewport.worldToScreenX(pv.x1));
      previewLine.setAttribute("y1", viewport.worldToScreenY(pv.y1));
      previewLine.setAttribute("x2", viewport.worldToScreenX(pv.x2));
      previewLine.setAttribute("y2", viewport.worldToScreenY(pv.y2));
    } else {
      previewLine.style.display = "none";
    }

    // Snap marker: bigger green square on an endpoint, small blue on the grid
    const sn = overlay && overlay.snap;
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