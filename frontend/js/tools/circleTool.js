import { addEntity } from "../core/store.js";
import { commit } from "../core/history.js";
import { parseLength, formatFeetInches } from "../core/units.js";
import * as hud from "../ui/hud.js";

const HUD_OPTIONS = {
  placeholder: "Radius, Enter",
  hint: `radius: 5 (feet) · 5'6" · 1500mm · Esc = stop`,
};

export function createCircleTool(ctx) {
  let center = null;
  let end = null;

  const radiusTo = (p) => Math.round(Math.hypot(p.x - center.x, p.y - center.y));

  function refresh() {
    const r = center && end ? radiusTo(end) : 0;
    ctx.setOverlay({
      preview: center && end ? { type: "circle", cx: center.x, cy: center.y, r } : null,
      snap: end ? { x: end.x, y: end.y, kind: end.kind } : null,
    });
    if (center && end) {
      hud.setInfo(`radius ${formatFeetInches(r)}    diameter ${formatFeetInches(r * 2)}`);
    }
  }

  function cancel() {
    center = null;
    end = null;
    hud.hide();
    ctx.setOverlay({ preview: null, snap: null });
  }

  function finish(r) {
    if (!r || r <= 0) return false;
    addEntity({ type: "circle", cx: center.x, cy: center.y, r });
    commit();
    cancel();
    return true;
  }

  return {
    pointerMove(world) {
      end = ctx.snap(world);
      refresh();
      return end;
    },

    pointerDown(world) {
      const pt = ctx.snap(world);
      if (!center) {
        center = { x: pt.x, y: pt.y };
        end = pt;
        hud.show(HUD_OPTIONS);
        hud.focusInput();
        refresh();
      } else {
        finish(radiusTo(pt));
      }
    },

    pointerLeave() {
      end = null;
      refresh();
    },

    // Typed radius.
    submitLength(text) {
      if (!center) return;
      const ok = finish(parseLength(text));
      if (!ok) hud.setError(true);
    },

    cancel,
    deactivate: cancel,
  };
}