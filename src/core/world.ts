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

export const RULES_PROFILES = ["first-playable", "survival"] as const;

export type RulesProfile = (typeof RULES_PROFILES)[number];
export type SiteId = (typeof SITE_IDS)[number];
export type SiteKind = "empty" | "well" | "ring";
export type ImpSlot = 1 | 2 | 3 | 4 | 5;
export type MenuSelection = "well" | "ring";

export interface InitialOptions {
  readonly rules?: RulesProfile;
}

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

export interface LinkObservation {
  readonly source: SiteId;
  readonly target: SiteId;
  readonly from: Cursor;
  readonly to: Cursor;
}

export interface Observation {
  readonly width: number;
  readonly height: number;
  readonly cursor: Cursor;
  readonly mode: string;
  readonly count: number;
  readonly pendingSource: SiteId | null;
  readonly menuSelection: MenuSelection | null;
  readonly buildTarget: SiteId | null;
  readonly insertSite: SiteId | null;
  readonly pendingFrom: Cursor | null;
  readonly notice: string;
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
  readonly links: readonly LinkObservation[];
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
  readonly rules?: RulesProfile;
  readonly navigationOnly?: boolean;
  readonly rows?: Readonly<Record<string, string>>;
  readonly cursor?: Cursor;
  readonly buildings?: readonly BuildingSetup[];
  readonly pendingSource?: SiteId | null;
  readonly manualPaused?: boolean;
  readonly suspended?: boolean;
  readonly elapsedTicks?: number;
  readonly remainderMs?: number;
}

declare const worldBrand: unique symbol;

export type World = { readonly [worldBrand]: true };

interface SiteDefinition {
  readonly id: SiteId;
  readonly x: number;
  readonly y: number;
}

type LeaderMode = { readonly $: "Leader"; readonly count: 0 };
type BuildMode = { readonly $: "Build"; readonly count: 0 };
type InsertMode = { readonly $: "Insert"; readonly count: 0; readonly site: SiteId };
type GameMode = Mode | LeaderMode | BuildMode | InsertMode;

interface InternalWorld {
  readonly rules: RulesProfile;
  readonly navigationOnly: boolean;
  readonly cursor: Cursor;
  readonly mode: GameMode;
  readonly buildings: ReadonlyMap<SiteId, Building>;
  readonly pendingSource: SiteId | null;
  readonly menuSelection: MenuSelection | null;
  readonly buildTarget: SiteId | null;
  readonly insertSite: SiteId | null;
  readonly draft: string;
  readonly notice: string;
  readonly navRows: readonly string[] | null;
  readonly manualPaused: boolean;
  readonly suspended: boolean;
  readonly elapsedTicks: number;
  readonly remainderMs: number;
}

export type GameEvent =
  | { readonly type: "key"; readonly key: string; readonly blocked?: boolean }
  | { readonly type: "build"; readonly site: SiteId; readonly kind: "well" | "ring" }
  | { readonly type: "link"; readonly source: SiteId; readonly target: SiteId }
  | { readonly type: "elapsed"; readonly ms: number }
  | { readonly type: "visibility"; readonly hidden: boolean }
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
export const TICK_MS = 100;
export const WELL_GENERATION = 20;
export const WELL_MANA_CAP = 2000;
export const RING_MANA_CAP = 1000;
export const SUMMON_COST = 1000;
export const IMP_CAP = 5;
const worldSize = WORLD_WIDTH * WORLD_HEIGHT;
const navigation = createNavigation({ columns: WORLD_WIDTH, rows: WORLD_HEIGHT });

function normalMode(): Mode {
  return { $: "Normal", count: 0 };
}

function leaderMode(): LeaderMode {
  return { $: "Leader", count: 0 };
}

function buildMode(): BuildMode {
  return { $: "Build", count: 0 };
}

function insertMode(site: SiteId): InsertMode {
  return { $: "Insert", count: 0, site };
}

function isNavigationMode(mode: GameMode): mode is Mode {
  return mode.$ === "Normal" || mode.$ === "FindRight" || mode.$ === "FindLeft" || mode.$ === "Go";
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

function rulesProfile(value: unknown, label: string): RulesProfile {
  if (value === undefined) return "first-playable";
  if (value === "first-playable" || value === "survival") return value;
  fail(`${label} must be "first-playable" or "survival"`);
}

function integer(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    fail(`${label} must be an integer in ${min}..${max}`);
  }
  return value;
}

function safeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    fail(`${label} must be a nonnegative safe integer`);
  }
  return value;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") fail(`${label} must be a boolean`);
  return value;
}

function isSiteId(value: unknown): value is SiteId {
  return typeof value === "string" && (SITE_IDS as readonly string[]).includes(value);
}

function siteId(value: unknown, label: string): SiteId {
  if (!isSiteId(value)) fail(`${label} must name a fixed site`);
  return value;
}

function siteDefinition(id: SiteId): SiteDefinition | undefined {
  return SITE_DEFINITIONS.find(site => site.id === id);
}

function siteCenter(site: SiteDefinition): Cursor {
  return { x: site.x + 5, y: site.y + 2 };
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
  const mana = integer(value.mana ?? 0, `buildings[${index}].mana`, 0, value.kind === "well" ? WELL_MANA_CAP : RING_MANA_CAP);
  if (value.kind === "well") {
    if (value.produced !== undefined) fail(`buildings[${index}] is a well and cannot have produced`);
    const link = value.link ?? null;
    if (link !== null && !isSiteId(link)) fail(`buildings[${index}].link must name a fixed site`);
    return { site, building: { kind: "well", mana, link } };
  }
  if (value.link !== undefined && value.link !== null) fail(`buildings[${index}] is a ring and cannot have a link`);
  return {
    site,
    building: { kind: "ring", mana, produced: integer(value.produced ?? 0, `buildings[${index}].produced`, 0, IMP_CAP) },
  };
}

function parseScenario(spec: unknown): InternalWorld {
  if (spec === undefined) spec = {};
  if (!isRecord(spec)) fail("scenario must be an object");
  const allowed = new Set([
    "rules", "navigationOnly", "rows", "cursor", "buildings", "pendingSource",
    "manualPaused", "suspended", "elapsedTicks", "remainderMs",
  ]);
  for (const key of Object.keys(spec)) if (!allowed.has(key)) fail(`unknown scenario field ${key}`);
  const rules = rulesProfile(spec.rules, "rules");
  if (spec.navigationOnly !== undefined && typeof spec.navigationOnly !== "boolean") fail("navigationOnly must be boolean");
  const navigationOnly = spec.navigationOnly === true;
  if (!navigationOnly && spec.rows !== undefined) fail("rows require navigationOnly");
  if (rules === "survival" && spec.pendingSource !== undefined && spec.pendingSource !== null) {
    fail("survival scenarios have no fixed sites");
  }
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
  if (rules === "survival" && buildings.size > 0) fail("survival scenarios have no fixed sites or buildings");
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
  const manualPaused = spec.manualPaused === undefined ? false : boolean(spec.manualPaused, "manualPaused");
  const suspended = spec.suspended === undefined ? false : boolean(spec.suspended, "suspended");
  const elapsedTicks = spec.elapsedTicks === undefined ? 0 : safeInteger(spec.elapsedTicks, "elapsedTicks");
  const remainderMs = spec.remainderMs === undefined ? 0 : integer(spec.remainderMs, "remainderMs", 0, 99);
  return {
    rules,
    navigationOnly,
    cursor: position,
    mode: normalMode(),
    buildings,
    pendingSource,
    menuSelection: null,
    buildTarget: null,
    insertSite: null,
    draft: "",
    notice: "",
    navRows,
    manualPaused,
    suspended,
    elapsedTicks,
    remainderMs,
  };
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
  if (world.rules === "first-playable") {
    for (const site of SITE_DEFINITIONS) drawBuilding(cells, site, world.buildings.get(site.id));
    for (const site of SITE_DEFINITIONS) {
      const building = world.buildings.get(site.id);
      if (building?.kind !== "ring") continue;
      for (const slot of IMP_SLOTS.slice(0, building.produced)) {
        put(cells, site.x + RALLY_OFFSET[slot], site.y + RALLY_ROW, "i");
      }
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
  if (world.navigationOnly || world.rules !== "first-playable") return [];
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

export function initial(options: unknown = {}): World {
  if (!isRecord(options)) fail("initial options must be an object");
  for (const key of Object.keys(options)) if (key !== "rules") fail(`unknown initial option ${key}`);
  return construct(parseScenario({ rules: rulesProfile(options.rules, "rules") }));
}

export function scenario(spec: unknown = {}): World {
  return construct(parseScenario(spec));
}

export function snapshot(world: World): Scenario {
  const state = data(world);
  const profile: Pick<Scenario, "rules"> = state.rules === "survival" ? { rules: "survival" } : {};
  if (state.navigationOnly) {
    const rows: Record<string, string> = {};
    for (const [y, row] of (state.navRows ?? []).entries()) {
      if (row.trim() !== "") rows[String(y)] = row;
    }
    return {
      ...profile,
      navigationOnly: true,
      cursor: { ...state.cursor },
      rows,
      ...clockSetup(state),
    };
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
    ...profile,
    cursor: { ...state.cursor },
    buildings,
    ...(state.pendingSource === null ? {} : { pendingSource: state.pendingSource }),
    ...clockSetup(state),
  };
}

function clockSetup(state: InternalWorld): Pick<Scenario, "manualPaused" | "suspended" | "elapsedTicks" | "remainderMs"> {
  return {
    manualPaused: state.manualPaused,
    suspended: state.suspended,
    elapsedTicks: state.elapsedTicks,
    remainderMs: state.remainderMs,
  };
}

export function build(world: World, site: SiteId, kind: "well" | "ring"): World {
  const state = data(world);
  if (!isSiteId(site) || (kind !== "well" && kind !== "ring")) return world;
  if (state.rules !== "first-playable" || state.navigationOnly || state.buildings.has(site)) return world;
  const buildings = new Map(state.buildings);
  buildings.set(site, kind === "well"
    ? { kind: "well", mana: 0, link: null }
    : { kind: "ring", mana: 0, produced: 0 });
  return construct({ ...state, buildings });
}

export function link(world: World, source: SiteId, target: SiteId): World {
  const state = data(world);
  if (!isSiteId(source) || !isSiteId(target) || state.rules !== "first-playable" || state.navigationOnly) return world;
  const well = state.buildings.get(source);
  const ring = state.buildings.get(target);
  if (!well || well.kind !== "well" || !ring || ring.kind !== "ring") return world;
  if (well.link === target) return world;
  const buildings = new Map(state.buildings);
  buildings.set(source, { ...well, link: target });
  return construct({ ...state, buildings });
}

function generate(buildings: Map<SiteId, Building>): void {
  for (const site of SITE_DEFINITIONS) {
    const building = buildings.get(site.id);
    if (building?.kind !== "well") continue;
    buildings.set(site.id, { ...building, mana: Math.min(WELL_MANA_CAP, building.mana + WELL_GENERATION) });
  }
}

function transfer(buildings: Map<SiteId, Building>): void {
  for (const site of SITE_DEFINITIONS) {
    const well = buildings.get(site.id);
    if (well?.kind !== "well" || well.link === null) continue;
    const target = well.link;
    const ring = buildings.get(target);
    if (ring?.kind !== "ring") continue;
    const amount = Math.min(well.mana, RING_MANA_CAP - ring.mana);
    if (amount === 0) continue;
    buildings.set(site.id, { ...well, mana: well.mana - amount });
    buildings.set(target, { ...ring, mana: ring.mana + amount });
  }
}

function summon(buildings: Map<SiteId, Building>): void {
  for (const site of SITE_DEFINITIONS) {
    const ring = buildings.get(site.id);
    if (ring?.kind !== "ring") continue;
    if (ring.produced >= IMP_CAP || ring.mana < SUMMON_COST) continue;
    buildings.set(site.id, { ...ring, mana: ring.mana - SUMMON_COST, produced: ring.produced + 1 });
  }
}

function tick(buildings: Map<SiteId, Building>): void {
  generate(buildings);
  transfer(buildings);
  summon(buildings);
}

export function advance(world: World, milliseconds: number): World {
  const state = data(world);
  const elapsedMs = safeInteger(milliseconds, "elapsed ms");
  if (state.manualPaused || state.suspended) return world;
  const total = BigInt(state.remainderMs) + BigInt(elapsedMs);
  const ticks = total / BigInt(TICK_MS);
  const remainderMs = Number(total % BigInt(TICK_MS));
  if (ticks === 0n) {
    if (remainderMs === state.remainderMs) return world;
    return construct({ ...state, remainderMs });
  }
  const elapsedTicks = BigInt(state.elapsedTicks) + ticks;
  if (elapsedTicks > BigInt(Number.MAX_SAFE_INTEGER)) fail("elapsed ticks exceed the safe integer domain");
  const buildings = new Map(state.buildings);
  for (let index = 0n; index < ticks; index++) tick(buildings);
  return construct({
    ...state,
    buildings,
    elapsedTicks: Number(elapsedTicks),
    remainderMs,
  });
}

function leaderStep(world: World, state: InternalWorld, key: string): World {
  if (!printable(key)) return world;
  if (key !== "f") {
    return construct({
      ...state,
      mode: normalMode(),
      menuSelection: null,
      buildTarget: null,
      notice: "",
    });
  }
  const target = siteAt(world, state.cursor.x, state.cursor.y);
  if (target === null) {
    return construct({
      ...state,
      mode: normalMode(),
      menuSelection: null,
      buildTarget: null,
      notice: "No site at cursor",
    });
  }
  return construct({
    ...state,
    mode: buildMode(),
    menuSelection: "well",
    buildTarget: target,
    notice: `Build WELL at ${target}`,
  });
}

function buildStep(world: World, state: InternalWorld, key: string): World {
  if (key === "Enter") {
    const target = state.buildTarget;
    if (target === null) {
      return construct({
        ...state,
        mode: normalMode(),
        menuSelection: null,
        buildTarget: null,
        notice: "No build target",
      });
    }
    if (state.buildings.has(target)) {
      return construct({
        ...state,
        mode: normalMode(),
        menuSelection: null,
        buildTarget: null,
        notice: `${target} is occupied`,
      });
    }
    const kind = state.menuSelection ?? "well";
    const next = data(build(world, target, kind));
    return construct({
      ...next,
      mode: normalMode(),
      menuSelection: null,
      buildTarget: null,
      notice: `Built ${kind.toUpperCase()} at ${target}`,
    });
  }
  if (!printable(key)) return world;
  if (key === "w" || key === "r") {
    const menuSelection: MenuSelection = key === "w" ? "well" : "ring";
    return construct({
      ...state,
      menuSelection,
      notice: `Build ${menuSelection.toUpperCase()} at ${state.buildTarget ?? "—"}`,
    });
  }
  return world;
}

function insertStep(world: World, state: InternalWorld, key: string): World {
  const site = state.insertSite;
  if (site === null) return construct({ ...state, mode: normalMode(), draft: "", insertSite: null, notice: "" });
  const building = state.buildings.get(site);
  if (key === "Backspace") {
    if (state.draft === "") return world;
    return construct({ ...state, draft: Array.from(state.draft).slice(0, -1).join("") });
  }
  if (key === "Escape") {
    if (building?.kind === "well" && state.draft === "connect") {
      return construct({
        ...state,
        mode: normalMode(),
        pendingSource: site,
        insertSite: null,
        draft: "",
        notice: `Source ${site}`,
      });
    }
    return construct({
      ...state,
      mode: normalMode(),
      insertSite: null,
      draft: "",
      notice: "",
    });
  }
  if (key === "Enter") {
    if (state.draft !== "connect") {
      return construct({
        ...state,
        mode: normalMode(),
        insertSite: null,
        draft: "",
        notice: `Unknown command ${state.draft === "" ? "—" : state.draft}`,
      });
    }
    if (building?.kind === "well") {
      return construct({
        ...state,
        mode: normalMode(),
        pendingSource: site,
        insertSite: null,
        draft: "",
        notice: `Source ${site}`,
      });
    }
    if (building?.kind === "ring") {
      if (state.pendingSource === null) {
        return construct({
          ...state,
          mode: normalMode(),
          insertSite: null,
          draft: "",
          notice: `No source for ${site}`,
        });
      }
      const source = state.buildings.get(state.pendingSource);
      if (!source || source.kind !== "well") {
        return construct({
          ...state,
          mode: normalMode(),
          insertSite: null,
          draft: "",
          notice: `Invalid source ${state.pendingSource}`,
        });
      }
      const next = data(link(world, state.pendingSource, site));
      return construct({
        ...next,
        mode: normalMode(),
        pendingSource: null,
        insertSite: null,
        draft: "",
        notice: `Linked ${state.pendingSource} to ${site}`,
      });
    }
    return construct({
      ...state,
      mode: normalMode(),
      insertSite: null,
      draft: "",
      notice: `No building at ${site}`,
    });
  }
  if (!printable(key)) return world;
  if (Array.from(state.draft).length >= 32) return world;
  return construct({ ...state, draft: state.draft + key });
}

function cancelInteraction(state: InternalWorld): InternalWorld {
  return {
    ...state,
    mode: normalMode(),
    pendingSource: null,
    menuSelection: null,
    buildTarget: null,
    insertSite: null,
    draft: "",
    notice: "",
  };
}

export function dispatch(world: World, event: GameEvent): World {
  const state = data(world);
  if (event.type === "blur") return construct(cancelInteraction(state));
  if (event.type === "build") return build(world, event.site, event.kind);
  if (event.type === "link") return link(world, event.source, event.target);
  if (event.type === "elapsed") return advance(world, event.ms);
  if (event.type === "visibility") {
    if (typeof event.hidden !== "boolean") throw new Error("Unsupported game event.");
    return construct({
      ...(event.hidden ? cancelInteraction(state) : state),
      suspended: event.hidden,
      remainderMs: 0,
    });
  }
  if (event.type !== "key") throw new Error("Unsupported game event.");
  if (event.blocked === true) return world;
  if (state.mode.$ === "Insert") return insertStep(world, state, event.key);
  if (event.key === "Escape") {
    return construct({
      ...state,
      mode: normalMode(),
      pendingSource: isNavigationMode(state.mode) && state.mode.$ === "Normal" ? null : state.pendingSource,
      menuSelection: null,
      buildTarget: null,
      insertSite: null,
      draft: "",
      notice: "",
    });
  }
  if (state.mode.$ === "Leader") return leaderStep(world, state, event.key);
  if (state.mode.$ === "Build") return buildStep(world, state, event.key);
  if (state.mode.$ === "Normal" && event.key === "p") {
    const manualPaused = !state.manualPaused;
    return construct({
      ...state,
      mode: normalMode(),
      manualPaused,
      remainderMs: 0,
      notice: manualPaused ? "Paused" : "Running",
    });
  }
  if (state.mode.$ === "Normal" && event.key === " ") {
    return construct({
      ...state,
      mode: leaderMode(),
      menuSelection: null,
      buildTarget: null,
      notice: "Leader: f build",
    });
  }
  if (state.mode.$ === "Normal" && event.key === "i") {
    const target = siteAt(world, state.cursor.x, state.cursor.y);
    if (target === null) {
      return construct({ ...state, notice: "No building at cursor" });
    }
    const building = state.buildings.get(target);
    if (!building) {
      return construct({ ...state, notice: `${target} is empty` });
    }
    return construct({
      ...state,
      mode: insertMode(target),
      insertSite: target,
      draft: "",
      menuSelection: null,
      buildTarget: null,
      notice: `Insert at ${target}: connect`,
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
  const links: LinkObservation[] = [];
  let buildingCount = 0;
  let impCount = 0;
  let pendingFrom: Cursor | null = null;
  if (!state.navigationOnly && state.rules === "first-playable") {
    for (const site of SITE_DEFINITIONS) {
      const building = state.buildings.get(site.id);
      if (!building) {
        sites[site.id] = { kind: "empty" };
      } else {
        buildingCount++;
        if (building.kind === "well") {
          sites[site.id] = { kind: "well", mana: building.mana, link: building.link };
          if (building.link !== null) {
            const target = siteDefinition(building.link);
            if (target) links.push({
              source: site.id,
              target: building.link,
              from: siteCenter(site),
              to: siteCenter(target),
            });
          }
          if (state.pendingSource === site.id) pendingFrom = siteCenter(site);
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
    menuSelection: state.menuSelection,
    buildTarget: state.buildTarget,
    insertSite: state.insertSite,
    pendingFrom,
    notice: state.notice,
    commandBuffer: state.draft,
    manualPaused: state.manualPaused,
    suspended: state.suspended,
    elapsedTicks: state.elapsedTicks,
    remainderMs: state.remainderMs,
    siteCount: state.navigationOnly || state.rules !== "first-playable" ? 0 : SITE_DEFINITIONS.length,
    buildingCount,
    impCount,
    siteAtCursor: siteAt(world, state.cursor.x, state.cursor.y),
    sites,
    links,
    imps: impsOf(state),
  };
}

export function siteAt(world: World, x: number, y: number): SiteId | null {
  const state = data(world);
  if (state.rules !== "first-playable" || state.navigationOnly || !Number.isInteger(x) || !Number.isInteger(y)) return null;
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

export function preview(world: World, site: SiteId, kind: "well" | "ring"): GlyphField {
  const state = data(world);
  if (!isSiteId(site) || (kind !== "well" && kind !== "ring")) return field(world);
  if (state.rules !== "first-playable" || state.navigationOnly || state.buildings.has(site)) return field(world);
  const definition = SITE_DEFINITIONS.find(candidate => candidate.id === site);
  if (!definition) return field(world);
  const cells = Array.from(text(world));
  drawBuilding(cells, definition, kind === "well"
    ? { kind: "well", mana: 0, link: null }
    : { kind: "ring", mana: 0, produced: 0 });
  return { width: WORLD_WIDTH, height: WORLD_HEIGHT, text: cells.join("") };
}

export function imps(world: World): readonly Imp[] {
  return impsOf(data(world));
}
