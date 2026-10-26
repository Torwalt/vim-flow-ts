import {
  SITE_HEIGHT,
  SITE_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  game,
  type GameEvent,
  type Observation,
  type World,
} from "../core/game";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  followCamera,
  visibleCells,
  type Camera,
  type Viewport,
} from "./camera";
import { arrowHead, cellCenter, clipSegment } from "./overlay";

const colors = {
  background: "#111714",
  field: "#d9ddcb",
  imp: "#f5c451",
  cursor: "#f5c451",
  cursorGlyph: "#111714",
  preview: "#8fb3c7",
  link: "#5d8c9e",
  linkSelected: "#8fd3c0",
  source: "#d9a05b",
};

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

function setText(element: HTMLElement | null, value: string): void {
  if (element) element.textContent = value;
}

const canvas = required<HTMLCanvasElement>("#world");
const context = context2d(canvas);
const hudSite = document.querySelector<HTMLElement>("#hud-site");
const hudResources = document.querySelector<HTMLElement>("#hud-resources");
const hudMode = document.querySelector<HTMLElement>("#hud-mode");
const hudCursor = document.querySelector<HTMLElement>("#hud-cursor");
const hudSource = document.querySelector<HTMLElement>("#hud-source");
const hudDraft = document.querySelector<HTMLElement>("#hud-draft");
const hudNotice = document.querySelector<HTMLElement>("#hud-notice");
const hudClock = document.querySelector<HTMLElement>("#hud-clock");

let state: World = game.initial();
let camera: Camera = { x: 0, y: 0 };
let viewport: Viewport = { columns: 1, rows: 1 };
let composing = false;

function describeSite(observation: Observation): { label: string; resources: string } {
  if (observation.mode === "Build" && observation.buildTarget !== null) {
    const id = observation.buildTarget;
    const site = observation.sites[id];
    const selection = observation.menuSelection?.toUpperCase() ?? "BUILD";
    return {
      label: `${id} ${selection} PREVIEW`,
      resources: `current ${site?.kind ?? "empty"} · Enter build · w well · r ring · Esc cancel`,
    };
  }
  const id = observation.siteAtCursor;
  if (id === null) return { label: "no site", resources: "" };
  const site = observation.sites[id];
  if (!site) return { label: `${id} empty`, resources: "" };
  if (site.kind === "empty") return { label: `${id} EMPTY`, resources: "" };
  if (site.kind === "well") {
    return {
      label: `${id} WELL`,
      resources: `mana ${site.mana}q · out ${site.link ?? "—"}`,
    };
  }
  return {
    label: `${id} RING`,
    resources: `mana ${site.mana}q · ${site.produced}/5 · in ${incoming(observation, id)}`,
  };
}

function incoming(observation: Observation, ring: string): string {
  const sources: string[] = [];
  for (const [id, site] of Object.entries(observation.sites)) {
    if (site?.kind === "well" && site.link === ring) sources.push(id);
  }
  return sources.length === 0 ? "—" : sources.sort().join(",");
}

function modeLabel(observation: Observation): string {
  return observation.count === 0
    ? observation.mode.toUpperCase()
    : `${observation.mode.toUpperCase()} ${observation.count}`;
}

function clockLabel(observation: Observation): string {
  const status = observation.manualPaused
    ? "paused"
    : observation.suspended ? "hidden" : "running";
  return `${(observation.elapsedTicks / 10).toFixed(1)}s · ${status}`;
}

function drawCell(glyph: string, column: number, row: number, color: string): void {
  const x = column * CELL_WIDTH + CELL_WIDTH / 2;
  const y = row * CELL_HEIGHT + CELL_HEIGHT / 2;
  context.fillStyle = color;
  context.fillText(glyph, x, y);
}

function screenPoint(cell: { readonly x: number; readonly y: number }): { x: number; y: number } {
  return cellCenter(cell.x - camera.x, cell.y - camera.y, CELL_WIDTH, CELL_HEIGHT);
}

function drawLinks(observation: Observation, cssWidth: number, cssHeight: number): void {
  const selected = observation.siteAtCursor;
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const link of observation.links) {
    const clipped = clipSegment(screenPoint(link.from), screenPoint(link.to), cssWidth, cssHeight);
    if (!clipped) continue;
    const highlighted = selected !== null && (link.source === selected || link.target === selected);
    context.strokeStyle = highlighted ? colors.linkSelected : colors.link;
    context.lineWidth = highlighted ? 3 : 2;
    context.beginPath();
    context.moveTo(clipped.from.x, clipped.from.y);
    context.lineTo(clipped.to.x, clipped.to.y);
    context.stroke();
    const [left, right] = arrowHead(clipped.from, clipped.to, 7);
    context.beginPath();
    context.moveTo(left.x, left.y);
    context.lineTo(clipped.to.x, clipped.to.y);
    context.lineTo(right.x, right.y);
    context.stroke();
  }
  if (observation.pendingSource !== null && observation.pendingFrom !== null) {
    const from = screenPoint(observation.pendingFrom);
    const to = screenPoint(observation.cursor);
    const clipped = clipSegment(from, to, cssWidth, cssHeight);
    if (clipped) {
      context.strokeStyle = colors.source;
      context.lineWidth = 1.5;
      context.setLineDash([5, 4]);
      context.beginPath();
      context.moveTo(clipped.from.x, clipped.from.y);
      context.lineTo(clipped.to.x, clipped.to.y);
      context.stroke();
      context.setLineDash([]);
    }
  }
  context.restore();
}

function drawSourceHighlight(observation: Observation): void {
  if (observation.pendingSource === null || observation.pendingFrom === null) return;
  const left = (observation.pendingFrom.x - 5 - camera.x) * CELL_WIDTH;
  const top = (observation.pendingFrom.y - 2 - camera.y) * CELL_HEIGHT;
  context.save();
  context.strokeStyle = colors.source;
  context.lineWidth = 2;
  context.setLineDash([5, 3]);
  context.strokeRect(left + 1, top + 1, SITE_WIDTH * CELL_WIDTH - 2, SITE_HEIGHT * CELL_HEIGHT - 2);
  context.setLineDash([]);
  context.restore();
}

function render(): void {
  const observation = game.observe(state);
  const bounds = canvas.getBoundingClientRect();
  const cssWidth = Math.max(0, bounds.width);
  const cssHeight = Math.max(0, bounds.height);
  const ratio = window.devicePixelRatio || 1;
  const backingWidth = Math.max(1, Math.round(cssWidth * ratio));
  const backingHeight = Math.max(1, Math.round(cssHeight * ratio));
  if (canvas.width !== backingWidth) canvas.width = backingWidth;
  if (canvas.height !== backingHeight) canvas.height = backingHeight;

  viewport = visibleCells(cssWidth, cssHeight);
  camera = followCamera(camera, observation.cursor, viewport, {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
  });

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = colors.background;
  context.fillRect(0, 0, cssWidth, cssHeight);
  context.font = '15px "SFMono-Regular", Consolas, "Liberation Mono", monospace';
  context.textAlign = "center";
  context.textBaseline = "middle";

  drawLinks(observation, cssWidth, cssHeight);

  const text = game.field(state).text;
  const previewText = observation.mode === "Build"
    && observation.buildTarget !== null
    && observation.menuSelection !== null
    ? game.preview(state, observation.buildTarget, observation.menuSelection).text
    : null;
  const { x: cursorX, y: cursorY } = observation.cursor;
  for (let row = 0; row < viewport.rows; row++) {
    const worldRow = camera.y + row;
    if (worldRow >= WORLD_HEIGHT) break;
    for (let column = 0; column < viewport.columns; column++) {
      const worldColumn = camera.x + column;
      if (worldColumn >= WORLD_WIDTH) break;
      if (worldColumn === cursorX && worldRow === cursorY) continue;
      const index = worldRow * WORLD_WIDTH + worldColumn;
      const glyph = text[index] ?? " ";
      if (glyph === " ") continue;
      drawCell(glyph, column, row, glyph === "i" ? colors.imp : colors.field);
    }
  }

  if (previewText !== null) {
    for (let row = 0; row < viewport.rows; row++) {
      const worldRow = camera.y + row;
      if (worldRow >= WORLD_HEIGHT) break;
      for (let column = 0; column < viewport.columns; column++) {
        const worldColumn = camera.x + column;
        if (worldColumn >= WORLD_WIDTH) break;
        if (worldColumn === cursorX && worldRow === cursorY) continue;
        const index = worldRow * WORLD_WIDTH + worldColumn;
        const glyph = previewText[index] ?? " ";
        if (glyph === " " || glyph === text[index]) continue;
        drawCell(glyph, column, row, colors.preview);
      }
    }
  }

  drawSourceHighlight(observation);

  const cursorColumn = cursorX - camera.x;
  const cursorRow = cursorY - camera.y;
  if (cursorColumn >= 0 && cursorColumn < viewport.columns && cursorRow >= 0 && cursorRow < viewport.rows) {
    context.fillStyle = colors.cursor;
    context.fillRect(cursorColumn * CELL_WIDTH, cursorRow * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
    drawCell(text[cursorY * WORLD_WIDTH + cursorX] ?? " ", cursorColumn, cursorRow, colors.cursorGlyph);
  }

  const site = describeSite(observation);
  setText(hudSite, site.label);
  setText(hudResources, site.resources);
  setText(hudMode, modeLabel(observation));
  setText(hudCursor, `${cursorX},${cursorY} · ${camera.x},${camera.y}`);
  setText(hudSource, `source ${observation.pendingSource ?? "—"}`);
  setText(hudDraft, `draft ${observation.commandBuffer === "" ? "—" : observation.commandBuffer}`);
  setText(hudNotice, observation.notice);
  setText(hudClock, clockLabel(observation));

  canvas.dataset.cursorX = String(cursorX);
  canvas.dataset.cursorY = String(cursorY);
  canvas.dataset.position = String(cursorY * WORLD_WIDTH + cursorX);
  canvas.dataset.row = String(cursorY);
  canvas.dataset.column = String(cursorX);
  canvas.dataset.mode = observation.mode;
  canvas.dataset.count = String(observation.count);
  canvas.dataset.cameraX = String(camera.x);
  canvas.dataset.cameraY = String(camera.y);
  canvas.dataset.columns = String(viewport.columns);
  canvas.dataset.rows = String(viewport.rows);
  canvas.dataset.cellWidth = String(CELL_WIDTH);
  canvas.dataset.cellHeight = String(CELL_HEIGHT);
  canvas.dataset.dpr = String(ratio);
  canvas.dataset.siteAtCursor = observation.siteAtCursor ?? "";
  canvas.dataset.buildingCount = String(observation.buildingCount);
  canvas.dataset.pendingSource = observation.pendingSource ?? "";
  canvas.dataset.menuSelection = observation.menuSelection ?? "";
  canvas.dataset.buildTarget = observation.buildTarget ?? "";
  canvas.dataset.insertSite = observation.insertSite ?? "";
  canvas.dataset.notice = observation.notice;
  canvas.dataset.links = observation.links.map(link => `${link.source}>${link.target}`).join(",");
  canvas.dataset.linkCount = String(observation.links.length);
  canvas.dataset.sourceHighlight = observation.pendingSource ?? "";
  canvas.dataset.commandBuffer = observation.commandBuffer;
  canvas.dataset.manualPaused = String(observation.manualPaused);
  canvas.dataset.suspended = String(observation.suspended);
  canvas.dataset.elapsedTicks = String(observation.elapsedTicks);
  canvas.dataset.remainderMs = String(observation.remainderMs);
  canvas.dataset.ready = "true";
}

function apply(event: GameEvent): void {
  state = game.dispatch(state, event);
  render();
}

function chord(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.altKey || event.metaKey;
}

function singleCodePoint(value: string): boolean {
  return Array.from(value).length === 1;
}

canvas.addEventListener("keydown", (event) => {
  if (composing || event.isComposing) return;
  if (!chord(event) && (event.key === "Escape" || singleCodePoint(event.key))) event.preventDefault();
  apply({ type: "key", key: event.key, blocked: chord(event) });
});

canvas.addEventListener("compositionstart", () => {
  composing = true;
});

canvas.addEventListener("compositionend", (event) => {
  composing = false;
  apply({ type: "key", key: event.data });
});

canvas.addEventListener("pointerdown", () => {
  canvas.focus();
});

function cancelAll(): void {
  composing = false;
  apply({ type: "blur" });
}

canvas.addEventListener("blur", cancelAll);
window.addEventListener("blur", cancelAll);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") cancelAll();
});
window.addEventListener("resize", render);

new ResizeObserver(() => render()).observe(canvas);

render();
canvas.focus();
