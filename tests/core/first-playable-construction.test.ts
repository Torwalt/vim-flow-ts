import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SITE_HEIGHT, SITE_WIDTH, game, type SiteId, type World } from "../../src/core/game";

type ConstructionCase = {
  id: string;
  requires: string[];
  setup: Record<string, unknown>;
  events: Array<
    | { type: "key"; key: string; blocked?: boolean }
    | { type: "build"; site: SiteId; kind: "well" | "ring" }
    | { type: "blur" }
  >;
  expect: Record<string, unknown>;
};

const root = resolve(import.meta.dir, "../..");
const cases = JSON.parse(readFileSync(resolve(root, "spec/first-playable/construction.json"), "utf8")) as ConstructionCase[];
const coverage = JSON.parse(readFileSync(resolve(root, "spec/first-playable/coverage.json"), "utf8")) as {
  requirements: Record<string, { status: string; unit: string; exports?: string[]; tests?: string[]; cases?: string[] }>;
};

const sites = [
  { id: "a01", x: 8, y: 8 },
  { id: "a02", x: 32, y: 8 },
  { id: "a03", x: 56, y: 8 },
  { id: "a04", x: 80, y: 8 },
  { id: "b01", x: 8, y: 32 },
  { id: "b02", x: 32, y: 32 },
  { id: "z01", x: 200, y: 136 },
  { id: "z02", x: 224, y: 152 },
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

function apply(state: World, event: ConstructionCase["events"][number]): World {
  if (event.type === "key") {
    return game.dispatch(state, { type: "key", key: event.key, blocked: event.blocked === true });
  }
  if (event.type === "build") return game.build(state, event.site, event.kind);
  if (event.type === "blur") return game.dispatch(state, { type: "blur" });
  throw new Error("Unsupported construction event");
}

function key(state: World, value: string, blocked = false): World {
  return game.dispatch(state, { type: "key", key: value, blocked });
}

function openBuild(state: World): World {
  return key(key(state, " "), "f");
}

function center(site: (typeof sites)[number]): { x: number; y: number } {
  return { x: site.x + 5, y: site.y + 2 };
}

function outsidePatch(text: string, site: (typeof sites)[number], other: string): string {
  const kept: string[] = [];
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 240; x++) {
      const inPatch = x >= site.x && x < site.x + SITE_WIDTH && y >= site.y && y < site.y + SITE_HEIGHT;
      if (!inPatch) kept.push(text[y * 240 + x]!);
    }
  }
  return `${kept.join("")}|${other}`;
}

for (const example of cases) {
  test(`construction.json ${example.id}`, () => {
    let state = game.scenario(example.setup);
    for (const event of example.events) state = apply(state, event);
    partial(observed(state, example.expect), example.expect);
  });
}

test("coverage activates B1, B2 and I1 with every construction case and leaves later work pending", () => {
  const ids = ["B1", "B2", "I1"];
  for (const id of ids) {
    const owned = cases.filter(example => example.requires.includes(id)).map(example => example.id).sort();
    expect(coverage.requirements[id]?.status).toBe("active");
    expect(coverage.requirements[id]?.unit).toBe("4.1");
    expect(coverage.requirements[id]?.exports).toContain("game.dispatch");
    expect(coverage.requirements[id]?.tests).toContain("tests/core/first-playable-construction.test.ts");
    expect(coverage.requirements[id]?.cases?.slice().sort()).toEqual(owned);
    expect(owned.length).toBeGreaterThan(0);
  }
  expect(coverage.requirements.B1?.exports).toContain("game.preview");
  expect(coverage.requirements.B2?.exports).toContain("game.build");
  for (const id of ["V2"]) {
    expect(coverage.requirements[id]?.status).toBe("pending");
  }
});

test("B1 the menu captures any targeted patch cell and defaults to a well without constructing", () => {
  for (const site of sites) {
    let state = game.scenario({ cursor: { x: site.x + SITE_WIDTH - 1, y: site.y + SITE_HEIGHT - 1 } });
    const cursor = game.observe(state).cursor;
    state = openBuild(state);
    const opened = game.observe(state);
    expect(opened.mode).toBe("Build");
    expect(opened.count).toBe(0);
    expect(opened.menuSelection).toBe("well");
    expect(opened.buildTarget).toBe(site.id);
    expect(opened.buildingCount).toBe(0);

    for (const ignored of ["l", "j", "k", "x", "Backspace"]) state = key(state, ignored);
    expect(game.observe(state).cursor).toEqual(cursor);
    expect(game.observe(state).mode).toBe("Build");
    expect(game.observe(state).buildingCount).toBe(0);

    state = key(state, "Enter");
    const built = game.observe(state);
    expect(built.mode).toBe("Normal");
    expect(built.menuSelection).toBeNull();
    expect(built.buildTarget).toBeNull();
    expect(built.cursor).toEqual(cursor);
    expect(built.sites[site.id]).toEqual({ kind: "well", mana: 0, link: null });
    const middle = center(site);
    expect(game.glyphAt(state, middle.x, middle.y)).toBe("~");
  }
});

test("B1 selecting a ring and confirming builds it at the captured site for free", () => {
  for (const site of sites) {
    let state = game.scenario({ cursor: { x: site.x, y: site.y } });
    state = openBuild(state);
    state = key(state, "r");
    expect(game.observe(state).menuSelection).toBe("ring");
    expect(game.observe(state).buildTarget).toBe(site.id);
    state = key(state, "w");
    expect(game.observe(state).menuSelection).toBe("well");
    state = key(state, "r");
    state = key(state, "Enter");
    const observation = game.observe(state);
    expect(observation.mode).toBe("Normal");
    expect(observation.sites[site.id]).toEqual({ kind: "ring", mana: 0, produced: 0 });
    expect(observation.buildingCount).toBe(1);
    const middle = center(site);
    expect(game.glyphAt(state, middle.x, middle.y)).toBe("o");
  }
});

test("B2 direct and menu construction only turn an empty captured site into a building", () => {
  const direct = game.build(game.initial(), "a01", "well");
  expect(game.observe(direct).sites.a01).toEqual({ kind: "well", mana: 0, link: null });
  expect(game.observe(direct).sites.a02).toEqual({ kind: "empty" });
  expect(game.observe(direct).cursor).toEqual({ x: 13, y: 10 });

  const built = game.scenario({
    cursor: { x: 37, y: 10 },
    buildings: [
      { site: "a01", kind: "well", mana: 400, link: "a02" },
      { site: "a02", kind: "ring", mana: 300, produced: 5 },
    ],
    pendingSource: "a01",
  });
  const before = game.observe(built);
  const beforeField = game.field(built).text;
  expect(game.build(built, "a01", "ring")).toBe(built);

  let state = key(key(built, " "), "f");
  state = key(state, "r");
  state = key(state, "Enter");
  const after = game.observe(state);
  expect(after.mode).toBe("Normal");
  expect(after.pendingSource).toBe("a01");
  expect(after.notice).toContain("occupied");
  expect(after.sites).toEqual(before.sites);
  expect(after.imps).toEqual(before.imps);
  expect(after.buildingCount).toBe(before.buildingCount);
  expect(game.field(state).text).toBe(beforeField);
});

test("B2 outside every fixed patch Leader f reports an error and changes nothing", () => {
  for (const cursor of [{ x: 19, y: 8 }, { x: 0, y: 0 }, { x: 100, y: 100 }, { x: 8 + SITE_WIDTH, y: 8 }]) {
    const initial = game.scenario({ cursor });
    const before = game.observe(initial);
    const beforeField = game.field(initial).text;
    const state = openBuild(initial);
    const after = game.observe(state);
    expect(after.mode).toBe("Normal");
    expect(after.menuSelection).toBeNull();
    expect(after.buildTarget).toBeNull();
    expect(after.siteAtCursor).toBeNull();
    expect(after.notice.length).toBeGreaterThan(0);
    expect(after.siteCount).toBe(8);
    expect(after.buildingCount).toBe(0);
    expect(game.field(state).text).toBe(beforeField);
    expect(after.cursor).toEqual(before.cursor);
  }
});

test("I1 blocked modified keys are identity in Normal, Leader and Build", () => {
  const normal = game.scenario({ pendingSource: "a01", buildings: [{ site: "a01", kind: "well" }] });
  for (const value of [" ", "f", "Escape"]) {
    expect(key(normal, value, true)).toBe(normal);
  }

  const leader = key(normal, " ");
  const leaderBefore = game.observe(leader);
  for (const value of ["f", "w", "r", " ", "Enter", "Escape", "Backspace"]) {
    const blocked = key(leader, value, true);
    expect(blocked).toBe(leader);
    expect(game.observe(blocked)).toEqual(leaderBefore);
  }

  const build = openBuild(normal);
  const buildBefore = game.observe(build);
  expect(buildBefore.mode).toBe("Build");
  for (const value of ["w", "r", "x", "Enter", "Escape", "Backspace"]) {
    const blocked = key(build, value, true);
    expect(blocked).toBe(build);
    expect(game.observe(blocked)).toEqual(buildBefore);
  }
});

test("I1 menu cancellation preserves a pending source while Normal Escape clears it", () => {
  const staged = game.scenario({
    cursor: { x: 37, y: 10 },
    buildings: [
      { site: "a01", kind: "well" },
      { site: "a02", kind: "ring" },
    ],
    pendingSource: "a01",
  });

  let state = key(key(staged, " "), "Escape");
  expect(game.observe(state).mode).toBe("Normal");
  expect(game.observe(state).pendingSource).toBe("a01");
  expect(game.observe(state).menuSelection).toBeNull();

  state = openBuild(staged);
  state = key(state, "r");
  state = key(state, "Escape");
  const cancelled = game.observe(state);
  expect(cancelled.mode).toBe("Normal");
  expect(cancelled.menuSelection).toBeNull();
  expect(cancelled.buildTarget).toBeNull();
  expect(cancelled.pendingSource).toBe("a01");
  expect(cancelled.buildingCount).toBe(2);
  expect(cancelled.notice).toBe("");

  state = key(staged, "Escape");
  expect(game.observe(state).pendingSource).toBeNull();
});

test("I1 blur cancels the Leader/Build menu and pending source without constructing", () => {
  const staged = game.scenario({
    cursor: { x: 8, y: 8 },
    buildings: [{ site: "a02", kind: "well" }],
    pendingSource: "a02",
  });
  let state = openBuild(staged);
  state = key(state, "r");
  state = game.dispatch(state, { type: "blur" });
  const observation = game.observe(state);
  expect(observation.mode).toBe("Normal");
  expect(observation.menuSelection).toBeNull();
  expect(observation.buildTarget).toBeNull();
  expect(observation.pendingSource).toBeNull();
  expect(observation.buildingCount).toBe(1);
  expect(observation.sites.a01).toEqual({ kind: "empty" });
});

test("I1 counts are discarded on Leader and other Build keys are consumed without constructing", () => {
  let state = game.scenario({ pendingSource: "a01", buildings: [{ site: "a01", kind: "well" }] });
  state = key(state, "9");
  state = key(state, "9");
  expect(game.observe(state).count).toBe(99);
  state = key(state, " ");
  const leader = game.observe(state);
  expect(leader.mode).toBe("Leader");
  expect(leader.count).toBe(0);
  expect(leader.pendingSource).toBe("a01");

  state = key(state, "f");
  expect(game.observe(state).count).toBe(0);
  state = key(state, "x");
  state = key(state, "Enter");
  expect(game.observe(state).mode).toBe("Normal");
  expect(game.observe(state).buildingCount).toBe(1);

  state = openBuild(game.scenario());
  for (const value of ["1", "2", "3", "x", "Escape"]) {
    if (value !== "Escape") state = key(state, value);
  }
  expect(game.observe(state).mode).toBe("Build");
  expect(game.observe(state).buildingCount).toBe(0);
});

test("I1 unrecognized Leader input returns Normal and f/F stay literal in find modes", () => {
  let state = key(game.initial(), " ");
  state = key(state, "z");
  expect(game.observe(state).mode).toBe("Normal");

  state = game.scenario({ navigationOnly: true, rows: { "0": "x f" }, cursor: { x: 0, y: 0 } });
  state = key(state, "f");
  expect(game.observe(state).mode).toBe("FindRight");
  state = key(state, "f");
  expect(game.observe(state).mode).toBe("Normal");
  expect(game.observe(state).cursor).toEqual({ x: 2, y: 0 });
  expect(game.observe(state).buildTarget).toBeNull();

  state = game.scenario({ navigationOnly: true, rows: { "0": "F x F" }, cursor: { x: 4, y: 0 } });
  state = key(state, "F");
  expect(game.observe(state).mode).toBe("FindLeft");
  state = key(state, "F");
  expect(game.observe(state).mode).toBe("Normal");
  expect(game.observe(state).cursor).toEqual({ x: 0, y: 0 });
  expect(game.observe(state).buildTarget).toBeNull();
});

test("B2 construction is local to the target patch and moving buildings never drifts the cursor", () => {
  const initial = game.scenario({ cursor: { x: 13, y: 10 } });
  const first = game.build(initial, "a01", "well");
  const firstSite = sites.find(site => site.id === "a01")!;
  expect(outsidePatch(game.field(first).text, firstSite, game.field(initial).text))
    .toBe(outsidePatch(game.field(initial).text, firstSite, game.field(initial).text));
  expect(game.observe(first).cursor).toEqual(game.observe(initial).cursor);

  const second = game.build(first, "z02", "ring");
  const secondSite = sites.find(site => site.id === "z02")!;
  expect(outsidePatch(game.field(second).text, secondSite, game.field(first).text))
    .toBe(outsidePatch(game.field(first).text, secondSite, game.field(first).text));
  expect(game.observe(second).cursor).toEqual(game.observe(initial).cursor);
  expect(game.observe(second).sites.a01).toEqual({ kind: "well", mana: 0, link: null });
  expect(game.observe(second).sites.a02).toEqual({ kind: "empty" });
});

test("B1 preview comes from the core composition, is side-effect free and disappears when occupied", () => {
  for (const site of [sites[0]!, sites[1]!, sites[6]!, sites[7]!]) {
    for (const kind of ["well", "ring"] as const) {
      const state = game.scenario({ cursor: { x: site.x, y: site.y } });
      const before = game.field(state).text;
      const ghost = game.preview(state, site.id, kind);
      expect(game.field(state).text).toBe(before);
      expect(ghost).toEqual(game.field(game.build(state, site.id, kind)));
      expect(ghost.width).toBe(240);
      expect(ghost.height).toBe(160);
    }
  }

  const occupied = game.build(game.initial(), "a01", "well");
  expect(game.preview(occupied, "a01", "ring")).toEqual(game.field(occupied));
  const blank = game.scenario({ navigationOnly: true });
  expect(game.preview(blank, "a01", "well")).toEqual(game.field(blank));
});
