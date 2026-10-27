import {
  ALLY_HP,
  CURSOR_MAX_HP,
  ENEMY_HP,
  SITE_HEIGHT,
  SITE_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  game,
  type GameEvent,
  type Observation,
  type RulesProfile,
  type SiteId,
  type TroopObservation,
  type World,
} from "../core/game";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  GUTTER_WIDTH,
  followCamera,
  gutterLabel,
  visibleCells,
  type Camera,
  type Viewport,
} from "./camera";
import { ElapsedClock } from "./clock";
import { arrowHead, cellCenter, clipSegment } from "./overlay";

const colors = {
  background: "#111714",
  ground: "#16241a",
  grass: "#33452f",
  tree: "#6f9e5a",
  rock: "#9aa0a0",
  water: "#4d7ea8",
  gutterText: "#5c6b5f",
  gutterCurrent: "#223126",
  field: "#d9ddcb",
  imp: "#f5c451",
  ally: "#5ad2c4",
  enemy: "#e47a52",
  healthBack: "#313b34",
  cursor: "#f5c451",
  cursorGlyph: "#111714",
  preview: "#8fb3c7",
  link: "#5d8c9e",
  linkSelected: "#8fd3c0",
  source: "#d9a05b",
  rally: "#e3a94f",
  finderPanel: "#121b15",
  finderBorder: "#5d7a58",
  finderText: "#c6d4b4",
  finderMuted: "#7f9179",
  finderSelected: "#263a29",
  gameOverPanel: "#2a1716",
  gameOverBorder: "#e47a52",
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
const hudHp = document.querySelector<HTMLElement>("#hud-hp");
const hudWave = document.querySelector<HTMLElement>("#hud-wave");
const hudKills = document.querySelector<HTMLElement>("#hud-kills");
const hudPop = document.querySelector<HTMLElement>("#hud-pop");
const hudCursor = document.querySelector<HTMLElement>("#hud-cursor");
const hudSource = document.querySelector<HTMLElement>("#hud-source");
const hudRally = document.querySelector<HTMLElement>("#hud-rally");
const hudDraft = document.querySelector<HTMLElement>("#hud-draft");
const hudNotice = document.querySelector<HTMLElement>("#hud-notice");
const hudClock = document.querySelector<HTMLElement>("#hud-clock");
const hudLegend = document.querySelector<HTMLElement>("#hud-legend");

declare global {
  interface Window {
    __vimFlowTest?: {
      readonly manual: true;
      now(): number;
      advance(ms: number): void;
      load(spec: unknown): void;
      observe(): Observation;
      snapshot(): ReturnType<typeof game.snapshot>;
    };
  }
}

const parameters = new URLSearchParams(window.location.search);
const manualClock = parameters.get("clock") === "manual";
const requestedRules = parameters.get("rules");
const initialRules: RulesProfile = requestedRules === "first-playable" ? "first-playable" : "survival";
let manualNow = 0;
const clock = new ElapsedClock(manualClock ? 0 : null);
let state: World = game.initial({ rules: initialRules });
let camera: Camera = { x: 0, y: 0 };
let viewport: Viewport = { columns: 1, rows: 1 };
let composing = false;

function describeSite(observation: Observation): { label: string; resources: string } {
  if (observation.mode === "Finder") {
    const finder = observation.finder;
    const selected = finder === null ? undefined : finder.entries[finder.selection];
    const query = finder === null || finder.query === "" ? "_" : finder.query;
    return {
      label: selected === undefined ? "FINDER no result" : `FINDER ${selected.name}`,
      resources: `${query} · ↑/↓ select · Enter jump · Esc close`,
    };
  }
  if (observation.mode === "Insert") {
    const candidates = observation.candidates.length === 0
      ? "no matching command"
      : observation.candidates.join(" · ");
    return {
      label: `INSERT ${observation.insertSite ?? "ground"}`,
      resources: `${candidates} · Tab complete · Enter commit · Esc cancel`,
    };
  }
  if (observation.mode === "Name") {
    const target = observation.nameTarget ?? "";
    const building = observation.buildings.find(candidate => candidate.id === target);
    const draft = observation.commandBuffer === "" ? "_" : observation.commandBuffer;
    return {
      label: `NAME ${target}`,
      resources: `name ${draft} · Enter save · Esc default ${building?.name ?? ""}`,
    };
  }
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
  const building = observation.buildings.find(candidate => candidate.id === id);
  if (building) {
    if (building.kind === "well") {
      return {
        label: `${id} ${building.name} WELL`,
        resources: `mana ${building.mana}q · out ${building.link ?? "—"}`,
      };
    }
    return {
      label: `${id} ${building.name} RING`,
      resources: `mana ${building.mana}q · ${building.living}/5 living · ${building.produced} made · in ${incoming(observation, id)}`,
    };
  }
  const site = id in observation.sites ? observation.sites[id as SiteId] : undefined;
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
  for (const building of observation.buildings) {
    if (building.kind === "well" && building.link === ring) sources.push(building.id);
  }
  return sources.length === 0 ? "—" : sources.sort().join(",");
}

function modeLabel(observation: Observation): string {
  return observation.count === 0
    ? observation.mode.toUpperCase()
    : `${observation.mode.toUpperCase()} ${observation.count}`;
}

function clockLabel(observation: Observation): string {
  const status = observation.gameOver
    ? "game over"
    : observation.manualPaused
      ? "paused"
      : observation.suspended ? "hidden" : "running";
  return `${(observation.elapsedTicks / 10).toFixed(1)}s · ${status}`;
}

let gutterPixels = 0;

function drawCell(glyph: string, column: number, row: number, color: string): void {
  const x = gutterPixels + column * CELL_WIDTH + CELL_WIDTH / 2;
  const y = row * CELL_HEIGHT + CELL_HEIGHT / 2;
  context.fillStyle = color;
  context.fillText(glyph, x, y);
}

function screenPoint(cell: { readonly x: number; readonly y: number }): { x: number; y: number } {
  const point = cellCenter(cell.x - camera.x, cell.y - camera.y, CELL_WIDTH, CELL_HEIGHT);
  return { x: point.x + gutterPixels, y: point.y };
}

function insideBuilding(observation: Observation, x: number, y: number): boolean {
  for (const building of observation.buildings) {
    if (
      x >= building.center.x - 5 && x <= building.center.x + 5
      && y >= building.center.y - 2 && y <= building.center.y + 4
    ) return true;
  }
  return false;
}

function terrainColor(glyph: string, x: number, y: number, observation: Observation): string {
  if (glyph === "i") return colors.imp;
  if (glyph === "^") return colors.tree;
  if (glyph === "~" && !insideBuilding(observation, x, y)) return colors.water;
  if (glyph === "o" && !insideBuilding(observation, x, y)) return colors.rock;
  return colors.field;
}

function troopColor(troop: TroopObservation): string {
  return troop.faction === "ally" ? colors.ally : colors.enemy;
}

function troopMaxHp(troop: TroopObservation): number {
  return troop.faction === "ally" ? ALLY_HP : ENEMY_HP;
}

function troopAt(observation: Observation, x: number, y: number): TroopObservation | undefined {
  return observation.troops.find(troop => troop.x === x && troop.y === y);
}

function nearbyHealth(observation: Observation): string {
  const cursor = observation.cursor;
  const nearby = observation.troops
    .filter(troop => Math.max(Math.abs(troop.x - cursor.x), Math.abs(troop.y - cursor.y)) <= 1)
    .sort((left, right) => {
      const leftDistance = Math.abs(left.x - cursor.x) + Math.abs(left.y - cursor.y);
      const rightDistance = Math.abs(right.x - cursor.x) + Math.abs(right.y - cursor.y);
      return leftDistance - rightDistance || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
    });
  const closest = nearby[0];
  if (!closest) return "";
  const extra = nearby.length > 1 ? ` +${nearby.length - 1}` : "";
  return ` · near ${closest.faction} ${closest.id} ${closest.hp}/${troopMaxHp(closest)}${extra}`;
}

function waveLabel(observation: Observation): string {
  const seconds = Math.max(0, observation.nextWaveTick - observation.elapsedTicks) / 10;
  return `wave ${observation.wave} · next ${seconds.toFixed(1)}s`;
}

function drawGutter(observation: Observation, rows: number): void {
  context.save();
  context.textAlign = "right";
  for (let row = 0; row < rows; row++) {
    const worldRow = camera.y + row;
    if (worldRow >= WORLD_HEIGHT) break;
    const current = worldRow === observation.cursor.y;
    if (current) {
      context.fillStyle = colors.gutterCurrent;
      context.fillRect(0, row * CELL_HEIGHT, GUTTER_WIDTH, CELL_HEIGHT);
    }
    context.fillStyle = current ? colors.field : colors.gutterText;
    context.fillText(gutterLabel(worldRow, observation.cursor.y), GUTTER_WIDTH - 4, row * CELL_HEIGHT + CELL_HEIGHT / 2);
  }
  context.restore();
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

function drawRally(observation: Observation): void {
  if (observation.rally === null) return;
  const column = observation.rally.x - camera.x;
  const row = observation.rally.y - camera.y;
  if (column < 0 || column >= viewport.columns || row < 0 || row >= viewport.rows) return;
  const left = gutterPixels + column * CELL_WIDTH;
  const top = row * CELL_HEIGHT;
  context.save();
  context.strokeStyle = colors.rally;
  context.fillStyle = colors.rally;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(left + 3, top + 2);
  context.lineTo(left + 3, top + CELL_HEIGHT - 2);
  context.stroke();
  context.beginPath();
  context.moveTo(left + 3, top + 2);
  context.lineTo(left + CELL_WIDTH - 2, top + 5);
  context.lineTo(left + 3, top + 8);
  context.closePath();
  context.fill();
  context.restore();
}

function drawTroopMarkers(observation: Observation): void {
  for (const troop of observation.troops) {
    const column = troop.x - camera.x;
    const row = troop.y - camera.y;
    if (column < 0 || column >= viewport.columns || row < 0 || row >= viewport.rows) continue;
    const left = gutterPixels + column * CELL_WIDTH;
    const top = row * CELL_HEIGHT;
    const color = troopColor(troop);
    context.save();
    context.fillStyle = color;
    if (troop.faction === "ally") {
      context.fillRect(left + 3, top + 2, 6, 1.5);
    } else {
      context.beginPath();
      context.moveTo(left + CELL_WIDTH - 4, top + 1.5);
      context.lineTo(left + CELL_WIDTH - 1.5, top + 4);
      context.lineTo(left + CELL_WIDTH - 4, top + 6.5);
      context.lineTo(left + CELL_WIDTH - 6.5, top + 4);
      context.closePath();
      context.fill();
    }
    const maximum = troopMaxHp(troop);
    if (troop.hp < maximum) {
      const width = CELL_WIDTH - 4;
      const filled = Math.max(2, Math.round(width * troop.hp / maximum));
      context.fillStyle = colors.healthBack;
      context.fillRect(left + 2, top + CELL_HEIGHT - 4, width, 2);
      context.fillStyle = color;
      context.fillRect(left + 2, top + CELL_HEIGHT - 4, filled, 2);
    }
    context.restore();
  }
}

function drawGameOver(observation: Observation, cssWidth: number, cssHeight: number): void {
  if (!observation.gameOver) return;
  const available = cssWidth - gutterPixels;
  const width = Math.min(420, Math.max(180, available - 32));
  const height = 96;
  const left = gutterPixels + Math.max(8, (available - width) / 2);
  const top = Math.max(8, (cssHeight - height) / 2);
  context.save();
  context.fillStyle = colors.gameOverPanel;
  context.fillRect(left, top, width, height);
  context.strokeStyle = colors.gameOverBorder;
  context.lineWidth = 2;
  context.strokeRect(left + 1, top + 1, width - 2, height - 2);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = colors.enemy;
  context.font = 'bold 20px "SFMono-Regular", Consolas, "Liberation Mono", monospace';
  context.fillText("GAME OVER", left + width / 2, top + 28);
  context.fillStyle = colors.field;
  context.font = '12px "SFMono-Regular", Consolas, "Liberation Mono", monospace';
  context.fillText(
    `wave ${observation.wave} · kills ${observation.kills} · HP 0/${CURSOR_MAX_HP}`,
    left + width / 2,
    top + 55,
  );
  context.fillStyle = colors.gameOverBorder;
  context.fillText("Press Enter to restart", left + width / 2, top + 75);
  context.restore();
}

function drawFinder(observation: Observation, cssWidth: number, cssHeight: number): void {
  const finder = observation.finder;
  if (finder === null) return;
  const available = cssWidth - gutterPixels - 16;
  if (available < 80) return;
  const lineHeight = 18;
  const headerHeight = 30;
  const visibleRows = Math.max(1, Math.floor((cssHeight - headerHeight - 16) / lineHeight));
  const start = finder.entries.length <= visibleRows
    ? 0
    : Math.min(
      Math.max(0, finder.selection - Math.floor(visibleRows / 2)),
      finder.entries.length - visibleRows,
    );
  const rows = finder.entries.slice(start, start + visibleRows);
  const width = Math.min(460, available);
  const left = gutterPixels + 8;
  const top = 8;
  const height = headerHeight + Math.max(1, rows.length) * lineHeight + 8;
  context.save();
  context.beginPath();
  context.rect(left, top, width, height);
  context.clip();
  context.fillStyle = colors.finderPanel;
  context.fillRect(left, top, width, height);
  context.strokeStyle = colors.finderBorder;
  context.lineWidth = 1;
  context.strokeRect(left + 0.5, top + 0.5, width - 1, height - 1);
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = colors.finderMuted;
  context.fillText(`FINDER  ${finder.query === "" ? "_" : finder.query}`, left + 10, top + 14);
  if (rows.length === 0) {
    context.fillStyle = colors.finderText;
    context.fillText("no matching destination", left + 10, top + headerHeight + lineHeight / 2);
  }
  for (const [index, entry] of rows.entries()) {
    const row = top + headerHeight + index * lineHeight;
    if (start + index === finder.selection) {
      context.fillStyle = colors.finderSelected;
      context.fillRect(left + 5, row, width - 10, lineHeight);
    }
    context.fillStyle = start + index === finder.selection ? colors.field : colors.finderText;
    context.fillText(`${entry.name} | ${entry.type} | ${entry.id}`, left + 10, row + lineHeight / 2);
  }
  context.restore();
}

function drawSourceHighlight(observation: Observation): void {
  if (observation.pendingSource === null || observation.pendingFrom === null) return;
  const left = (observation.pendingFrom.x - 5 - camera.x) * CELL_WIDTH + gutterPixels;
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

  const rules = game.snapshot(state).rules ?? "first-playable";
  const survival = rules === "survival";
  gutterPixels = survival ? GUTTER_WIDTH : 0;
  viewport = visibleCells(cssWidth, cssHeight, gutterPixels);
  camera = followCamera(camera, observation.cursor, viewport, {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
  });

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = colors.background;
  context.fillRect(0, 0, cssWidth, cssHeight);
  if (survival) {
    const columns = Math.max(0, Math.min(viewport.columns, WORLD_WIDTH - camera.x));
    const rows = Math.max(0, Math.min(viewport.rows, WORLD_HEIGHT - camera.y));
    context.fillStyle = colors.ground;
    context.fillRect(GUTTER_WIDTH, 0, columns * CELL_WIDTH, rows * CELL_HEIGHT);
  }
  context.font = '15px "SFMono-Regular", Consolas, "Liberation Mono", monospace';
  context.textAlign = "center";
  context.textBaseline = "middle";

  if (survival) drawGutter(observation, viewport.rows);
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
      if (glyph === " ") {
        if (survival) drawCell(".", column, row, colors.grass);
        continue;
      }
      const troop = survival ? troopAt(observation, worldColumn, worldRow) : undefined;
      drawCell(glyph, column, row, troop
        ? troopColor(troop)
        : survival ? terrainColor(glyph, worldColumn, worldRow, observation)
          : glyph === "i" ? colors.imp : colors.field);
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
    context.fillRect(gutterPixels + cursorColumn * CELL_WIDTH, cursorRow * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
    drawCell(text[cursorY * WORLD_WIDTH + cursorX] ?? " ", cursorColumn, cursorRow, colors.cursorGlyph);
  }

  drawRally(observation);
  drawTroopMarkers(observation);
  drawFinder(observation, cssWidth, cssHeight);
  drawGameOver(observation, cssWidth, cssHeight);

  const allies = observation.troops.filter(troop => troop.faction === "ally").length;
  const enemies = observation.troops.length - allies;
  const site = describeSite(observation);
  setText(hudSite, site.label);
  setText(hudResources, site.resources);
  setText(hudMode, modeLabel(observation));
  setText(hudHp, survival ? `HP ${observation.cursorHp}/${CURSOR_MAX_HP}${nearbyHealth(observation)}` : "");
  setText(hudWave, survival ? waveLabel(observation) : "");
  setText(hudKills, survival ? `kills ${observation.kills}` : "");
  setText(hudPop, survival ? `allies ${allies} · enemies ${enemies}` : "");
  setText(hudCursor, `${cursorX},${cursorY} · ${camera.x},${camera.y}`);
  setText(hudSource, `source ${observation.pendingSource ?? "—"}`);
  setText(hudRally, observation.rally === null ? "rally —" : `rally ${observation.rally.x},${observation.rally.y}`);
  setText(hudDraft, `draft ${observation.commandBuffer === "" ? "—" : observation.commandBuffer}`);
  setText(hudNotice, observation.notice);
  setText(hudClock, clockLabel(observation));
  setText(hudLegend, survival
    ? "ally _ cyan · enemy ^ orange · grass . is whitespace · i rally Enter"
    : "");

  canvas.dataset.cursorX = String(cursorX);
  canvas.dataset.cursorY = String(cursorY);
  canvas.dataset.position = String(cursorY * WORLD_WIDTH + cursorX);
  canvas.dataset.row = String(cursorY);
  canvas.dataset.column = String(cursorX);
  canvas.dataset.mode = observation.mode;
  canvas.dataset.count = String(observation.count);
  canvas.dataset.cameraX = String(camera.x);
  canvas.dataset.cameraY = String(camera.y);
  canvas.dataset.gutterWidth = String(gutterPixels);
  canvas.dataset.gutter = survival
    ? Array.from({ length: viewport.rows }, (_, row) => gutterLabel(camera.y + row, cursorY))
      .filter((_, row) => camera.y + row < WORLD_HEIGHT)
      .join(",")
    : "";
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
  canvas.dataset.insertCell = observation.insertCell === null ? "" : `${observation.insertCell.x},${observation.insertCell.y}`;
  canvas.dataset.nameTarget = observation.nameTarget ?? "";
  canvas.dataset.candidates = observation.candidates.join(",");
  canvas.dataset.finderQuery = observation.finder?.query ?? "";
  canvas.dataset.finderSelection = String(observation.finder?.selection ?? 0);
  canvas.dataset.finderEntries = observation.finder === null
    ? ""
    : observation.finder.entries.map(entry => `${entry.name}|${entry.type}|${entry.id}`).join(";");
  canvas.dataset.notice = observation.notice;
  canvas.dataset.links = observation.links.map(link => `${link.source}>${link.target}`).join(",");
  canvas.dataset.linkCount = String(observation.links.length);
  canvas.dataset.sourceHighlight = observation.pendingSource ?? "";
  canvas.dataset.commandBuffer = observation.commandBuffer;
  canvas.dataset.manualPaused = String(observation.manualPaused);
  canvas.dataset.suspended = String(observation.suspended);
  canvas.dataset.elapsedTicks = String(observation.elapsedTicks);
  canvas.dataset.remainderMs = String(observation.remainderMs);
  canvas.dataset.rules = rules;
  canvas.dataset.rally = observation.rally === null ? "" : `${observation.rally.x},${observation.rally.y}`;
  canvas.dataset.cursorHp = String(observation.cursorHp);
  canvas.dataset.kills = String(observation.kills);
  canvas.dataset.gameOver = String(observation.gameOver);
  canvas.dataset.wave = String(observation.wave);
  canvas.dataset.nextWaveTick = String(observation.nextWaveTick);
  canvas.dataset.allies = String(allies);
  canvas.dataset.enemies = String(enemies);
  canvas.dataset.ready = "true";
}

function apply(event: GameEvent): void {
  const wasOver = game.observe(state).gameOver;
  state = game.dispatch(state, event);
  if (wasOver && !game.observe(state).gameOver) clock.reset(manualClock ? manualNow : null);
  render();
}

function advanceBy(milliseconds: number): void {
  if (milliseconds <= 0) return;
  const ticks = game.observe(state).elapsedTicks;
  const next = game.dispatch(state, { type: "elapsed", ms: milliseconds });
  if (next === state) return;
  state = next;
  if (game.observe(state).elapsedTicks !== ticks) render();
}

function visible(show: boolean): void {
  if (!show) composing = false;
  apply({ type: "visibility", hidden: !show });
  clock.reset(manualClock ? manualNow : null);
}

function testAdvance(milliseconds: number): void {
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) {
    throw new Error("Manual clock advances must be nonnegative safe integers.");
  }
  manualNow += milliseconds;
  advanceBy(clock.consume(manualNow));
}

function testLoad(spec: unknown): void {
  state = game.scenario(spec);
  clock.reset(manualNow);
  render();
}

if (manualClock) {
  window.__vimFlowTest = {
    manual: true,
    now: () => manualNow,
    advance: testAdvance,
    load: testLoad,
    observe: () => game.observe(state),
    snapshot: () => game.snapshot(state),
  };
}

function chord(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.altKey || event.metaKey;
}

function singleCodePoint(value: string): boolean {
  return Array.from(value).length === 1;
}

canvas.addEventListener("keydown", (event) => {
  if (composing || event.isComposing) return;
  const observation = game.observe(state);
  const survival = game.snapshot(state).rules === "survival";
  const handlingTab = survival && observation.mode === "Insert";
  const handlingFinder = survival && observation.mode === "Finder";
  const handlingEnter = survival
    && (observation.mode === "Insert" || observation.mode === "Name" || handlingFinder);
  const handlingArrow = handlingFinder
    && (event.key === "ArrowUp" || event.key === "ArrowDown");
  if (!chord(event) && (
    event.key === "Escape"
    || singleCodePoint(event.key)
    || (event.key === "Tab" && handlingTab)
    || (event.key === "Enter" && handlingEnter)
    || handlingArrow
  )) event.preventDefault();
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
  visible(document.visibilityState !== "hidden");
});
window.addEventListener("resize", render);

new ResizeObserver(() => render()).observe(canvas);

function frame(now: number): void {
  if (!manualClock) advanceBy(clock.consume(now));
  requestAnimationFrame(frame);
}

render();
canvas.focus();
requestAnimationFrame(frame);
