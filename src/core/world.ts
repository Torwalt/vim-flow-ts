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
export const MAX_BUILDINGS = 32;
export const GATE_CENTER: Cursor = { x: 200, y: 136 };
export const GATE_RESERVED = { x: 198, y: 134, width: 5, height: 5 } as const;
export const DEFAULT_RALLY: Cursor = { x: 13, y: 10 };

export type RulesProfile = (typeof RULES_PROFILES)[number];
export type SiteId = (typeof SITE_IDS)[number];
export type DynamicBuildingId = `b${string}`;
export type BuildingId = SiteId | DynamicBuildingId;
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
  readonly link: BuildingId | null;
  readonly name?: string;
}

export interface Ring {
  readonly kind: "ring";
  readonly mana: number;
  readonly produced: number;
  readonly name?: string;
}

export type Building = Well | Ring;

export interface Imp {
  readonly ring: SiteId;
  readonly slot: ImpSlot;
  readonly x: number;
  readonly y: number;
}

export type Faction = "ally" | "enemy";

export interface TroopObservation {
  readonly id: string;
  readonly faction: Faction;
  readonly ring: DynamicBuildingId | null;
  readonly serial: number | null;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly nextAttackTick: number;
}

export type SiteObservation =
  | { readonly kind: "empty" }
  | { readonly kind: "well"; readonly mana: number; readonly link: SiteId | null }
  | { readonly kind: "ring"; readonly mana: number; readonly produced: number };

export interface LinkObservation {
  readonly source: BuildingId;
  readonly target: BuildingId;
  readonly from: Cursor;
  readonly to: Cursor;
}

export type BuildingObservation =
  | {
    readonly id: DynamicBuildingId;
    readonly kind: "well";
    readonly center: Cursor;
    readonly mana: number;
    readonly link: DynamicBuildingId | null;
    readonly name: string;
  }
  | {
    readonly id: DynamicBuildingId;
    readonly kind: "ring";
    readonly center: Cursor;
    readonly mana: number;
    readonly produced: number;
    readonly living: number;
    readonly name: string;
  };

export type FinderEntry =
  | {
    readonly destination: "building";
    readonly name: string;
    readonly type: "mana well" | "summoning ring";
    readonly id: DynamicBuildingId;
  }
  | {
    readonly destination: "rally";
    readonly name: "Rally";
    readonly type: "rally";
    readonly id: "rally";
  }
  | {
    readonly destination: "gate";
    readonly name: "Enemy gate";
    readonly type: "spawn";
    readonly id: "gate";
  };

export interface FinderObservation {
  readonly query: string;
  readonly selection: number;
  readonly entries: readonly FinderEntry[];
}

export interface Observation {
  readonly width: number;
  readonly height: number;
  readonly cursor: Cursor;
  readonly mode: string;
  readonly count: number;
  readonly pendingSource: BuildingId | null;
  readonly menuSelection: MenuSelection | null;
  readonly buildTarget: SiteId | null;
  readonly insertSite: BuildingId | null;
  readonly insertCell: Cursor | null;
  readonly nameTarget: DynamicBuildingId | null;
  readonly candidates: readonly string[];
  readonly finder: FinderObservation | null;
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
  readonly siteAtCursor: BuildingId | null;
  readonly sites: Readonly<Partial<Record<SiteId, SiteObservation>>>;
  readonly buildings: readonly BuildingObservation[];
  readonly rally: Cursor | null;
  readonly links: readonly LinkObservation[];
  readonly imps: readonly Imp[];
  readonly troops: readonly TroopObservation[];
  readonly cursorHp: number;
  readonly kills: number;
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

export interface SurvivalBuildingSetup {
  readonly id: DynamicBuildingId;
  readonly kind: "well" | "ring";
  readonly center: Cursor;
  readonly mana?: number;
  readonly link?: DynamicBuildingId | null;
  readonly produced?: number;
  readonly name?: string;
}

export interface SurvivalAlliedSetup {
  readonly faction: "ally";
  readonly ring: DynamicBuildingId;
  readonly serial: number;
  readonly x: number;
  readonly y: number;
  readonly hp?: number;
  readonly nextAttackTick?: number;
}

export interface SurvivalEnemySetup {
  readonly faction: "enemy";
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly hp?: number;
  readonly nextAttackTick?: number;
}

export type SurvivalTroopSetup = SurvivalAlliedSetup | SurvivalEnemySetup;

export interface Scenario {
  readonly rules?: RulesProfile;
  readonly navigationOnly?: boolean;
  readonly rows?: Readonly<Record<string, string>>;
  readonly cursor?: Cursor;
  readonly buildings?: readonly (BuildingSetup | SurvivalBuildingSetup)[];
  readonly pendingSource?: BuildingId | null;
  readonly rally?: Cursor;
  readonly troops?: readonly SurvivalTroopSetup[];
  readonly cursorHp?: number;
  readonly kills?: number;
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

interface Placement {
  readonly id: BuildingId;
  readonly x: number;
  readonly y: number;
}

type LeaderMode = { readonly $: "Leader"; readonly count: 0 };
type BuildMode = { readonly $: "Build"; readonly count: 0 };
type InsertMode = { readonly $: "Insert"; readonly count: 0; readonly site: BuildingId | null };
type NameMode = { readonly $: "Name"; readonly count: 0; readonly id: DynamicBuildingId };
type FinderMode = { readonly $: "Finder"; readonly count: 0 };
type GameMode = Mode | LeaderMode | BuildMode | InsertMode | NameMode | FinderMode;

interface TroopBase {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly nextAttackTick: number;
}

interface AlliedTroop extends TroopBase {
  readonly faction: "ally";
  readonly ring: DynamicBuildingId;
  readonly serial: number;
}

interface EnemyTroop extends TroopBase {
  readonly faction: "enemy";
  readonly ring: null;
  readonly serial: null;
}

type Troop = AlliedTroop | EnemyTroop;

interface InternalWorld {
  readonly rules: RulesProfile;
  readonly navigationOnly: boolean;
  readonly cursor: Cursor;
  readonly mode: GameMode;
  readonly buildings: ReadonlyMap<BuildingId, Building>;
  readonly dynamic: ReadonlyMap<DynamicBuildingId, Cursor>;
  readonly rally: Cursor | null;
  readonly troops: readonly Troop[];
  readonly cursorHp: number;
  readonly kills: number;
  readonly pendingSource: BuildingId | null;
  readonly menuSelection: MenuSelection | null;
  readonly buildTarget: SiteId | null;
  readonly insertSite: BuildingId | null;
  readonly insertCell: Cursor | null;
  readonly nameTarget: DynamicBuildingId | null;
  readonly finderOrigin: Cursor | null;
  readonly finderSelection: number;
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
  | { readonly type: "link"; readonly source: BuildingId; readonly target: BuildingId }
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
export const CURSOR_MAX_HP = 10;
export const ALLY_HP = 4;
export const ENEMY_HP = 3;
export const ATTACK_COOLDOWN = 10;
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

function insertMode(site: BuildingId | null): InsertMode {
  return { $: "Insert", count: 0, site };
}

function nameMode(id: DynamicBuildingId): NameMode {
  return { $: "Name", count: 0, id };
}

function finderMode(): FinderMode {
  return { $: "Finder", count: 0 };
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
    insertCell: data.insertCell === null ? null : Object.freeze({ ...data.insertCell }),
    finderOrigin: data.finderOrigin === null ? null : Object.freeze({ ...data.finderOrigin }),
    buildings: new Map(data.buildings),
    dynamic: new Map(data.dynamic),
    troops: Object.freeze(data.troops.map(troop => Object.freeze({ ...troop }))),
    rally: data.rally === null ? null : Object.freeze({ ...data.rally }),
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

function isDynamicBuildingId(value: unknown): value is DynamicBuildingId {
  return typeof value === "string" && /^b(00[1-9]|0[12][0-9]|03[0-2])$/.test(value);
}

function dynamicBuildingId(value: unknown, label: string): DynamicBuildingId {
  if (!isDynamicBuildingId(value)) fail(`${label} must be a survival building id from b001 to b032`);
  return value;
}

const NAME_PATTERN = /^[A-Za-z0-9 _-]{0,20}$/;
const GROUND_COMMANDS = ["mana well", "summoning ring", "rally"] as const;
const BUILDING_COMMANDS = ["connect", "rally"] as const;
const SURVIVAL_COMMANDS = [...GROUND_COMMANDS, ...BUILDING_COMMANDS] as const;

function defaultBuildingName(kind: "well" | "ring", id: DynamicBuildingId): string {
  return `${kind === "well" ? "Well" : "Ring"} ${id}`;
}

function buildingName(value: unknown, kind: "well" | "ring", id: DynamicBuildingId, label: string): string {
  if (value === undefined) return defaultBuildingName(kind, id);
  if (typeof value !== "string" || !NAME_PATTERN.test(value)) {
    fail(`${label} must be at most 20 ASCII letters, digits, spaces, underscores or hyphens`);
  }
  return value.trim() === "" ? defaultBuildingName(kind, id) : value;
}

function trimmedName(value: string): string {
  return value.replace(/^ +/, "").replace(/ +$/, "");
}

function commandCandidates(state: InternalWorld): readonly string[] {
  const building = state.insertSite === null ? undefined : state.buildings.get(state.insertSite);
  return building === undefined ? GROUND_COMMANDS : BUILDING_COMMANDS;
}

function candidateMatches(state: InternalWorld): readonly string[] {
  return commandCandidates(state).filter(command => command.startsWith(state.draft));
}

function asciiLower(value: string): string {
  return value.replace(/[A-Z]/g, character => String.fromCharCode(character.charCodeAt(0) + 32));
}

function compareTroopIds(left: { readonly id: string }, right: { readonly id: string }): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function isSubsequence(query: string, text: string): boolean {
  let matched = 0;
  for (const character of text) {
    if (matched < query.length && character === query[matched]) matched++;
  }
  return matched === query.length;
}

function finderEntries(state: InternalWorld): readonly FinderEntry[] {
  const entries: FinderEntry[] = [];
  for (const id of [...state.dynamic.keys()].sort()) {
    const building = state.buildings.get(id);
    if (!building) continue;
    entries.push({
      destination: "building",
      name: building.name ?? defaultBuildingName(building.kind, id),
      type: building.kind === "well" ? "mana well" : "summoning ring",
      id,
    });
  }
  entries.push({ destination: "rally", name: "Rally", type: "rally", id: "rally" });
  entries.push({ destination: "gate", name: "Enemy gate", type: "spawn", id: "gate" });
  return entries.sort((left, right) => {
    const leftName = asciiLower(left.name);
    const rightName = asciiLower(right.name);
    if (leftName !== rightName) return leftName < rightName ? -1 : 1;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
}

function finderMatches(state: InternalWorld): readonly FinderEntry[] {
  const query = asciiLower(state.draft);
  return finderEntries(state).filter(entry =>
    isSubsequence(query, asciiLower(`${entry.name} ${entry.type} ${entry.id}`)),
  );
}

function position(value: unknown, label: string): Cursor {
  if (!isRecord(value)) fail(`${label} must be an object`);
  return {
    x: integer(value.x, `${label}.x`, 0, WORLD_WIDTH - 1),
    y: integer(value.y, `${label}.y`, 0, WORLD_HEIGHT - 1),
  };
}

function cursor(value: unknown): Cursor {
  return position(value, "cursor");
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function patch(center: Cursor): Rect {
  return { x: center.x - 5, y: center.y - 2, width: SITE_WIDTH, height: SITE_HEIGHT };
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width
    && a.y < b.y + b.height && b.y < a.y + a.height;
}

function inside(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}

function insideInterior(center: Cursor): boolean {
  const rect = patch(center);
  return rect.x >= 1 && rect.y >= 1
    && rect.x + rect.width - 1 <= WORLD_WIDTH - 2
    && rect.y + rect.height - 1 <= WORLD_HEIGHT - 2;
}

function overlapsGate(center: Cursor): boolean {
  return overlaps(patch(center), GATE_RESERVED);
}

function buildingCenter(value: unknown, label: string): Cursor {
  const center = position(value, label);
  if (!insideInterior(center)) fail(`${label} footprint must stay inside the interior`);
  if (overlapsGate(center)) fail(`${label} footprint overlaps the enemy gate`);
  return center;
}

function rallyCell(value: unknown, label: string): Cursor {
  const cell = position(value, label);
  if (cell.x < 1 || cell.y < 1 || cell.x > WORLD_WIDTH - 2 || cell.y > WORLD_HEIGHT - 2) {
    fail(`${label} must be an interior cell`);
  }
  if (inside(GATE_RESERVED, cell.x, cell.y)) fail(`${label} must stay outside the enemy gate`);
  return cell;
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

function survivalBuildingSetup(value: unknown, index: number): { id: DynamicBuildingId; center: Cursor; building: Building } {
  if (!isRecord(value)) fail(`buildings[${index}] must be an object`);
  if (value.site !== undefined) fail(`buildings[${index}] must not name a fixed site`);
  const id = dynamicBuildingId(value.id, `buildings[${index}].id`);
  const center = buildingCenter(value.center, `buildings[${index}].center`);
  if (value.kind !== "well" && value.kind !== "ring") fail(`buildings[${index}].kind must be well or ring`);
  const mana = integer(value.mana ?? 0, `buildings[${index}].mana`, 0, value.kind === "well" ? WELL_MANA_CAP : RING_MANA_CAP);
  const name = buildingName(value.name, value.kind, id, `buildings[${index}].name`);
  if (value.kind === "well") {
    if (value.produced !== undefined) fail(`buildings[${index}] is a well and cannot have produced`);
    const link = value.link ?? null;
    if (link !== null && !isDynamicBuildingId(link)) fail(`buildings[${index}].link must name a survival building`);
    return { id, center, building: { kind: "well", mana, link, name } };
  }
  if (value.link !== undefined && value.link !== null) fail(`buildings[${index}] is a ring and cannot have a link`);
  return {
    id,
    center,
    building: {
      kind: "ring",
      mana,
      produced: value.produced === undefined ? 0 : safeInteger(value.produced, `buildings[${index}].produced`),
      name,
    },
  };
}

const TROOP_ID_PATTERN = /^[A-Za-z0-9_.:#-]{1,32}$/;
const ALLY_TROOP_ID_PATTERN = /^b(00[1-9]|0[12][0-9]|03[0-2])#\d+$/;

function troopPosition(value: Record<string, unknown>, label: string): Cursor {
  const cell = position(value, label);
  if (cell.x < 1 || cell.y < 1 || cell.x > WORLD_WIDTH - 2 || cell.y > WORLD_HEIGHT - 2) {
    fail(`${label} must be an interior cell`);
  }
  return cell;
}

function survivalTroopSetup(value: unknown, index: number, buildings: ReadonlyMap<BuildingId, Building>): Troop {
  const label = `troops[${index}]`;
  if (!isRecord(value)) fail(`${label} must be an object`);
  const cell = troopPosition(value, label);
  if (value.faction !== "ally" && value.faction !== "enemy") fail(`${label}.faction must be ally or enemy`);
  const nextAttackTick = value.nextAttackTick === undefined
    ? 0
    : safeInteger(value.nextAttackTick, `${label}.nextAttackTick`);
  if (value.faction === "ally") {
    const ring = dynamicBuildingId(value.ring, `${label}.ring`);
    const building = buildings.get(ring);
    if (!building || building.kind !== "ring") fail(`${label}.ring must name a built ring`);
    const serial = safeInteger(value.serial, `${label}.serial`);
    if (serial < 1) fail(`${label}.serial must be positive`);
    if (serial > building.produced) fail(`${label}.serial must not exceed the ring produced count`);
    return {
      id: `${ring}#${serial}`,
      faction: "ally",
      ring,
      serial,
      x: cell.x,
      y: cell.y,
      hp: value.hp === undefined ? ALLY_HP : integer(value.hp, `${label}.hp`, 1, ALLY_HP),
      nextAttackTick,
    };
  }
  if (value.ring !== undefined) fail(`${label}.ring is only available to allies`);
  if (typeof value.id !== "string" || !TROOP_ID_PATTERN.test(value.id)) {
    fail(`${label}.id must be 1..32 ASCII letters, digits or _.:#-`);
  }
  if (ALLY_TROOP_ID_PATTERN.test(value.id)) fail(`${label}.id must not use the allied ring#serial form`);
  return {
    id: value.id,
    faction: "enemy",
    ring: null,
    serial: null,
    x: cell.x,
    y: cell.y,
    hp: value.hp === undefined ? ENEMY_HP : integer(value.hp, `${label}.hp`, 1, ENEMY_HP),
    nextAttackTick,
  };
}

function parseTroops(spec: unknown, buildings: ReadonlyMap<BuildingId, Building>, cursorCell: Cursor): readonly Troop[] {
  if (spec === undefined) return [];
  if (!Array.isArray(spec)) fail("troops must be an array");
  const troops: Troop[] = [];
  const ids = new Set<string>();
  const cells = new Set<string>();
  for (const [index, value] of spec.entries()) {
    const troop = survivalTroopSetup(value, index, buildings);
    if (ids.has(troop.id)) fail(`duplicate troop id ${troop.id}`);
    const cell = `${troop.x},${troop.y}`;
    if (cells.has(cell)) fail(`troops overlap at ${cell}`);
    if (troop.faction === "enemy" && troop.x === cursorCell.x && troop.y === cursorCell.y) {
      fail(`enemy ${troop.id} overlaps the cursor`);
    }
    ids.add(troop.id);
    cells.add(cell);
    troops.push(troop);
  }
  return troops;
}

function parseScenario(spec: unknown): InternalWorld {
  if (spec === undefined) spec = {};
  if (!isRecord(spec)) fail("scenario must be an object");
  const allowed = new Set([
    "rules", "navigationOnly", "rows", "cursor", "buildings", "pendingSource", "rally",
    "troops", "cursorHp", "kills", "manualPaused", "suspended", "elapsedTicks", "remainderMs",
  ]);
  for (const key of Object.keys(spec)) if (!allowed.has(key)) fail(`unknown scenario field ${key}`);
  const rules = rulesProfile(spec.rules, "rules");
  if (spec.navigationOnly !== undefined && typeof spec.navigationOnly !== "boolean") fail("navigationOnly must be boolean");
  const navigationOnly = spec.navigationOnly === true;
  if (!navigationOnly && spec.rows !== undefined) fail("rows require navigationOnly");
  if (rules !== "survival" && spec.rally !== undefined) fail("rally is only available in survival");
  if (rules !== "survival" && spec.troops !== undefined) fail("troops are only available in survival");
  if (rules !== "survival" && spec.cursorHp !== undefined) fail("cursorHp is only available in survival");
  if (rules !== "survival" && spec.kills !== undefined) fail("kills are only available in survival");
  if (navigationOnly && spec.troops !== undefined) fail("navigationOnly has no troops");
  const navRows = navigationOnly && spec.rows !== undefined ? rows(spec.rows) : navigationOnly ? Array.from({ length: WORLD_HEIGHT }, () => " ".repeat(WORLD_WIDTH)) : null;
  const position = spec.cursor === undefined ? { ...INITIAL_CURSOR } : cursor(spec.cursor);
  const buildings = new Map<BuildingId, Building>();
  const dynamic = new Map<DynamicBuildingId, Cursor>();
  if (spec.buildings !== undefined) {
    if (!Array.isArray(spec.buildings)) fail("buildings must be an array");
    for (const [index, value] of spec.buildings.entries()) {
      if (rules === "survival") {
        const parsed = survivalBuildingSetup(value, index);
        if (buildings.has(parsed.id)) fail(`duplicate building id ${parsed.id}`);
        for (const [other, center] of dynamic) {
          if (overlaps(patch(parsed.center), patch(center))) fail(`buildings[${index}] overlaps ${other}`);
        }
        if (dynamic.size >= MAX_BUILDINGS) fail(`buildings may not exceed ${MAX_BUILDINGS}`);
        buildings.set(parsed.id, parsed.building);
        dynamic.set(parsed.id, parsed.center);
      } else {
        const parsed = buildingSetup(value, index);
        if (buildings.has(parsed.site)) fail(`duplicate building site ${parsed.site}`);
        buildings.set(parsed.site, parsed.building);
      }
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
    : rules === "survival"
      ? dynamicBuildingId(spec.pendingSource, "pendingSource")
      : siteId(spec.pendingSource, "pendingSource");
  if (pendingSource !== null) {
    const source = buildings.get(pendingSource);
    if (!source || source.kind !== "well") fail(`pendingSource ${pendingSource} must name a built well`);
  }
  const rally = rules === "survival"
    ? spec.rally === undefined ? { ...DEFAULT_RALLY } : rallyCell(spec.rally, "rally")
    : null;
  const troops = rules === "survival" ? parseTroops(spec.troops, buildings, position) : [];
  const cursorHp = rules === "survival"
    ? spec.cursorHp === undefined ? CURSOR_MAX_HP : integer(spec.cursorHp, "cursorHp", 0, CURSOR_MAX_HP)
    : CURSOR_MAX_HP;
  const kills = rules === "survival"
    ? spec.kills === undefined ? 0 : safeInteger(spec.kills, "kills")
    : 0;
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
    dynamic,
    rally,
    troops,
    cursorHp,
    kills,
    pendingSource,
    menuSelection: null,
    buildTarget: null,
    insertSite: null,
    insertCell: null,
    nameTarget: null,
    finderOrigin: null,
    finderSelection: 0,
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

function drawClusters(cells: string[]): void {
  for (let c = 0; c < 10; c++) {
    for (let r = 0; r < 10; r++) {
      const x = 8 + 24 * c;
      const y = 8 + 16 * r;
      const clusterRows = (c + r) % 2 === 0 ? ["^^^", " ^ "] : ["oo ", " o "];
      const rect = { x, y, width: 3, height: 2 };
      if (x < 1 || y < 1 || x + 2 > WORLD_WIDTH - 2 || y + 1 > WORLD_HEIGHT - 2) continue;
      if (overlaps(rect, GATE_RESERVED)) continue;
      for (const [offsetY, row] of clusterRows.entries()) {
        for (const [offsetX, glyph] of Array.from(row).entries()) {
          const index = (y + offsetY) * WORLD_WIDTH + x + offsetX;
          if (glyph !== " " && cells[index] === " ") cells[index] = glyph;
        }
      }
    }
  }
}

function drawBuilding(cells: string[], site: Placement, building: Building | undefined): void {
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

function drawGate(cells: string[]): void {
  put(cells, GATE_CENTER.x - 1, GATE_CENTER.y - 1, "/O\\");
  put(cells, GATE_CENTER.x - 1, GATE_CENTER.y, "|O|");
  put(cells, GATE_CENTER.x - 1, GATE_CENTER.y + 1, "\\O/");
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
  } else {
    drawClusters(cells);
    drawGate(cells);
    for (const [id, center] of world.dynamic) {
      drawBuilding(cells, { id, x: center.x - 5, y: center.y - 2 }, world.buildings.get(id));
    }
    for (const troop of [...world.troops].sort(compareTroopIds)) put(cells, troop.x, troop.y, "i");
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
  if (state.rules === "survival") {
    const buildings: SurvivalBuildingSetup[] = [];
    for (const id of [...state.dynamic.keys()].sort()) {
      const building = state.buildings.get(id);
      const center = state.dynamic.get(id);
      if (!building || !center) continue;
      const name = building.name ?? defaultBuildingName(building.kind, id);
      buildings.push(building.kind === "well"
        ? { id, kind: "well", center: { ...center }, mana: building.mana, link: isDynamicBuildingId(building.link) ? building.link : null, name }
        : { id, kind: "ring", center: { ...center }, mana: building.mana, produced: building.produced, name });
    }
    const troops: SurvivalTroopSetup[] = [...state.troops].sort(compareTroopIds).map(troop => troop.faction === "ally"
      ? {
        faction: "ally",
        ring: troop.ring,
        serial: troop.serial,
        x: troop.x,
        y: troop.y,
        hp: troop.hp,
        nextAttackTick: troop.nextAttackTick,
      }
      : {
        faction: "enemy",
        id: troop.id,
        x: troop.x,
        y: troop.y,
        hp: troop.hp,
        nextAttackTick: troop.nextAttackTick,
      });
    return {
      ...profile,
      cursor: { ...state.cursor },
      buildings,
      ...(state.pendingSource === null ? {} : { pendingSource: state.pendingSource }),
      rally: { ...(state.rally ?? DEFAULT_RALLY) },
      troops,
      cursorHp: state.cursorHp,
      kills: state.kills,
      ...clockSetup(state),
    };
  }
  const buildings: BuildingSetup[] = [];
  for (const site of SITE_DEFINITIONS) {
    const building = state.buildings.get(site.id);
    if (!building) continue;
    buildings.push(building.kind === "well"
      ? { site: site.id, kind: "well", mana: building.mana, link: isSiteId(building.link) ? building.link : null }
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

interface PlacementResult {
  readonly state: InternalWorld;
  readonly id: DynamicBuildingId | null;
  readonly notice: string;
}

function placementFailure(state: InternalWorld, notice: string): PlacementResult {
  return { state, id: null, notice };
}

function placeSurvival(state: InternalWorld, center: Cursor, kind: "well" | "ring"): PlacementResult {
  if (state.rules !== "survival" || state.navigationOnly) {
    return placementFailure(state, "Cannot build outside the survival profile");
  }
  if (!isRecord(center) || !Number.isInteger(center.x) || !Number.isInteger(center.y)) {
    return placementFailure(state, "Cannot build: the placement center must be a whole cell");
  }
  const cell = { x: center.x, y: center.y };
  if (!insideInterior(cell)) {
    return placementFailure(state, "Cannot build: the footprint must stay inside the world");
  }
  if (overlapsGate(cell)) {
    return placementFailure(state, "Cannot build: the footprint overlaps the enemy gate");
  }
  if (state.dynamic.size >= MAX_BUILDINGS) {
    return placementFailure(state, `Cannot build: the ${MAX_BUILDINGS}-building limit is reached`);
  }
  for (const [other, otherCenter] of state.dynamic) {
    if (overlaps(patch(cell), patch(otherCenter))) {
      return placementFailure(state, `Cannot build: the footprint overlaps ${other}`);
    }
  }
  const area = patch(cell);
  for (const troop of state.troops) {
    if (inside(area, troop.x, troop.y)) return placementFailure(state, "Cannot build: an imp occupies the footprint");
  }
  let id: DynamicBuildingId | null = null;
  for (let index = 1; index <= MAX_BUILDINGS; index++) {
    const candidate = `b${String(index).padStart(3, "0")}` as DynamicBuildingId;
    if (!state.buildings.has(candidate)) {
      id = candidate;
      break;
    }
  }
  if (id === null) return placementFailure(state, `Cannot build: the ${MAX_BUILDINGS}-building limit is reached`);
  const buildings = new Map(state.buildings);
  const name = defaultBuildingName(kind, id);
  buildings.set(id, kind === "well"
    ? { kind: "well", mana: 0, link: null, name }
    : { kind: "ring", mana: 0, produced: 0, name });
  const dynamic = new Map(state.dynamic);
  dynamic.set(id, { ...cell });
  return {
    state: { ...state, buildings, dynamic },
    id,
    notice: `Built ${kind.toUpperCase()} ${id}`,
  };
}

export function place(world: World, center: Cursor, kind: "well" | "ring"): World {
  const state = data(world);
  if (state.rules !== "survival" || state.navigationOnly) return world;
  if (kind !== "well" && kind !== "ring") return world;
  if (!isRecord(center)) return world;
  const result = placeSurvival(state, center, kind);
  return result.id === null ? world : construct(result.state);
}

export function link(world: World, source: BuildingId, target: BuildingId): World {
  const state = data(world);
  if (state.navigationOnly) return world;
  const dynamic = state.rules === "survival";
  if (dynamic) {
    if (!isDynamicBuildingId(source) || !isDynamicBuildingId(target)) return world;
  } else if (!isSiteId(source) || !isSiteId(target)) {
    return world;
  }
  const well = state.buildings.get(source);
  const ring = state.buildings.get(target);
  if (!well || well.kind !== "well" || !ring || ring.kind !== "ring") return world;
  if (well.link === target) return world;
  const buildings = new Map(state.buildings);
  buildings.set(source, { ...well, link: target });
  return construct({ ...state, buildings });
}

function generate(buildings: Map<BuildingId, Building>, ids: readonly BuildingId[]): void {
  for (const id of ids) {
    const building = buildings.get(id);
    if (building?.kind !== "well") continue;
    buildings.set(id, { ...building, mana: Math.min(WELL_MANA_CAP, building.mana + WELL_GENERATION) });
  }
}

function transfer(buildings: Map<BuildingId, Building>, ids: readonly BuildingId[]): void {
  for (const id of ids) {
    const well = buildings.get(id);
    if (well?.kind !== "well" || well.link === null) continue;
    const target = well.link;
    const ring = buildings.get(target);
    if (ring?.kind !== "ring") continue;
    const amount = Math.min(well.mana, RING_MANA_CAP - ring.mana);
    if (amount === 0) continue;
    buildings.set(id, { ...well, mana: well.mana - amount });
    buildings.set(target, { ...ring, mana: ring.mana + amount });
  }
}

function summonLegacy(buildings: Map<BuildingId, Building>, ids: readonly BuildingId[]): void {
  for (const id of ids) {
    const ring = buildings.get(id);
    if (ring?.kind !== "ring") continue;
    if (ring.produced >= IMP_CAP || ring.mana < SUMMON_COST) continue;
    buildings.set(id, { ...ring, mana: ring.mana - SUMMON_COST, produced: ring.produced + 1 });
  }
}

function spawnExit(center: Cursor, slot: ImpSlot): Cursor {
  return { x: center.x - 5 + RALLY_OFFSET[slot], y: center.y - 2 + RALLY_ROW };
}

function summonSurvival(
  state: InternalWorld,
  buildings: Map<BuildingId, Building>,
  troops: readonly Troop[],
  tick: number,
): { readonly buildings: Map<BuildingId, Building>; readonly troops: readonly Troop[] } {
  let nextTroops = troops;
  for (const id of [...state.dynamic.keys()].sort()) {
    const ring = buildings.get(id);
    if (ring?.kind !== "ring") continue;
    const living = nextTroops.filter(troop => troop.faction === "ally" && troop.ring === id).length;
    if (living >= IMP_CAP || ring.mana < SUMMON_COST) continue;
    const center = state.dynamic.get(id);
    if (!center) continue;
    let exit: Cursor | null = null;
    for (const slot of IMP_SLOTS) {
      const candidate = spawnExit(center, slot);
      if (candidate.x === state.cursor.x && candidate.y === state.cursor.y) continue;
      if (nextTroops.some(troop => troop.x === candidate.x && troop.y === candidate.y)) continue;
      exit = candidate;
      break;
    }
    if (exit === null) continue;
    const serial = ring.produced + 1;
    buildings.set(id, { ...ring, mana: ring.mana - SUMMON_COST, produced: serial });
    nextTroops = [...nextTroops, {
      id: `${id}#${serial}`,
      faction: "ally",
      ring: id,
      serial,
      x: exit.x,
      y: exit.y,
      hp: ALLY_HP,
      nextAttackTick: tick + ATTACK_COOLDOWN,
    }];
  }
  return { buildings, troops: nextTroops };
}

function adjacent(left: Cursor, right: Cursor): boolean {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y) === 1;
}

function chooseTarget(attacker: Troop, troops: readonly Troop[]): Troop | null {
  const candidates = troops.filter(troop => troop.faction !== attacker.faction && adjacent(troop, attacker));
  if (candidates.length === 0) return null;
  candidates.sort((left, right) => left.hp - right.hp || compareTroopIds(left, right));
  return candidates[0] ?? null;
}

function combatPhase(
  troops: readonly Troop[],
  cursor: Cursor,
  cursorHp: number,
  tick: number,
): { readonly troops: readonly Troop[]; readonly cursorHp: number; readonly kills: number } {
  const damage = new Map<string, number>();
  const cooldowns = new Map<string, number>();
  let cursorDamage = 0;
  for (const attacker of [...troops].sort(compareTroopIds)) {
    if (attacker.nextAttackTick > tick) continue;
    const target = chooseTarget(attacker, troops);
    if (target !== null) {
      damage.set(target.id, (damage.get(target.id) ?? 0) + 1);
      cooldowns.set(attacker.id, tick + ATTACK_COOLDOWN);
    } else if (attacker.faction === "enemy" && adjacent(attacker, cursor)) {
      cursorDamage++;
      cooldowns.set(attacker.id, tick + ATTACK_COOLDOWN);
    }
  }
  let kills = 0;
  const damaged = troops.map(troop => {
    const received = damage.get(troop.id) ?? 0;
    const cooldown = cooldowns.get(troop.id);
    const hp = troop.hp - received;
    if (troop.faction === "enemy" && hp <= 0) kills++;
    return {
      ...troop,
      hp,
      nextAttackTick: cooldown === undefined ? troop.nextAttackTick : cooldown,
    };
  });
  return {
    troops: damaged.filter(troop => troop.hp > 0),
    cursorHp: Math.max(0, cursorHp - cursorDamage),
    kills,
  };
}

function tickWorld(state: InternalWorld): InternalWorld {
  const tick = state.elapsedTicks + 1;
  let buildings = new Map(state.buildings);
  let troops = state.troops;
  let cursorHp = state.cursorHp;
  let kills = state.kills;
  if (state.rules === "survival") {
    const ids = [...state.dynamic.keys()].sort();
    generate(buildings, ids);
    transfer(buildings, ids);
    const summoned = summonSurvival(state, buildings, troops, tick);
    buildings = summoned.buildings;
    troops = summoned.troops;
    const fought = combatPhase(troops, state.cursor, cursorHp, tick);
    troops = fought.troops;
    cursorHp = fought.cursorHp;
    kills += fought.kills;
  } else {
    const ids = SITE_DEFINITIONS.map(site => site.id);
    generate(buildings, ids);
    transfer(buildings, ids);
    summonLegacy(buildings, ids);
  }
  return { ...state, buildings, troops, cursorHp, kills, elapsedTicks: tick };
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
  if (BigInt(state.elapsedTicks) + ticks > BigInt(Number.MAX_SAFE_INTEGER)) {
    fail("elapsed ticks exceed the safe integer domain");
  }
  let next = state;
  for (let index = 0n; index < ticks; index++) next = tickWorld(next);
  return construct({
    ...next,
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
  if (state.rules === "survival") {
    return construct({
      ...state,
      mode: finderMode(),
      finderOrigin: { ...state.cursor },
      finderSelection: 0,
      menuSelection: null,
      buildTarget: null,
      insertSite: null,
      insertCell: null,
      nameTarget: null,
      draft: "",
      notice: "",
    });
  }
  const target = siteAt(world, state.cursor.x, state.cursor.y);
  if (target === null || !isSiteId(target)) {
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

function legacyInsertStep(world: World, state: InternalWorld, key: string): World {
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

function endSurvivalInsert(state: InternalWorld, notice: string): World {
  return construct({
    ...state,
    mode: normalMode(),
    menuSelection: null,
    buildTarget: null,
    insertSite: null,
    insertCell: null,
    nameTarget: null,
    draft: "",
    notice,
  });
}

function rallyProblem(cell: Cursor): string | null {
  if (cell.x < 1 || cell.y < 1 || cell.x > WORLD_WIDTH - 2 || cell.y > WORLD_HEIGHT - 2) {
    return "Cannot rally: the cell must be interior";
  }
  if (inside(GATE_RESERVED, cell.x, cell.y)) return "Cannot rally: the cell is inside the enemy gate";
  return null;
}

function commitSurvivalInsert(world: World, state: InternalWorld): World {
  const captured = state.insertCell ?? state.cursor;
  if (!(SURVIVAL_COMMANDS as readonly string[]).includes(state.draft)) {
    return endSurvivalInsert(state, `Unknown command ${state.draft === "" ? "—" : state.draft}`);
  }
  if (state.draft === "rally") {
    const problem = rallyProblem(captured);
    if (problem !== null) return endSurvivalInsert(state, problem);
    return construct({
      ...state,
      mode: normalMode(),
      rally: { ...captured },
      menuSelection: null,
      buildTarget: null,
      insertSite: null,
      insertCell: null,
      nameTarget: null,
      draft: "",
      notice: `Rally ${captured.x},${captured.y}`,
    });
  }
  if (state.draft === "connect") {
    const site = state.insertSite;
    const building = site === null ? undefined : state.buildings.get(site);
    if (site === null || building === undefined) return endSurvivalInsert(state, "No building at cursor");
    if (building.kind === "well") {
      return construct({
        ...state,
        mode: normalMode(),
        pendingSource: site,
        menuSelection: null,
        buildTarget: null,
        insertSite: null,
        insertCell: null,
        nameTarget: null,
        draft: "",
        notice: `Source ${site}`,
      });
    }
    const source = state.pendingSource;
    if (source === null) return endSurvivalInsert(state, `No source for ${site}`);
    const well = state.buildings.get(source);
    if (!well || well.kind !== "well") return endSurvivalInsert(state, `Invalid source ${source}`);
    const linked = data(link(world, source, site));
    return construct({
      ...linked,
      mode: normalMode(),
      pendingSource: null,
      menuSelection: null,
      buildTarget: null,
      insertSite: null,
      insertCell: null,
      nameTarget: null,
      draft: "",
      notice: `Linked ${source} to ${site}`,
    });
  }
  const kind = state.draft === "mana well" ? "well" : "ring";
  const result = placeSurvival(state, captured, kind);
  if (result.id === null) return endSurvivalInsert(state, result.notice);
  return construct({
    ...result.state,
    mode: nameMode(result.id),
    menuSelection: null,
    buildTarget: null,
    insertSite: null,
    insertCell: null,
    nameTarget: result.id,
    draft: "",
    notice: `Name ${result.id}`,
  });
}

function survivalInsertStep(world: World, state: InternalWorld, key: string): World {
  if (key === "Backspace") {
    if (state.draft === "") return world;
    return construct({ ...state, draft: Array.from(state.draft).slice(0, -1).join("") });
  }
  if (key === "Escape") {
    return construct({
      ...state,
      mode: normalMode(),
      insertSite: null,
      insertCell: null,
      draft: "",
      notice: "",
    });
  }
  if (key === "Tab") {
    const first = candidateMatches(state)[0];
    return first === undefined ? world : construct({ ...state, draft: first });
  }
  if (key === "Enter") return commitSurvivalInsert(world, state);
  if (!printable(key) || Array.from(key).length !== 1) return world;
  if (Array.from(state.draft).length >= 32) return world;
  return construct({ ...state, draft: state.draft + key });
}

function nameStep(world: World, state: InternalWorld, key: string): World {
  const id = state.nameTarget;
  if (id === null) return construct({ ...state, mode: normalMode(), draft: "", notice: "" });
  if (key === "Backspace") {
    if (state.draft === "") return world;
    return construct({ ...state, draft: Array.from(state.draft).slice(0, -1).join("") });
  }
  if (key === "Enter") {
    const building = state.buildings.get(id);
    if (!building) return construct({ ...state, mode: normalMode(), nameTarget: null, draft: "", notice: "" });
    const draft = trimmedName(state.draft);
    const name = draft === "" ? defaultBuildingName(building.kind, id) : draft;
    const buildings = new Map(state.buildings);
    buildings.set(id, { ...building, name });
    return construct({
      ...state,
      buildings,
      mode: normalMode(),
      nameTarget: null,
      draft: "",
      notice: `Named ${id} ${name}`,
    });
  }
  if (key === "Escape") {
    return construct({ ...state, mode: normalMode(), nameTarget: null, draft: "", notice: "" });
  }
  if (!printable(key) || !/^[A-Za-z0-9 _-]$/.test(key)) return world;
  if (Array.from(state.draft).length >= 20) return world;
  return construct({ ...state, draft: state.draft + key });
}

interface Displacement {
  readonly cursor: Cursor;
  readonly blockedBy: Cursor | null;
}

function hostileAt(state: InternalWorld, x: number, y: number): boolean {
  return impsOf(state).some(imp => imp.x === x && imp.y === y);
}

function survivalDisplacement(state: InternalWorld, from: Cursor, to: Cursor): Displacement {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(Math.abs(dx), Math.abs(dy));
  if (distance === 0) return { cursor: { ...from }, blockedBy: null };
  const sign = (value: number): number => value < 0 ? -1 : value > 0 ? 1 : 0;
  let accepted: Cursor = { ...from };
  for (let step = 1; step <= distance; step++) {
    const x = from.x + sign(dx) * Math.floor((2 * step * Math.abs(dx) + distance) / (2 * distance));
    const y = from.y + sign(dy) * Math.floor((2 * step * Math.abs(dy) + distance) / (2 * distance));
    if (x !== accepted.x && y !== accepted.y) {
      const xSide = { x, y: accepted.y };
      if (hostileAt(state, xSide.x, xSide.y)) return { cursor: accepted, blockedBy: xSide };
      const ySide = { x: accepted.x, y };
      if (hostileAt(state, ySide.x, ySide.y)) return { cursor: accepted, blockedBy: ySide };
    }
    const sample = { x, y };
    if (hostileAt(state, sample.x, sample.y)) return { cursor: accepted, blockedBy: sample };
    accepted = sample;
  }
  return { cursor: accepted, blockedBy: null };
}

function finderDestination(state: InternalWorld, entry: FinderEntry): Cursor | null {
  if (entry.destination === "rally") return { ...(state.rally ?? DEFAULT_RALLY) };
  if (entry.destination === "gate") return { ...GATE_CENTER };
  const center = state.dynamic.get(entry.id);
  return center === undefined ? null : { ...center };
}

function closeFinder(state: InternalWorld, cursor: Cursor, notice: string): World {
  return construct({
    ...state,
    cursor: { ...cursor },
    mode: normalMode(),
    finderOrigin: null,
    finderSelection: 0,
    draft: "",
    notice,
  });
}

function finderStep(world: World, state: InternalWorld, key: string): World {
  if (key === "Escape") {
    return construct({
      ...state,
      mode: normalMode(),
      finderOrigin: null,
      finderSelection: 0,
      draft: "",
      notice: "",
    });
  }
  const entries = finderMatches(state);
  const last = entries.length - 1;
  if (key === "ArrowDown") {
    if (last < 0) return world;
    const selection = Math.min(last, state.finderSelection + 1);
    if (selection === state.finderSelection) return world;
    return construct({ ...state, finderSelection: selection });
  }
  if (key === "ArrowUp") {
    const selection = Math.max(0, state.finderSelection - 1);
    if (selection === state.finderSelection) return world;
    return construct({ ...state, finderSelection: selection });
  }
  if (key === "Backspace") {
    if (state.draft === "") return world;
    return construct({
      ...state,
      draft: Array.from(state.draft).slice(0, -1).join(""),
      finderSelection: 0,
    });
  }
  if (key === "Enter") {
    const entry = entries[state.finderSelection];
    if (entry === undefined) {
      return construct({ ...state, notice: "No finder result" });
    }
    const destination = finderDestination(state, entry);
    if (destination === null) {
      return construct({ ...state, notice: "Finder destination is unavailable" });
    }
    const moved = state.navigationOnly
      ? { cursor: destination, blockedBy: null }
      : survivalDisplacement(state, state.cursor, destination);
    const notice = moved.blockedBy === null
      ? ""
      : `Blocked by hostile at ${moved.blockedBy.x},${moved.blockedBy.y}`;
    return closeFinder(state, moved.cursor, notice);
  }
  if (!printable(key)) return world;
  if (Array.from(state.draft).length >= 32) return world;
  return construct({ ...state, draft: state.draft + key, finderSelection: 0 });
}

function cancelInteraction(state: InternalWorld): InternalWorld {
  return {
    ...state,
    mode: normalMode(),
    pendingSource: null,
    menuSelection: null,
    buildTarget: null,
    insertSite: null,
    insertCell: null,
    nameTarget: null,
    finderOrigin: null,
    finderSelection: 0,
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
  if (state.mode.$ === "Insert") {
    return state.rules === "survival"
      ? survivalInsertStep(world, state, event.key)
      : legacyInsertStep(world, state, event.key);
  }
  if (state.mode.$ === "Name") return nameStep(world, state, event.key);
  if (state.mode.$ === "Finder") return finderStep(world, state, event.key);
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
      notice: state.rules === "survival" ? "Leader: f find" : "Leader: f build",
    });
  }
  if (state.mode.$ === "Normal" && event.key === "i") {
    const target = siteAt(world, state.cursor.x, state.cursor.y);
    if (state.rules === "survival") {
      const next = {
        ...state,
        mode: insertMode(target),
        insertSite: target,
        insertCell: { ...state.cursor },
        draft: "",
        menuSelection: null,
        buildTarget: null,
        nameTarget: null,
      };
      return construct({ ...next, notice: `Insert: ${commandCandidates(next).join(" · ")}` });
    }
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
  const destination = navigation.cursor(next.position);
  const cursor = state.rules === "survival" && !state.navigationOnly
    ? survivalDisplacement(state, state.cursor, destination).cursor
    : destination;
  return construct({ ...state, cursor, mode: next.mode });
}

export function observe(world: World): Observation {
  const state = data(world);
  const sites: Partial<Record<SiteId, SiteObservation>> = {};
  const buildings: BuildingObservation[] = [];
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
          const link = isSiteId(building.link) ? building.link : null;
          sites[site.id] = { kind: "well", mana: building.mana, link };
          if (link !== null) {
            const target = siteDefinition(link);
            if (target) links.push({
              source: site.id,
              target: link,
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
  } else if (!state.navigationOnly && state.rules === "survival") {
    buildingCount = state.dynamic.size;
    for (const id of [...state.dynamic.keys()].sort()) {
      const building = state.buildings.get(id);
      const center = state.dynamic.get(id);
      if (!building || !center) continue;
      const name = building.name ?? defaultBuildingName(building.kind, id);
      if (building.kind === "well") {
        const link = isDynamicBuildingId(building.link) ? building.link : null;
        buildings.push({ id, kind: "well", center: { ...center }, mana: building.mana, link, name });
        if (link !== null) {
          const target = state.dynamic.get(link);
          if (target) links.push({ source: id, target: link, from: { ...center }, to: { ...target } });
        }
        if (state.pendingSource === id) pendingFrom = { ...center };
      } else {
        const living = state.troops.filter(troop => troop.faction === "ally" && troop.ring === id).length;
        buildings.push({
          id,
          kind: "ring",
          center: { ...center },
          mana: building.mana,
          produced: building.produced,
          living,
          name,
        });
      }
    }
  }
  const troops: TroopObservation[] = state.rules === "survival"
    ? [...state.troops].sort(compareTroopIds).map(troop => ({
      id: troop.id,
      faction: troop.faction,
      ring: troop.ring,
      serial: troop.serial,
      x: troop.x,
      y: troop.y,
      hp: troop.hp,
      nextAttackTick: troop.nextAttackTick,
    }))
    : [];
  const finderEntriesNow = state.mode.$ === "Finder" && state.rules === "survival" ? finderMatches(state) : [];
  const finder: FinderObservation | null = state.mode.$ === "Finder"
    ? {
      query: state.draft,
      selection: finderEntriesNow.length === 0
        ? 0
        : Math.min(state.finderSelection, finderEntriesNow.length - 1),
      entries: finderEntriesNow,
    }
    : null;
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
    insertCell: state.insertCell === null ? null : { ...state.insertCell },
    nameTarget: state.nameTarget,
    candidates: state.rules === "survival" && state.mode.$ === "Insert" ? candidateMatches(state) : [],
    finder,
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
    buildings,
    rally: state.rally === null ? null : { ...state.rally },
    links,
    imps: impsOf(state),
    troops,
    cursorHp: state.cursorHp,
    kills: state.kills,
  };
}

export function siteAt(world: World, x: number, y: number): BuildingId | null {
  const state = data(world);
  if (state.navigationOnly || !Number.isInteger(x) || !Number.isInteger(y)) return null;
  if (state.rules === "survival") {
    for (const [id, center] of state.dynamic) {
      if (inside(patch(center), x, y)) return id;
    }
    return null;
  }
  if (state.rules !== "first-playable") return null;
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
