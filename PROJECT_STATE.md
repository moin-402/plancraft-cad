# PlanCraft CAD - Project State

## Decisions
- Internal unit: integer millimetres. Display: feet-inches (nearest 1/16").
- World Y points up; viewport.js is the only place that converts mm <-> pixels.
- Paper: Freeform, A4, A3, A2, A1 (landscape), fixed 1:100 for now.
- Stack: plain JS (ES modules) + SVG frontend; FastAPI backend later (Phase 6).
- Typed input: plain number = feet; 12 6 = feet inches; " = inches; mm/cm/m accepted.
  Rectangle size: "10 x 12". Circle: radius.
- Undo/redo = snapshots of the whole entity list (history.js).
- Entities: line {x1,y1,x2,y2}, rect {x1,y1,x2,y2 (opposite corners)}, circle {cx,cy,r}.
- Selection is by clicking an object's OUTLINE (not its inside).
- Pan: middle mouse, Space+left-drag, or left-drag on empty space with Select.

## Completed
- Milestone 1: app shell, grid, zoom, pan, coordinates, paper selector.
- Milestone 2: store, undo/redo, grid + endpoint snapping, line tool, typed lengths.
- Milestone 3: rectangle + circle tools, select, move (drag), delete, arrow-key
  nudge, read-only properties panel, snapping to corners and centres.

## Files
frontend/index.html, css/{theme,layout,draw}.css
js/main.js
js/core/{units,paper,store,history,snap,geometry,selection}.js
js/render/{viewport,grid,scene}.js
js/tools/{selectTool,lineTool,rectTool,circleTool}.js
js/ui/{statusbar,hud,properties}.js

## Known limits / bugs
- Nothing is saved yet: refreshing the page clears the drawing.
- Properties panel is read-only (editing values comes in Phase 5).
- No box-select (drag a rectangle to select); no rotate; no copy/paste yet.
- Whole scene is rebuilt on each redraw (fine for now, optimise later).

## Pending
- Next: save/load project to a file, then walls (Phase 3).
- Later: doors/windows, rooms, dimensions, PDF/DXF export, backend.