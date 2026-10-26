import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  IMP_CAP,
  RING_MANA_CAP,
  SITE_IDS,
  SUMMON_COST,
  TICK_MS,
  WELL_GENERATION,
  WELL_MANA_CAP,
  game,
  type SiteId,
  type World,
} from "../../src/core/game";

type ClockCase = {
  id: string;
  requires: string[];
  setup: Record<string, unknown>;
  events: Array<
    | { type: "key"; key: string; blocked?: boolean }
    | { type: "build"; site: SiteId; kind: "well" | "ring" }
    | { type: "link"; source: SiteId; target: SiteId }
    | { type: "elapsed"; ms: number }
    | { type: "visibility"; hidden: boolean }
    | { type: "blur" }
  >;
  expect: Record<string, unknown>;
};

const root = resolve(import.meta.dir, "../..");
const economy = JSON.parse(readFileSync(resolve(root, "spec/first-playable/economy.json"), "utf8")) as ClockCase[];
const clock = JSON.parse(readFileSync(resolve(root, "spec/first-playable/clock.json"), "utf8")) as ClockCase[];
const cases = [...economy, ...clock];
const coverage = JSON.parse(readFileSync(resolve(root, "spec/first-playable/coverage.json"), "utf8")) as {
  requirements: Record<string, { status: string; unit: string; exports?: string[]; tests?: string[]; cases?: string[] }>;
};

const rally = [
  { x: 1, y: 6 },
  { x: 3, y: 6 },
  { x: 5, y: 6 },
  { x: 7, y: 6 },
  { x: 9, y: 6 },
] as const;

function partial(actual: unknown, expected: unknown, path = "observation"): void {
  if (Array.isArray(expected)) {
    expect(actual).toEqual(expected);
    return;
  }
  if (typeof expected === "object" && expected !== null) {
    if (typeof actual !== "object" || actual === null) throw new Error(`${path} must be an object`);
    const record = actual as Record<string, unknown>;
    for (const [key, value] of Object.entries(expected)) partial(record[key], value, `${path}.${key}`);
    return;
  }
  expect(actual).toBe(expected);
}

function observed(state: World, expected: Record<string, unknown>): Record<string, unknown> {
  const base: Record<string, unknown> = { ...game.observe(state) };
  if (Array.isArray(expected.glyphs)) {
    base.glyphs = (expected.glyphs as Array<{ x: number; y: number }>).map(glyph => ({
      x: glyph.x,
      y: glyph.y,
      value: game.glyphAt(state, glyph.x, glyph.y),
    }));
  }
  return base;
}

function apply(state: World, event: ClockCase["events"][number]): World {
  if (event.type === "key") return game.dispatch(state, { type: "key", key: event.key, blocked: event.blocked === true });
  if (event.type === "build") return game.build(state, event.site, event.kind);
  if (event.type === "link") return game.link(state, event.source, event.target);
  if (event.type === "elapsed") return game.dispatch(state, { type: "elapsed", ms: event.ms });
  if (event.type === "visibility") return game.dispatch(state, { type: "visibility", hidden: event.hidden });
  if (event.type === "blur") return game.dispatch(state, { type: "blur" });
  throw new Error("Unsupported clock event");
}

function key(state: World, value: string): World {
  return game.dispatch(state, { type: "key", key: value });
}

function type(state: World, value: string): World {
  let next = state;
  for (const character of Array.from(value)) next = key(next, character);
  return next;
}

for (const example of cases) {
  test(`${example.id.includes(".") ? "economy/clock" : "clock"} ${example.id}`, () => {
    let state = game.scenario(example.setup);
    for (const event of example.events) state = apply(state, event);
    partial(observed(state, example.expect), example.expect);
  });
}

test("coverage activates E1-E4 and T1-T2 with every economy and clock case", () => {
  const owners: Record<string, string> = {
    E1: "6.1", E2: "6.1", E3: "6.1", E4: "6.1", T1: "6.1", T2: "6.1",
  };
  for (const [id, unit] of Object.entries(owners)) {
    const owned = cases.filter(example => example.requires.includes(id)).map(example => example.id).sort();
    expect(coverage.requirements[id]?.status).toBe("active");
    expect(coverage.requirements[id]?.unit).toBe(unit);
    expect(coverage.requirements[id]?.exports).toContain("game.advance");
    expect(coverage.requirements[id]?.tests).toContain("tests/core/first-playable-economy.test.ts");
    expect(coverage.requirements[id]?.cases?.slice().sort()).toEqual(owned);
    expect(owned.length).toBeGreaterThan(0);
  }
  for (const id of ["E1", "E2", "E3", "E4", "T1", "T2"]) {
    expect(coverage.requirements[id]?.exports).toContain("game.observe");
  }
  expect(coverage.requirements.V2?.status).toBe("pending");
});

function well(mana: number, link: SiteId | null = null): { kind: "well"; mana: number; link: SiteId | null } {
  return { kind: "well", mana, link };
}

function ring(mana: number, produced = 0): { kind: "ring"; mana: number; produced: number } {
  return { kind: "ring", mana, produced };
}

function site(id: SiteId, state: World): Record<string, unknown> {
  const value = game.observe(state).sites[id];
  if (value === undefined) throw new Error(`missing site ${id}`);
  return value as Record<string, unknown>;
}

test("E1 wells generate exactly one quantum batch per tick and discard saturated overflow", () => {
  const start = game.scenario({
    buildings: [
      { site: "a01", kind: "well", mana: 0 },
      { site: "a02", kind: "well", mana: WELL_MANA_CAP - WELL_GENERATION + 1 },
      { site: "a03", kind: "ring", mana: 999 },
    ],
  });
  const advanced = game.advance(start, TICK_MS * 7);
  expect(game.advance(start, 0)).toBe(start);
  expect(site("a01", advanced)).toEqual(well(WELL_GENERATION * 7));
  expect(site("a02", advanced)).toEqual(well(WELL_MANA_CAP));
  expect(site("a03", advanced)).toEqual(ring(999));
  expect(game.observe(advanced).imps).toEqual([]);
  expect(game.observe(advanced).elapsedTicks).toBe(7);
  expect(game.observe(advanced).remainderMs).toBe(0);

  const capped = game.scenario({ buildings: [{ site: "a01", kind: "well", mana: WELL_MANA_CAP }] });
  expect(site("a01", game.advance(capped, TICK_MS * 1000))).toEqual(well(WELL_MANA_CAP));
  expect(game.observe(game.advance(capped, TICK_MS * 1000)).elapsedTicks).toBe(1000);
});

test("E1 unconnected wells keep their mana and rings never generate mana", () => {
  const state = game.advance(game.scenario({
    buildings: [
      { site: "a01", kind: "well", mana: 432 },
      { site: "a02", kind: "ring", mana: 999 },
      { site: "a03", kind: "ring", mana: 0, produced: 2 },
    ],
  }), TICK_MS * 25);
  expect(site("a01", state)).toEqual(well(432 + WELL_GENERATION * 25));
  expect(site("a02", state)).toEqual(ring(999));
  expect(site("a03", state)).toEqual(ring(0, 2));
  expect(game.observe(state).impCount).toBe(2);
});

test("E2 transfer visits ascending wells and leaves nonnegative bounded balances", () => {
  const start = game.scenario({
    buildings: [
      { site: "a01", kind: "well", mana: 900, link: "a03" },
      { site: "a02", kind: "well", mana: 900, link: "a03" },
      { site: "a03", kind: "ring", mana: 950 },
    ],
  });
  const state = game.advance(start, TICK_MS);
  expect(site("a01", state)).toEqual(well(900 + WELL_GENERATION - 50, "a03"));
  expect(site("a02", state)).toEqual(well(900 + WELL_GENERATION, "a03"));
  expect(site("a03", state)).toEqual(ring(0, 1));

  const before = game.observe(start).sites;
  const stored = Object.values(before).reduce((total, value) => total + (value.kind === "empty" ? 0 : value.mana), 0);
  const after = Object.values(game.observe(state).sites).reduce((total, value) => total + (value.kind === "empty" ? 0 : value.mana), 0);
  expect(after).toBe(stored + 2 * WELL_GENERATION - SUMMON_COST);
  for (const value of Object.values(game.observe(state).sites)) {
    if (value.kind === "well") expect(value.mana).toBeGreaterThanOrEqual(0);
    if (value.kind === "ring") expect(value.mana).toBeGreaterThanOrEqual(0);
  }
});

test("E2 multiple suppliers fill a ring without exceeding its buffer or changing direction", () => {
  const start = game.scenario({
    buildings: [
      { site: "a01", kind: "well", mana: 1000, link: "b02" },
      { site: "a02", kind: "well", mana: 1000, link: "b02" },
      { site: "a03", kind: "well", mana: 1000, link: "b02" },
      { site: "b02", kind: "ring", mana: RING_MANA_CAP - 30 },
    ],
  });
  const state = game.advance(start, TICK_MS);
  expect(site("a01", state)).toEqual(well(1000 + WELL_GENERATION - 30, "b02"));
  expect(site("a02", state)).toEqual(well(1000 + WELL_GENERATION, "b02"));
  expect(site("a03", state)).toEqual(well(1000 + WELL_GENERATION, "b02"));
  expect(site("b02", state)).toEqual(ring(0, 1));
  expect(game.observe(state).links).toHaveLength(3);
});

test("E3 a funded ring spends exactly the summoning cost and places the next ordered imp", () => {
  const start = game.scenario({ buildings: [{ site: "a02", kind: "ring", mana: SUMMON_COST, produced: 2 }] });
  const state = game.advance(start, TICK_MS);
  const observation = game.observe(state);
  expect(observation.sites.a02).toEqual(ring(0, 3));
  expect(observation.imps).toEqual([
    { ring: "a02", slot: 1, x: 33, y: 14 },
    { ring: "a02", slot: 2, x: 35, y: 14 },
    { ring: "a02", slot: 3, x: 37, y: 14 },
  ]);
  expect(game.glyphAt(state, 37, 14)).toBe("i");
  expect(game.glyphAt(state, 39, 14)).toBe(" ");

  const poor = game.scenario({ buildings: [{ site: "a02", kind: "ring", mana: SUMMON_COST - 1, produced: 2 }] });
  const unchanged = game.advance(poor, TICK_MS * 10);
  expect(site("a02", unchanged)).toEqual(ring(SUMMON_COST - 1, 2));
  expect(game.observe(unchanged).impCount).toBe(2);
});

test("E4 capped rings never create a sixth imp, spend at cap or reset on reconnect", () => {
  const capped = game.scenario({ buildings: [{ site: "a02", kind: "ring", mana: RING_MANA_CAP, produced: IMP_CAP }] });
  const later = game.advance(capped, TICK_MS * 100);
  expect(site("a02", later)).toEqual(ring(RING_MANA_CAP, IMP_CAP));
  expect(game.observe(later).imps.map(imp => imp.slot)).toEqual([1, 2, 3, 4, 5]);

  const linked = game.link(game.scenario({
    buildings: [
      { site: "a01", kind: "well", mana: WELL_MANA_CAP },
      { site: "a02", kind: "ring", mana: 0, produced: IMP_CAP },
    ],
  }), "a01", "a02");
  const state = game.advance(linked, TICK_MS * 20);
  expect(site("a01", state)).toEqual(well(WELL_MANA_CAP - RING_MANA_CAP + 19 * WELL_GENERATION, "a02"));
  expect(site("a02", state)).toEqual(ring(RING_MANA_CAP, IMP_CAP));
  expect(game.observe(state).impCount).toBe(IMP_CAP);
  for (const offset of rally) expect(game.glyphAt(state, 32 + offset.x, 8 + offset.y)).toBe("i");

  const otherRing = game.scenario({
    buildings: [
      { site: "a01", kind: "well", mana: WELL_MANA_CAP },
      { site: "a02", kind: "ring", mana: 0, produced: IMP_CAP },
      { site: "a03", kind: "ring", mana: 0, produced: IMP_CAP },
    ],
  });
  const rerouted = game.link(otherRing, "a01", "a03");
  expect(site("a02", rerouted)).toEqual(ring(0, IMP_CAP));
  expect(site("a03", rerouted)).toEqual(ring(0, IMP_CAP));
  expect(game.link(linked, "a01", "a03")).toBe(linked);
});

test("T1 remainder and tick counts are exact, zero is identity and partitions agree", () => {
  const setup = {
    buildings: [
      { site: "a01", kind: "well", mana: 0, link: "a03" },
      { site: "a02", kind: "well", mana: 0, link: "a03" },
      { site: "a03", kind: "ring", mana: 0, produced: 0 },
    ],
  };
  const zero = game.scenario(setup);
  expect(game.advance(zero, 0)).toBe(zero);
  const almost = game.advance(zero, TICK_MS - 1);
  expect(game.observe(almost).elapsedTicks).toBe(0);
  expect(game.observe(almost).remainderMs).toBe(TICK_MS - 1);
  const one = game.advance(almost, 1);
  expect(game.observe(one).elapsedTicks).toBe(1);
  expect(game.observe(one).remainderMs).toBe(0);
  expect(game.observe(one).sites).toEqual(game.observe(game.advance(zero, TICK_MS)).sites);

  const total = 1_234_567;
  const once = game.advance(game.scenario(setup), total);
  let partitioned = game.scenario(setup);
  for (const part of [1, 99, TICK_MS, 4321, 100_000, total - (1 + 99 + TICK_MS + 4321 + 100_000)]) {
    partitioned = game.advance(partitioned, part);
  }
  expect(game.observe(partitioned)).toEqual(game.observe(once));
  expect(game.observe(once).elapsedTicks).toBe(Math.floor(total / TICK_MS));
  expect(game.observe(once).remainderMs).toBe(total % TICK_MS);

  const roundtrip = game.scenario(game.snapshot(once));
  expect(game.observe(roundtrip)).toEqual(game.observe(once));
  expect(game.field(roundtrip)).toEqual(game.field(once));
  for (const invalid of [
    { remainderMs: TICK_MS },
    { remainderMs: 1.5 },
    { elapsedTicks: -1 },
    { elapsedTicks: 1.5 },
    { manualPaused: "yes" },
    { suspended: 1 },
  ]) expect(() => game.scenario(invalid)).toThrow();
  for (const invalid of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Number.POSITIVE_INFINITY]) {
    expect(() => game.advance(zero, invalid)).toThrow();
  }
});

test("T2 manual pause and hidden suspension ignore elapsed and reset the remainder", () => {
  const setup = {
    buildings: [
      { site: "a01", kind: "well", mana: 0, link: "a02" },
      { site: "a02", kind: "ring", mana: 0, produced: 0 },
    ],
  };
  let state = game.advance(game.scenario(setup), TICK_MS - 1);
  expect(game.observe(state).remainderMs).toBe(TICK_MS - 1);
  state = key(state, "p");
  expect(game.observe(state).manualPaused).toBe(true);
  expect(game.observe(state).remainderMs).toBe(0);
  const paused = state;
  state = game.advance(state, 10_000);
  expect(state).toBe(paused);
  expect(game.observe(state).elapsedTicks).toBe(0);
  expect(site("a02", state)).toEqual(ring(0, 0));

  state = key(state, "p");
  expect(game.observe(state).manualPaused).toBe(false);
  expect(game.observe(state).remainderMs).toBe(0);
  state = game.advance(state, 5000);
  expect(site("a02", state)).toEqual(ring(0, 1));

  let hidden = game.advance(game.scenario(setup), TICK_MS - 1);
  hidden = game.dispatch(hidden, { type: "visibility", hidden: true });
  let observation = game.observe(hidden);
  expect({ suspended: observation.suspended, manualPaused: observation.manualPaused, remainder: observation.remainderMs })
    .toEqual({ suspended: true, manualPaused: false, remainder: 0 });
  expect(game.advance(hidden, 10_000)).toBe(hidden);
  hidden = game.dispatch(hidden, { type: "visibility", hidden: false });
  observation = game.observe(hidden);
  expect({ suspended: observation.suspended, remainder: observation.remainderMs }).toEqual({ suspended: false, remainder: 0 });

  let manual = key(game.scenario(setup), "p");
  manual = game.dispatch(manual, { type: "visibility", hidden: true });
  manual = game.dispatch(manual, { type: "visibility", hidden: false });
  manual = game.advance(manual, 10_000);
  expect(game.observe(manual).manualPaused).toBe(true);
  expect(game.observe(manual).elapsedTicks).toBe(0);
});

test("T2 drafts, menus and blur do not pause visible production and preserve cursor or draft", () => {
  const setup = {
    cursor: { x: 13, y: 10 },
    buildings: [
      { site: "a01", kind: "well", mana: 0, link: "a02" },
      { site: "a02", kind: "ring", mana: 0, produced: 0 },
    ],
  };
  let state = key(game.scenario(setup), "i");
  state = type(state, "con");
  const before = game.observe(state);
  state = game.advance(state, 5000);
  const after = game.observe(state);
  expect(after.mode).toBe("Insert");
  expect(after.commandBuffer).toBe("con");
  expect(after.cursor).toEqual(before.cursor);
  expect(after.sites.a02).toEqual(ring(0, 1));

  state = key(game.scenario(setup), " ");
  state = key(state, "f");
  expect(game.observe(state).mode).toBe("Build");
  state = game.advance(state, 5000);
  expect(game.observe(state).mode).toBe("Build");
  expect(game.observe(state).sites.a02).toEqual(ring(0, 1));

  let blurred = key(game.scenario(setup), "i");
  blurred = type(blurred, "con");
  blurred = game.dispatch(blurred, { type: "blur" });
  expect({ mode: game.observe(blurred).mode, draft: game.observe(blurred).commandBuffer, paused: game.observe(blurred).manualPaused })
    .toEqual({ mode: "Normal", draft: "", paused: false });
  blurred = game.advance(blurred, 5000);
  expect(game.observe(blurred).sites.a02).toEqual(ring(0, 1));

  let pausedDraft = key(game.scenario(setup), "p");
  pausedDraft = key(pausedDraft, "i");
  pausedDraft = type(pausedDraft, "con");
  pausedDraft = game.advance(pausedDraft, 10_000);
  const held = game.observe(pausedDraft);
  expect({ mode: held.mode, draft: held.commandBuffer, paused: held.manualPaused, produced: held.sites.a02 })
    .toEqual({ mode: "Insert", draft: "con", paused: true, produced: ring(0, 0) });
  pausedDraft = key(pausedDraft, "Escape");
  pausedDraft = key(pausedDraft, "p");
  pausedDraft = game.advance(pausedDraft, 5000);
  expect(game.observe(pausedDraft).sites.a02).toEqual(ring(0, 1));
});

type RefBuilding =
  | { kind: "well"; mana: number; link: SiteId | null }
  | { kind: "ring"; mana: number; produced: number };

function refTick(buildings: Map<SiteId, RefBuilding>): void {
  for (const id of SITE_IDS) {
    const building = buildings.get(id);
    if (building?.kind === "well") buildings.set(id, { ...building, mana: Math.min(WELL_MANA_CAP, building.mana + WELL_GENERATION) });
  }
  for (const id of SITE_IDS) {
    const building = buildings.get(id);
    if (building?.kind !== "well" || building.link === null) continue;
    const target = buildings.get(building.link);
    if (target?.kind !== "ring") continue;
    const amount = Math.min(building.mana, RING_MANA_CAP - target.mana);
    buildings.set(id, { ...building, mana: building.mana - amount });
    buildings.set(building.link, { ...target, mana: target.mana + amount });
  }
  for (const id of SITE_IDS) {
    const building = buildings.get(id);
    if (building?.kind !== "ring" || building.produced >= IMP_CAP || building.mana < SUMMON_COST) continue;
    buildings.set(id, { ...building, mana: building.mana - SUMMON_COST, produced: building.produced + 1 });
  }
}

test("E1-E4 property: varied valid worlds agree with an independent tick model and preserve invariants", () => {
  let seed = 0x5eed1234;
  const random = (limit: number): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % limit;
  };
  const origins: Record<SiteId, { x: number; y: number }> = {
    a01: { x: 8, y: 8 }, a02: { x: 32, y: 8 }, a03: { x: 56, y: 8 }, a04: { x: 80, y: 8 },
    b01: { x: 8, y: 32 }, b02: { x: 32, y: 32 }, z01: { x: 200, y: 136 }, z02: { x: 224, y: 152 },
  };
  for (let run = 0; run < 40; run++) {
    const kinds = new Map<SiteId, "empty" | "well" | "ring">();
    for (const id of SITE_IDS) {
      const pick = random(4);
      kinds.set(id, pick === 0 ? "well" : pick === 1 ? "ring" : "empty");
    }
    const ringIds = SITE_IDS.filter(id => kinds.get(id) === "ring");
    const buildings: Array<Record<string, unknown>> = [];
    for (const id of SITE_IDS) {
      const kind = kinds.get(id);
      if (kind === "well") {
        const link = ringIds.length > 0 && random(3) !== 0 ? ringIds[random(ringIds.length)]! : null;
        buildings.push({ site: id, kind, mana: random(WELL_MANA_CAP + 1), link });
      } else if (kind === "ring") {
        buildings.push({ site: id, kind, mana: random(RING_MANA_CAP + 1), produced: random(IMP_CAP + 1) });
      }
    }
    const remainderMs = random(TICK_MS);
    const start = game.scenario({
      buildings,
      cursor: { x: random(240), y: random(160) },
      remainderMs,
    });
    const reference = new Map<SiteId, RefBuilding>();
    for (const value of buildings) {
      const id = value.site as SiteId;
      reference.set(id, value.kind === "well"
        ? { kind: "well", mana: value.mana as number, link: value.link as SiteId | null }
        : { kind: "ring", mana: value.mana as number, produced: value.produced as number });
    }
    let state = start;
    let refRemainder = remainderMs;
    let refTicks = 0;
    for (let part = 0; part < 4; part++) {
      const amount = random(700);
      const total = refRemainder + amount;
      const tickCount = Math.floor(total / TICK_MS);
      for (let index = 0; index < tickCount; index++) refTick(reference);
      refRemainder = total % TICK_MS;
      refTicks += tickCount;
      state = game.advance(state, amount);
    }
    const observation = game.observe(state);
    expect(observation.cursor).toEqual(game.observe(start).cursor);
    expect(observation.impCount).toBe(observation.imps.length);
    for (const id of SITE_IDS) {
      const expected = reference.get(id);
      const actual = observation.sites[id];
      if (expected === undefined) {
        expect(actual).toEqual({ kind: "empty" });
      } else if (expected.kind === "well") {
        expect(actual).toEqual({ kind: "well", mana: expected.mana, link: expected.link });
      } else {
        expect(actual).toEqual({ kind: "ring", mana: expected.mana, produced: expected.produced });
      }
      if (actual?.kind === "ring") {
        expect(actual.produced).toBeGreaterThanOrEqual(0);
        expect(actual.produced).toBeLessThanOrEqual(IMP_CAP);
        expect(actual.mana).toBeGreaterThanOrEqual(0);
        expect(actual.mana).toBeLessThanOrEqual(RING_MANA_CAP);
      }
      if (actual?.kind === "well") {
        expect(actual.mana).toBeGreaterThanOrEqual(0);
        expect(actual.mana).toBeLessThanOrEqual(WELL_MANA_CAP);
      }
    }
    const expectedImps = SITE_IDS.flatMap(id => {
      const value = observation.sites[id];
      if (value?.kind !== "ring") return [];
      return rally.slice(0, value.produced).map((offset, index) => ({
        ring: id,
        slot: (index + 1) as 1 | 2 | 3 | 4 | 5,
        x: origins[id].x + offset.x,
        y: origins[id].y + offset.y,
      }));
    });
    expect(observation.imps).toEqual(expectedImps);
    expect(new Set(observation.imps.map(imp => `${imp.x},${imp.y}`)).size).toBe(observation.imps.length);
    expect(observation.elapsedTicks).toBe(refTicks);
    expect(observation.remainderMs).toBe(refRemainder);
    for (const imp of observation.imps) expect(game.glyphAt(state, imp.x, imp.y)).toBe("i");
  }
});
