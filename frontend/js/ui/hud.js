const bar = document.getElementById("draw-hud");
const info = document.getElementById("hud-info");
const input = document.getElementById("length-input");

// Typing again removes the red "bad input" highlight.
input.addEventListener("input", () => input.classList.remove("error"));

export function show() { bar.hidden = false; }

export function hide() {
  bar.hidden = true;
  clearInput();
  info.textContent = "";
}

export function setInfo(text) { info.textContent = text; }
export function focusInput() { input.focus(); }

export function clearInput() {
  input.value = "";
  input.classList.remove("error");
}

export function setError(on) { input.classList.toggle("error", on); }

// handler(text) is called when Enter is pressed in the box.
export function onSubmit(handler) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handler(input.value);
    }
  });
}