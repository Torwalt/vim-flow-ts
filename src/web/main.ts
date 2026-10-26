import { actualApi, type Field, type Input, type Mode, type View } from "../core/navigation";

const columns = 40;
const rows = 20;
const cellWidth = 20;
const cellHeight = 24;
const fieldWidth = columns * cellWidth;
const fieldHeight = rows * cellHeight;
const cursorColor = "#f5c451";
const cursorGlyphColor = "#111714";
const fieldGlyphColor = "#d9ddcb";

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`The required element is missing: ${selector}`);
  return element;
}

function context2d(element: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = element.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable.");
  return context;
}

const canvas = required<HTMLCanvasElement>("#world");
const context = context2d(canvas);
const statusMode = document.querySelector<HTMLElement>("#status-mode");
const statusPosition = document.querySelector<HTMLElement>("#status-position");

let state = actualApi.initial();
let composing = false;

function modeLabel(mode: Mode): string {
  switch (mode.$) {
    case "Normal":
      return mode.count === 0 ? "NORMAL" : `NORMAL · COUNT ${mode.count}`;
    case "FindRight":
      return `FIND RIGHT · ${mode.count}`;
    case "FindLeft":
      return `FIND LEFT · ${mode.count}`;
    case "Go":
      return mode.count === 0 ? "GO" : `GO · COUNT ${mode.count}`;
  }
}

function draw(view: View<Field>): void {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(fieldWidth * ratio);
  canvas.height = Math.round(fieldHeight * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = "#111714";
  context.fillRect(0, 0, fieldWidth, fieldHeight);
  context.font = '15px "SFMono-Regular", Consolas, "Liberation Mono", monospace';
  context.textAlign = "center";
  context.textBaseline = "middle";

  const text = actualApi.contents(view.field);
  context.fillStyle = fieldGlyphColor;
  for (let position = 0; position < text.length; position++) {
    const glyph = text[position] ?? " ";
    if (glyph === " ") continue;
    const x = (position % columns) * cellWidth + cellWidth / 2;
    const y = Math.floor(position / columns) * cellHeight + cellHeight / 2;
    context.fillText(glyph, x, y);
  }

  const column = view.position % columns;
  const row = Math.floor(view.position / columns);
  const x = column * cellWidth;
  const y = row * cellHeight;
  context.fillStyle = cursorColor;
  context.fillRect(x, y, cellWidth, cellHeight);
  context.fillStyle = cursorGlyphColor;
  context.fillText(text[view.position] ?? " ", x + cellWidth / 2, y + cellHeight / 2);

  canvas.dataset.ready = "true";
  canvas.dataset.position = String(view.position);
  canvas.dataset.mode = view.mode.$;
  canvas.dataset.count = String(view.mode.count);
  canvas.dataset.row = String(row);
  canvas.dataset.column = String(column);
  if (statusMode) statusMode.textContent = modeLabel(view.mode);
  if (statusPosition) statusPosition.textContent = `row ${row} col ${column} · ${view.position}`;
}

function apply(input: Input): void {
  state = actualApi.step(state, input);
  draw(actualApi.view(state));
}

function chord(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.altKey || event.metaKey;
}

function singleCodePoint(value: string): boolean {
  return Array.from(value).length === 1;
}

function toInput(event: KeyboardEvent): Input {
  if (event.key === "Escape") return { $: "Escape", blocked: chord(event) };
  if (chord(event)) {
    return singleCodePoint(event.key)
      ? { $: "Character", value: event.key, blocked: true }
      : { $: "Other" };
  }
  return singleCodePoint(event.key)
    ? { $: "Character", value: event.key, blocked: false }
    : { $: "Other" };
}

canvas.addEventListener("keydown", (event) => {
  if (composing || event.isComposing) return;
  if (!chord(event) && (event.key === "Escape" || singleCodePoint(event.key))) event.preventDefault();
  apply(toInput(event));
});
canvas.addEventListener("compositionstart", () => { composing = true; });
canvas.addEventListener("compositionend", () => { composing = false; });
canvas.addEventListener("pointerdown", () => { canvas.focus(); });

function cancelPending(): void {
  composing = false;
  apply({ $: "Escape", blocked: false });
}
canvas.addEventListener("blur", cancelPending);
window.addEventListener("blur", cancelPending);
window.addEventListener("resize", () => { draw(actualApi.view(state)); });

draw(actualApi.view(state));
canvas.focus();
