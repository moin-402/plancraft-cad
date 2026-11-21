import { getEntities, updateEntities } from "../core/store.js";
import { commit } from "../core/history.js";
import * as selection from "../core/selection.js";
import { distanceToEntity, moveEntity } from "../core/geometry.js";

const HIT_PIXELS = 8;   // how close to an outline a click must be

export function createSelectTool(ctx) {
  let drag = null;       // while moving: { start: {x, y}, dx, dy }
  let hoverId = null;    // object under the cursor

  // Find the object whose outline is closest to the cursor (within tolerance).
  function hitTest(world) {
    const tolerance = HIT_PIXELS / ctx.viewport.scale;
    let best = null;
    let bestDistance = tolerance;
    for (const e of getEntities()) {
      const d = distanceToEntity(e, world);
      if (d <= bestDistance) {
        bestDistance = d;
        best = e;
      }
    }
    return best;
  }

  function pushOverlay(snap) {
    ctx.setOverlay({
      hoverId,
      dragOffset: drag ? { dx: drag.dx, dy: drag.dy } : null,
      snap: drag && snap ? { x: snap.x, y: snap.y, kind: snap.kind } : null,
    });
  }

  return {
    pointerDown(world, event) {
      const hit = hitTest(world);

      if (!hit) {
        if (!event.shiftKey) selection.clear();
        return "pan";   // empty space: main.js turns the drag into a pan
      }
      if (event.shiftKey) {
        selection.toggle(hit.id);
        return;
      }
      if (!selection.has(hit.id)) selection.set([hit.id]);

      // Start moving. The start point snaps, ignoring the objects being moved.
      drag = { start: ctx.snap(world, selection.getIds()), dx: 0, dy: 0 };
      pushOverlay(null);
    },

    pointerMove(world) {
      if (drag) {
        const s = ctx.snap(world, selection.getIds());
        drag.dx = s.x - drag.start.x;
        drag.dy = s.y - drag.start.y;
        pushOverlay(s);
      } else {
        const hit = hitTest(world);
        const id = hit ? hit.id : null;
        if (id !== hoverId) {
          hoverId = id;
          pushOverlay(null);
        }
      }
      return world;
    },

    pointerUp() {
      if (!drag) return;
      const { dx, dy } = drag;
      drag = null;
      pushOverlay(null);
      if (dx !== 0 || dy !== 0) {
        updateEntities(selection.selectedEntities().map((e) => moveEntity(e, dx, dy)));
        commit();   // one undo step for the whole move
      }
    },

    pointerLeave() {
      if (drag) return;
      hoverId = null;
      pushOverlay(null);
    },

    // Esc: cancel a move in progress, otherwise deselect everything.
    cancel() {
      if (drag) {
        drag = null;
        pushOverlay(null);
      } else {
        selection.clear();
      }
    },

    deactivate() {
      drag = null;
      hoverId = null;
      selection.clear();
      ctx.setOverlay({});
    },
  };
}