import { addEntity } from "../core/store.js";
import { commit } from "../core/history.js";
import { parseSize, formatFeetInches, formatArea } from "../core/units.js";
import * as hud from "../ui/hud.js";

const HUD_OPTIONS = {
  placeholder: "Width x Height, Enter",
  hint: `e.g. 10 x 12 (feet) · 12'6" x 10' · Shift = square · Esc = stop`,
};

export function createRectTool(ctx) {
  let start = null;   // first corner
  let end = null;     // cursor (snapped)

  // Snap the cursor; Shift forces a square.
  function candidate(world, square) {
    const snap = ctx.snap(world);
    let { x, y } = snap;
    if (start && square) {
      const size = Math.max(Math.abs(x - start.x), Math.abs(y - start.y));
      x = start.x + (x >= start.x ? 1 : -1) * size;
      y = start.y + (y >= start.y ? 1 : -1) * size;
    }
    return { x, y, kind: snap.kind };
  }

  function refresh() {
    ctx.setOverlay({
      preview: start && end
        ? { type: "rect", x1: start.x, y1: start.y, x2: end.x, y2: end.y }
        : null,
      snap: end ? { x: end.x, y: end.y, kind: end.kind } : null,
    });
    if (start && end) {
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      hud.setInfo(`${formatFeetInches(w)} × ${formatFeetInches(h)}    area ${formatArea(w * h)}`);
    }
  }

  function cancel() {
    start = null;
    end = null;
    hud.hide();
    ctx.setOverlay({ preview: null, snap: null });
  }

  // Save the rectangle. Returns false if it would have zero width or height.
  function finish(to) {
    if (to.x === start.x || to.y === start.y) return false;
    addEntity({ type: "rect", x1: start.x, y1: start.y, x2: to.x, y2: to.y });
    commit();
    cancel();
    return true;
  }

  return {
    pointerMove(world, event) {
      end = candidate(world, event.shiftKey);
      refresh();
      return end;
    },

    pointerDown(world, event) {
      const pt = candidate(world, event.shiftKey);
      if (!start) {
        start = { x: pt.x, y: pt.y };
        end = pt;
        hud.show(HUD_OPTIONS);
        hud.focusInput();
        refresh();
      } else {
        finish(pt);
      }
    },

    pointerLeave() {
      end = null;
      refresh();
    },

    // Typed size: the rectangle grows toward the side where the cursor is.
    submitLength(text) {
      if (!start) return;
      const size = parseSize(text);
      if (!size) {
        hud.setError(true);
        return;
      }
      const dirX = end && end.x < start.x ? -1 : 1;
      const dirY = end && end.y < start.y ? -1 : 1;
      const ok = finish({ x: start.x + dirX * size.w, y: start.y + dirY * size.h });
      if (!ok) hud.setError(true);
    },

    cancel,
    deactivate: cancel,
  };
}