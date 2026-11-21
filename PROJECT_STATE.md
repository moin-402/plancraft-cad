# PlanCraft CAD - Project State

## Decisions
- Internal unit: integer millimetres. Display: feet-inches (nearest 1/16").
- World Y points up; viewport.js is the only place that converts mm <-> pixels.
- Paper: Freeform, A4, A3, A2, A1 (landscape), fixed 1:100 for now.
- Stack: plain JS (ES modules) + SVG frontend. Python/FastAPI backend is only
  needed from the export phase (PDF/DXF); saving does NOT need it.
- Typed input: plain number = feet; 12 6 = feet inches; " = inches; mm/cm/m accepted.
  Rectangle size: "10 x 12". Circle: radius.
- Undo/redo = snapshots of the whole entity list (history.js).
- Entities: line {x1,y1,x2,y2}, rect {x1,y1,x2,y2 (opposite corners)}, circle {cx,cy,r}.
- Selection is by clicking an object's OUTLINE (not its inside).
- Pan: middle mouse, Space+left-drag, or left-drag on empty space with Select.
- Project file: <name>.plancraft.json {format, version, name, unit, paper, entities}.
  Loading validates every object; unknown/damaged files are rejected with a message.
- Autosave: browser localStorage (key plancraft.autosave.v1), restored on start.

## Completed
- Milestone 1: app shell, grid, zoom, pan, coordinates, paper selector.
- Milestone 2: store, undo/redo, grid + endpoint snapping, line tool, typed lengths.
- Milestone 3: rectangle, circle, select, move, delete, nudge, properties panel.
- Milestone 4: File menu (New/Open/Save/Save as), Edit + View menus, autosave,
  unsaved marker, zoom to fit.

## Files
frontend/index.html, css/{theme,layout,draw,menu}.css
js/main.js
js/core/{units,paper,store,history,snap,geometry,selection,project,autosave,bounds}.js
js/render/{viewport,grid,scene}.js
js/tools/{selectTool,lineTool,rectTool,circleTool}.js
js/ui/{statusbar,hud,properties,menu,fileio}.js

## Known limits / bugs
- Save downloads a new file each time (browser Downloads folder); no overwrite.
- Autosave is per browser and per address (localhost:8000 vs 127.0.0.1:5500 differ).
- Properties panel is read-only (editing values comes in Phase 5).
- No box-select, rotate, copy/paste yet.

## Pending
- Next: walls with thickness and corner joins (Phase 3).
- Later: doors/windows, rooms, dimensions, PDF/DXF export + backend.