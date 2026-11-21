# PlanCraft CAD - Project State

## Decisions
- Internal unit: integer millimetres. Display: feet-inches (nearest 1/16").
- World Y points up; viewport.js is the only place that converts mm <-> pixels.
- Paper: Freeform, A4, A3, A2, A1 (landscape), fixed 1:100 for now.
- Stack: plain JS (ES modules) + SVG frontend; FastAPI backend later (Phase 6).
- Typed lengths: plain number = feet; 12 6 = feet inches; " = inches; mm/cm/m accepted.
- Undo/redo = snapshots of the whole entity list (history.js).
- Pan: middle mouse, Space+left-drag, or left-drag when no drawing tool is active.

## Completed
- Milestone 1: app shell, grid, zoom, pan, coordinates, paper selector.
- Milestone 2: data store, undo/redo, grid + endpoint snapping, line tool
  (click or typed length, Shift = straight), saved-as-mm entities.

## Files
frontend/index.html, css/{theme,layout,draw}.css
js/main.js
js/core/{units,paper,store,history,snap}.js
js/render/{viewport,grid,scene}.js
js/tools/lineTool.js
js/ui/{statusbar,hud}.js

## Known limits / bugs
- Nothing is saved yet: refreshing the page clears the drawing.
- Grid points like 1 ft (304.8 mm) are rounded to whole mm when snapped.
- Whole scene is rebuilt on each redraw (fine for now, optimise later).

## Pending
- Milestone 3: rectangle + circle tools, select/move/delete.
- Later: walls, doors/windows, dimensions, save/load, PDF/DXF, backend.