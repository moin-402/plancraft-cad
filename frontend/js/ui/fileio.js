// Make the browser download a text file.
export function downloadText(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Show the file picker. Resolves to { name, text }, or null if cancelled.
export function pickTextFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files[0];
      resolve(file ? { name: file.name, text: await file.text() } : null);
    });
    input.addEventListener("cancel", () => resolve(null));
    input.click();
  });
}