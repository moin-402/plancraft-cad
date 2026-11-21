import { getEntities, setEntities } from "./store.js";

const MAX_STEPS = 200;
const clone = (list) => JSON.parse(JSON.stringify(list));

const undoStack = [];
const redoStack = [];
let current = clone(getEntities());   // the state after the last finished action

// Call this right AFTER a finished change (e.g. one line was added).
export function commit() {
  undoStack.push(current);
  if (undoStack.length > MAX_STEPS) undoStack.shift();
  current = clone(getEntities());
  redoStack.length = 0;   // a new action clears the redo history
}

export function undo() {
  if (undoStack.length === 0) return false;
  redoStack.push(current);
  current = undoStack.pop();
  setEntities(clone(current));
  return true;
}

export function redo() {
  if (redoStack.length === 0) return false;
  undoStack.push(current);
  current = redoStack.pop();
  setEntities(clone(current));
  return true;
}