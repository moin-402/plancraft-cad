import { formatFeetInches, formatGridStep } from "../core/units.js";

const $ = (id) => document.getElementById(id);

export function showCursor(xMm, yMm) {
  $("status-cursor").textContent =
    `X: ${formatFeetInches(xMm)}   Y: ${formatFeetInches(yMm)}`;
  $("status-cursor-mm").textContent =
    `(${Math.round(xMm)}, ${Math.round(yMm)} mm)`;
}

export function showGrid(stepMm) {
  $("status-grid").textContent = `Grid: ${formatGridStep(stepMm)}`;
}

export function showZoom(percent) {
  $("status-zoom").textContent = `Zoom: ${percent.toFixed(1)}%`;
}