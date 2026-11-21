import { addEntity } from "../core/store.js";
import { commit } from "../core/history.js";
import { parseLength, formatFeetInches } from "../core/units.js";
import * as hud from "../ui/hud.js";

export function createLineTool(ctx) {
  let start = null;   // where the current segment begins, or null if not drawing
  let end = null;     // where the cursor currently is (snapped)

  // Snap the cursor; Shift forces a perfectly horizontal or vertical line.
  function candidate(world, ortho) {
    const snap = ctx.snap(world);
    let { x, y } = snap;
    if (start && ortho) {
      if (Math.abs(x - start.x) >= Math.abs(y - start.y)) y = start.y;
      else x = start.x;
    }
    return { x, y, kind: snap.kind };
  }

  // Update the dashed preview line, the snap marker and the length readout.
  function refresh() {
    ctx.setOverlay({
      preview: start && end ? { x1: start.x, y1: start.y, x2: end.x, y2: end.y } : null,
      snap: end ? { x: end.x, y: end.y, kind: end.kind } : null,
    });
    if (start && end) {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle < 0) angle += 360;
      hud.setInfo(`${formatFeetInches(Math.hypot(dx, dy))}    angle ${angle.toFixed(1)}°`);
    }
  }

  // Save one finished line, then continue the chain from its end.
  function addSegment(to) {
    if (to.x === start.x && to.y === start.y) return;   // ignore zero length
    addEntity({ type: "line", x1: start.x, y1: start.y, x2: to.x, y2: to.y });
    commit();
    start = { x: to.x, y: to.y };
    end = { ...to };
    hud.clearInput();
  }

  function cancel() {
    start = null;
    end = null;
    hud.hide();
    ctx.setOverlay({ preview: null, snap: null });
  }

  return {
    pointerMove(world, event) {
      end = candidate(world, event.shiftKey);
      refresh();
      return end;   // main.js shows this in the status bar
    },

    pointerDown(world, event) {
      const pt = candidate(world, event.shiftKey);
      if (!start) {
        start = { x: pt.x, y: pt.y };
        end = pt;
        hud.show();
      } else {
        addSegment(pt);
      }
      hud.focusInput();
      refresh();
    },

    pointerLeave() {
      end = null;
      refresh();
    },

    // Typed length: draw from the start point toward the cursor.
    submitLength(text) {
      if (!start) return;
      const length = parseLength(text);
      if (!length || length <= 0) {
        hud.setError(true);
        return;
      }
      let dx = 1;
      let dy = 0;   // if the cursor is exactly on the start, go to the right
      if (end) {
        const d = Math.hypot(end.x - start.x, end.y - start.y);
        if (d > 0) {
          dx = (end.x - start.x) / d;
          dy = (end.y - start.y) / d;
        }
      }
      addSegment({
        x: Math.round(start.x + dx * length),
        y: Math.round(start.y + dy * length),
        kind: "typed",
      });
      refresh();
    },

    cancel,
    deactivate: cancel,
  };
}