import { formatFeetInches, formatArea } from "../core/units.js";

const box = document.getElementById("props-selection");

// "12' 6"  (3810 mm)"
const mm = (v) => `${formatFeetInches(v)}  (${Math.round(v)} mm)`;

function describe(e) {
  if (e.type === "line") {
    const dx = e.x2 - e.x1;
    const dy = e.y2 - e.y1;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    return {
      title: "Line",
      rows: [
        ["Length", mm(Math.hypot(dx, dy))],
        ["Angle", `${angle.toFixed(1)}°`],
        ["Start X", mm(e.x1)],
        ["Start Y", mm(e.y1)],
        ["End X", mm(e.x2)],
        ["End Y", mm(e.y2)],
      ],
    };
  }
  if (e.type === "rect") {
    const w = Math.abs(e.x2 - e.x1);
    const h = Math.abs(e.y2 - e.y1);
    return {
      title: "Rectangle",
      rows: [
        ["Width", mm(w)],
        ["Height", mm(h)],
        ["Area", formatArea(w * h)],
        ["Left X", mm(Math.min(e.x1, e.x2))],
        ["Bottom Y", mm(Math.min(e.y1, e.y2))],
      ],
    };
  }
  if (e.type === "circle") {
    return {
      title: "Circle",
      rows: [
        ["Radius", mm(e.r)],
        ["Diameter", mm(e.r * 2)],
        ["Centre X", mm(e.cx)],
        ["Centre Y", mm(e.cy)],
      ],
    };
  }
  return { title: "Object", rows: [] };
}

function paragraph(text, muted) {
  const p = document.createElement("p");
  p.textContent = text;
  if (muted) p.className = "muted";
  return p;
}

export function render(selected) {
  box.replaceChildren();

  if (selected.length === 0) {
    box.append(paragraph("Nothing selected.", true));
    return;
  }
  if (selected.length > 1) {
    box.append(paragraph(`${selected.length} objects selected`, false));
    return;
  }

  const info = describe(selected[0]);
  const title = document.createElement("div");
  title.className = "prop-title";
  title.textContent = info.title;

  const list = document.createElement("dl");
  for (const [label, value] of info.rows) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    list.append(dt, dd);
  }
  box.append(title, list);
}