import type { Mode } from "../../spec/navigation/api";
import { character, printable } from "../../spec/navigation/helpers";
import { createNavigation } from "./game-navigation";

export const WORLD_WIDTH = 240;
export const WORLD_HEIGHT = 160;
export const SITE_WIDTH = 11;
export const SITE_HEIGHT = 7;

export const SITE_IDS = [
  "a01", "a02", "a03", "a04", "b01", "b02", "z01", "z02",
] as const;

export type SiteId = (typeof SITE_IDS)[number];
export type SiteKind = "empty" | "well" | "ring";
export type ImpSlot = 1 | 2 | 3 | 4 | 5;
export type MenuSelection = "well" | "ring";

export interface Cursor {
  readonly x: number;
  readonly y: number;
}

export interface Well {
  readonly kind: "well";
  readonly mana: number;
  readonly link: SiteId | null;
}

export interface Ring {
  readonly kind: "ring";
  readonly mana: number;
  readonly produced: number;
}

export type Building = Well | Ring;

export interface Imp {
  readonly ring: SiteId;
  readonly slot: ImpSlot;
  readonly x: number;
  readonly y: number;
}

export type SiteObservation =
  | { readonly kind: "empty" }
  | { readonly kind: "well"; readonly mana: number; readonly link: SiteId | null }
  | { readonly kind: "ring"; readonly mana: number; readonly produced: number };

export interface Observation {
  readonly width: number;
  readonly height: number;
  readonly cursor: Cursor;
  readonly mode: string;
  readonly count: number;
  readonly pendingSource: SiteId | null;
  readonly menuSelection: MenuSelection | null;
  readonly commandBuffer: string;
  readonly manualPaused: boolean;
  readonly suspended: boolean;
  readonly elapsedTicks: number;
  readonly remainderMs: number;
  readonly siteCount: number;
  readonly buildingCount: number;
  readonly impCount: number;
  readonly siteAtCursor: SiteId | null;
  readonly sites: Readonly<Partial<Record<SiteId, SiteObservation>>>;
  readonly imps: readonly Imp[];
}

export interface GlyphField {
  readonly width: number;
  readonly height: number;
  readonly text: string;
}

export interface BuildingSetup {
  readonly site: SiteId;
  readonly kind: "well" | "ring";
  readonly mana?: number;
  readonly link?: SiteId | null;
  readonly produced?: number;
}

export interface Scenario {
  readonly navigationOnly?: boolean;
  readonly rows?: Readonly<Record<string, string>>;
  readonly cursor?: Cursor;
  readonly buildings?: readonly BuildingSetup[];
  readonly pendingSource?: SiteId | null;
}

declare const worldBrand: unique symbol;

export type World = { readonly [worldBrand]: true };

interface SiteDefinition {
  readonly id: SiteId;
  readonly x: number;
  readonly y: number;
}

interface InternalWorld {
  readonly navigationOnly: boolean;
  readonly cursor: Cursor;
  readonly mode: Mode;
  readonly buildings: ReadonlyMap<SiteId, Building>;
  readonly pendingSource: SiteId | null;
  readonly navRows: readonly string[] | null;
}

export type GameEvent =
  | { readonly type: "key"; readonly key: string; readonly blocked?: boolean }
  | { readonly type: "blur" };

const SITE_DEFINITIONS: readonly SiteDefinition[] = [
  { id: "a01", x: 8, y: 8 },
  { id: "a02", x: 32, y: 8 },
  { id: "a03", x: 56, y: 8 },
  { id: "a04", x: 80, y: 8 },
  { id: "b01", x: 8, y: 32 },
  { id: "b02", x: 32, y: 32 },
  { id: "z01", x: 200, y: 136 },
  { id: "z02", x: 224, y: 152 },
];

const RALLY_OFFSET: Readonly<Record<ImpSlot, number>> = {
  1: 1, 2: 3, 3: 5, 4: 7, 5: 9,
};
const RALLY_ROW = 6;
const IMP_SLOTS: readonly ImpSlot[] = [1, 2, 3, 4, 5];
const INITIAL_CURSOR: Cursor = { x: 13, y: 10 };
const MAX_WELL_MANA = 2000;
const MAX_RING_MANA = 1000;
const MAX_IMPS = 5;
const worldSize = WORLD_WIDTH * WORLD_HEIGHT;
const navigation = createNavigation({ columns: WORLD_WIDTH, rows: WORLD_HEIGHT });

function normalMode(): Mode {
  return { $: "Normal", count: 0 };
}

const store = new WeakMap<World, InternalWorld>();
const fieldCache = new WeakMap<World, string>();

function construct(data: InternalWorld): World {
  const world = Object.freeze({}) as World;
  store.set(world, Object.freeze({
    ...data,
    cursor: Object.freeze({ ...data.cursor }),
    mode: Object.freeze({ ...data.mode }),
    buildings: new Map(data.buildings),
    navRows: data.navRows === null ? null : Object.freeze([...data.navRows]),
  }));
  return world;
}

function data(world: World): InternalWorld {
  const found = store.get(world);
  if (!found) throw new Error("Unknown world state.");
  return found;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new Error(`Invalid world scenario: ${message}`);
}

function integer(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    fail(`${label} must be an integer in ${min}..${max}`);
  }
  return value;
}

function isSiteId(value: unknown): value is SiteId {
  return typeof value === "string" && (SITE_IDS as readonly string[]).includes(value);
}

function siteId(value: unknown, label: string): SiteId {
  if (!isSiteId(value)) fail(`${label} must name a fixed site`);
  return value;
}

function cursor(value: unknown): Cursor {
  if (!isRecord(value)) fail("cursor must be an object");
  return {
    x: integer(value.x, "cursor.x", 0, WORLD_WIDTH - 1),
    y: integer(value.y, "cursor.y", 0, WORLD_HEIGHT - 1),
  };
}

function sanitizeRow(text: string): string {
  return Array.from(text).slice(0, WORLD_WIDTH).map(c => printable(c) ? c : " ").join("").padEnd(WORLD_WIDTH, " ");
}

function rows(value: unknown): readonly string[] {
  if (!isRecord(value)) fail("rows must be an object keyed by numeric world row");
  const result = Array.from({ length: WORLD_HEIGHT }, () => " ".repeat(WORLD_WIDTH));
  for (const [key, text] of Object.entries(value)) {
    if (!/^(0|[1-9]\d*)$/.test(key)) fail(`rows key ${key} is not a canonical row index`);
    const row = Number(key);
    if (!Number.isInteger(row) || row < 0 || row >= WORLD_HEIGHT) fail(`rows key ${key} is outside the world`);
    if (typeof text !== "string") fail(`rows[${key}] must be a string`);
    result[row] = sanitizeRow(text);
  }
  return result;
}

function buildingSetup(value: unknown, index: number): { site: SiteId; building: Building } {
  if (!isRecord(value)) fail(`buildings[${index}] must be an object`);
  const site = siteId(value.site, `buildings[${index}].site`);
  if (value.kind !== "well" && value.kind !== "ring") fail(`buildings[${index}].kind must be well or ring`);
  const mana = integer(value.mana ?? 0, `buildings[${index}].mana`, 0, value.kind === "well" ? MAX_WELL_MANA : MAX_RING_MANA);
  if (value.kind === "well") {
    if (value.produced !== undefined) fail(`buildings[${index}] is a well and cannot have produced`);
    const link = value.link ?? null;
    if (link !== null && !isSiteId(link)) fail(`buildings[${index}].link must name a fixed site`);
    return { site, building: { kind: "well", mana, link } };
  }
  if (value.link !== undefined && value.link !== null) fail(`buildings[${index}] is a ring and cannot have a link`);
  return {
    site,
    building: { kind: "ring", mana, produced: integer(value.produced ?? 0, `buildings[${index}].produced`, 0, MAX_IMPS) },
  };
}

function parseScenario(spec: unknown): InternalWorld {
  if (spec === undefined) spec = {};
  if (!isRecord(spec)) fail("scenario must be an object");
  const allowed = new Set(["navigationOnly", "rows", "cursor", "buildings", "pendingSource"]);
  for (const key of Object.keys(spec)) if (!allowed.has(key)) fail(`unknown scenario field ${key}`);
  if (spec.navigationOnly !== undefined && typeof spec.navigationOnly !== "boolean") fail("navigationOnly must be boolean");
  const navigationOnly = spec.navigationOnly === true;
  if (!navigationOnly && spec.rows !== undefined) fail("rows require navigationOnly");
  const navRows = navigationOnly && spec.rows !== undefined ? rows(spec.rows) : navigationOnly ? Array.from({ length: WORLD_HEIGHT }, () => " ".repeat(WORLD_WIDTH)) : null;
  const position = spec.cursor === undefined ? { ...INITIAL_CURSOR } : cursor(spec.cursor);
  const buildings = new Map<SiteId, Building>();
  if (spec.buildings !== undefined) {
    if (!Array.isArray(spec.buildings)) fail("buildings must be an array");
    for (const [index, value] of spec.buildings.entries()) {
      const parsed = buildingSetup(value, index);
      if (buildings.has(parsed.site)) fail(`duplicate building site ${parsed.site}`);
      buildings.set(parsed.site, parsed.building);
    }
  }
  if (navigationOnly && buildings.size > 0) fail("navigationOnly has no sites or buildings");
  for (const [site, building] of buildings) {
    if (building.kind === "well" && building.link !== null) {
      const target = buildings.get(building.link);
      if (!target || target.kind !== "ring") fail(`well ${site} links to a non-ring target ${building.link}`);
    }
  }
  const pendingSource = spec.pendingSource === undefined || spec.pendingSource === null
    ? null
    : siteId(spec.pendingSource, "pendingSource");
  if (pendingSource !== null) {
    const source = buildings.get(pendingSource);
    if (!source || source.kind !== "well") fail(`pendingSource ${pendingSource} must name a built well`);
  }
  return { navigationOnly, cursor: position, mode: normalMode(), buildings, pendingSource, navRows };
}

function put(cells: string[], x: number, y: number, text: string): void {
  for (const [offset, glyph] of Array.from(text).entries()) {
    const index = y * WORLD_WIDTH + x + offset;
    if (x + offset >= 0 && x + offset < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) cells[index] = glyph;
  }
}

function baseCells(): string[] {
  const cells = Array.from({ length: worldSize }, () => " ");
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const index = y * WORLD_WIDTH + x;
      if (x === 0 || y === 0 || x === WORLD_WIDTH - 1 || y === WORLD_HEIGHT - 1) cells[index] = "#";
    }
  }
  for (let x = 8; x <= 31; x++) {
    cells[60 * WORLD_WIDTH + x] = "~";
    cells[61 * WORLD_WIDTH + x] = "~";
  }
  for (let x = 80; x <= 91; x++) cells[100 * WORLD_WIDTH + x] = "^";
  return cells;
}

const BASE = baseCells();

function drawBuilding(cells: string[], site: SiteDefinition, building: Building | undefined): void {
  for (let y = 0; y < SITE_HEIGHT; y++) {
    for (let x = 0; x < SITE_WIDTH; x++) cells[(site.y + y) * WORLD_WIDTH + site.x + x] = " ";
  }
  put(cells, site.x, site.y, site.id);
  if (building === undefined) {
    put(cells, site.x + 5, site.y + 2, "+");
  } else if (building.kind === "well") {
    put(cells, site.x + 3, site.y + 1, ".---.");
    put(cells, site.x + 3, site.y + 2, "| ~ |");
    put(cells, site.x + 3, site.y + 3, "'---'");
    put(cells, site.x + 3, site.y + 4, "WELL");
  } else {
    put(cells, site.x + 3, site.y + 1, "/---\\");
    put(cells, site.x + 3, site.y + 2, "| o |");
    put(cells, site.x + 3, site.y + 3, "\\---/");
    put(cells, site.x + 3, site.y + 4, "RING");
  }
}

function compose(world: InternalWorld): string {
  if (world.navRows !== null) return world.navRows.join("");
  const cells = BASE.slice();
  for (const site of SITE_DEFINITIONS) drawBuilding(cells, site, world.buildings.get(site.id));
  for (const site of SITE_DEFINITIONS) {
    const building = world.buildings.get(site.id);
    if (building?.kind !== "ring") continue;
    for (const slot of IMP_SLOTS.slice(0, building.produced)) {
      put(cells, site.x + RALLY_OFFSET[slot], site.y + RALLY_ROW, "i");
    }
  }
  return cells.join("");
}

function text(world: World): string {
  const cached = fieldCache.get(world);
  if (cached !== undefined) return cached;
  const composed = compose(data(world));
  fieldCache.set(world, composed);
  return composed;
}

function impsOf(world: InternalWorld): readonly Imp[] {
  if (world.navigationOnly) return [];
  const result: Imp[] = [];
  for (const site of SITE_DEFINITIONS) {
    const building = world.buildings.get(site.id);
    if (building?.kind !== "ring") continue;
    for (const slot of IMP_SLOTS.slice(0, building.produced)) {
      result.push({ ring: site.id, slot, x: site.x + RALLY_OFFSET[slot], y: site.y + RALLY_ROW });
    }
  }
  return result;
}

export function initial(): World {
  return construct(parseScenario({}));
}

export function scenario(spec: unknown = {}): World {
  return construct(parseScenario(spec));
}

export function snapshot(world: World): Scenario {
  const state = data(world);
  if (state.navigationOnly) {
    const rows: Record<string, string> = {};
    for (const [y, row] of (state.navRows ?? []).entries()) {
      if (row.trim() !== "") rows[String(y)] = row;
    }
    return { navigationOnly: true, cursor: { ...state.cursor }, rows };
  }
  const buildings: BuildingSetup[] = [];
  for (const site of SITE_DEFINITIONS) {
    const building = state.buildings.get(site.id);
    if (!building) continue;
    buildings.push(building.kind === "well"
      ? { site: site.id, kind: "well", mana: building.mana, link: building.link }
      : { site: site.id, kind: "ring", mana: building.mana, produced: building.produced });
  }
  return {
    cursor: { ...state.cursor },
    buildings,
    ...(state.pendingSource === null ? {} : { pendingSource: state.pendingSource }),
  };
}

export function dispatch(world: World, event: GameEvent): World {
  const state = data(world);
  if (event.type === "blur") {
    return construct({ ...state, mode: normalMode(), pendingSource: null });
  }
  if (event.type !== "key") throw new Error("Unsupported game event.");
  if (event.blocked === true) return world;
  if (event.key === "Escape") {
    return construct({
      ...state,
      mode: normalMode(),
      pendingSource: state.mode.$ === "Normal" ? null : state.pendingSource,
    });
  }
  const from = navigation.position(state.cursor);
  const next = navigation.step(text(world), from, state.mode, character(event.key));
  if (
    next.position === from
    && next.mode.$ === state.mode.$
    && next.mode.count === state.mode.count
  ) return world;
  return construct({ ...state, cursor: navigation.cursor(next.position), mode: next.mode });
}

export function observe(world: World): Observation {
  const state = data(world);
  const sites: Partial<Record<SiteId, SiteObservation>> = {};
  let buildingCount = 0;
  let impCount = 0;
  if (!state.navigationOnly) {
    for (const site of SITE_DEFINITIONS) {
      const building = state.buildings.get(site.id);
      if (!building) {
        sites[site.id] = { kind: "empty" };
      } else {
        buildingCount++;
        if (building.kind === "well") {
          sites[site.id] = { kind: "well", mana: building.mana, link: building.link };
        } else {
          impCount += building.produced;
          sites[site.id] = { kind: "ring", mana: building.mana, produced: building.produced };
        }
      }
    }
  }
  return {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    cursor: { ...state.cursor },
    mode: state.mode.$,
    count: state.mode.count,
    pendingSource: state.pendingSource,
    menuSelection: null,
    commandBuffer: "",
    manualPaused: false,
    suspended: false,
    elapsedTicks: 0,
    remainderMs: 0,
    siteCount: state.navigationOnly ? 0 : SITE_DEFINITIONS.length,
    buildingCount,
    impCount,
    siteAtCursor: siteAt(world, state.cursor.x, state.cursor.y),
    sites,
    imps: impsOf(state),
  };
}

export function siteAt(world: World, x: number, y: number): SiteId | null {
  if (data(world).navigationOnly || !Number.isInteger(x) || !Number.isInteger(y)) return null;
  for (const site of SITE_DEFINITIONS) {
    if (x >= site.x && x < site.x + SITE_WIDTH && y >= site.y && y < site.y + SITE_HEIGHT) return site.id;
  }
  return null;
}

export function glyphAt(world: World, x: number, y: number): string {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= WORLD_WIDTH || y >= WORLD_HEIGHT) return " ";
  return text(world)[y * WORLD_WIDTH + x] ?? " ";
}

export function field(world: World): GlyphField {
  return { width: WORLD_WIDTH, height: WORLD_HEIGHT, text: text(world) };
}

export function imps(world: World): readonly Imp[] {
  return impsOf(data(world));
}
