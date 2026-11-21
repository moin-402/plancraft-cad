import { PX_PER_MM_AT_100 } from "../core/units.js";

const MIN_SCALE = 0.004;  // pixels per mm
const MAX_SCALE = 6;

const clamp = (v) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));

export class Viewport {
  constructor() {
    this.scale = 0.08;   // screen pixels per millimetre
    this.offsetX = 60;   // screen position of world x = 0
    this.offsetY = 0;    // screen position of world y = 0
    this.width = 0;
    this.height = 0;
    this._initialised = false;
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    if (!this._initialised && height > 0) {
      this.offsetY = height - 60;   // origin near the bottom-left
      this._initialised = true;
    }
  }

  // World Y points UP (like paper); screen Y points DOWN, so we flip.
  worldToScreenX(x) { return x * this.scale + this.offsetX; }
  worldToScreenY(y) { return this.offsetY - y * this.scale; }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (this.offsetY - sy) / this.scale,
    };
  }

  panBy(dxPixels, dyPixels) {
    this.offsetX += dxPixels;
    this.offsetY += dyPixels;
  }

  // Zoom while keeping the world point under (sx, sy) fixed on screen.
  zoomAt(sx, sy, factor) {
    const before = this.screenToWorld(sx, sy);
    this.scale = clamp(this.scale * factor);
    this.offsetX = sx - before.x * this.scale;
    this.offsetY = sy + before.y * this.scale;
  }

  // Zoom and centre so that a world rectangle fills the view.
  fitRect(minX, minY, maxX, maxY, padding = 40) {
    const w = maxX - minX;
    const h = maxY - minY;
    this.scale = clamp(Math.min(
      (this.width - 2 * padding) / w,
      (this.height - 2 * padding) / h
    ));
    this.offsetX = (this.width - w * this.scale) / 2 - minX * this.scale;
    this.offsetY = (this.height + h * this.scale) / 2 + minY * this.scale;
  }

  // The part of the world currently visible, in mm.
  visibleRect() {
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.width, this.height);
    return { minX: topLeft.x, maxX: bottomRight.x, minY: bottomRight.y, maxY: topLeft.y };
  }

  get zoomPercent() {
    return (this.scale / PX_PER_MM_AT_100) * 100;
  }
}