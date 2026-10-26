import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { game, type SiteId, type World } from "../../src/core/game";

type Case = {
  id: string;
  requires: string[];
  setup: Record<string, unknown>;
  events: unknown[];
  expect: Record<string, unknown>;
};

const root = resolve(import.meta.dir, "../..");
const cases = JSON.parse(readFileSync(resolve(root, "spec/first-playable/world.json"), "utf8")) as Case[];
const coverage = JSON.parse(readFileSync(resolve(root, "spec/first-playable/coverage.json"), "utf8")) as {
  requirements: Record<string, { status: string; unit: string; exports?: string[]; tests?: string[]; cases?: string[] }>;
};

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

const impSlots = [1, 2, 3, 4, 5] as const;
const rally = (site: (typeof sites)[number], slot: number): { x: number; y: number } => ({
  x: site.x + [1, 3, 5, 7, 9][slot - 1]!,
  y: site.y + 6,
});

for (const example of cases) {
  test(`world.json ${example.id}`, () => {
    const state = game.scenario(example.setup);
    partial(observed(state, example.expect), example.expect);
  });
}

test("coverage activates every first-playable requirement with its mapped cases", () => {
  const ids = ["W1", "W2", "N1", "N2", "V1", "V2", "B1", "B2", "I1", "I2", "L1", "L2", "E1", "E2", "E3", "E4", "T1", "T2"];
  expect(Object.keys(coverage.requirements).sort()).toEqual([...ids].sort());
  for (const id of ids) expect(coverage.requirements[id]?.status).toBe("active");
  expect(coverage.requirements.W1?.cases).toEqual(["world.initial"]);
  expect(coverage.requirements.W2?.cases?.sort()).toEqual(cases.map(c => c.id).sort());
  expect(coverage.requirements.V2?.cases).toEqual(["browser.complete-loop"]);
});

test("W1 initial world has exact dimensions, identity and an empty fixed map", () => {
  const state = game.initial();
  const observation = game.observe(state);
  expect(observation.width).toBe(240);
  expect(observation.height).toBe(160);
  expect(observation.cursor).toEqual({ x: 13, y: 10 });
  expect(observation.mode).toBe("Normal");
  expect(observation.count).toBe(0);
  expect(observation.pendingSource).toBeNull();
  expect(observation.menuSelection).toBeNull();
  expect(observation.commandBuffer).toBe("");
  expect(observation.manualPaused).toBe(false);
  expect(observation.suspended).toBe(false);
  expect(observation.elapsedTicks).toBe(0);
  expect(observation.remainderMs).toBe(0);
  expect(observation.siteCount).toBe(8);
  expect(observation.buildingCount).toBe(0);
  expect(observation.impCount).toBe(0);
  expect(observation.siteAtCursor).toBe("a01");
  expect(Object.keys(observation.sites).sort()).toEqual(sites.map(site => site.id).sort());
  for (const site of sites) expect(observation.sites[site.id]).toEqual({ kind: "empty" });
  expect(observation.imps).toEqual([]);
  expect(game.field(state).text.length).toBe(240 * 160);
  expect(game.glyphAt(state, 0, 0)).toBe("#");
  expect(game.glyphAt(state, 239, 159)).toBe("#");
  expect(game.glyphAt(state, 8, 60)).toBe("~");
  expect(game.glyphAt(state, 31, 61)).toBe("~");
  expect(game.glyphAt(state, 8, 59)).toBe(" ");
  expect(game.glyphAt(state, 80, 100)).toBe("^");
  expect(game.glyphAt(state, 91, 100)).toBe("^");
  expect(game.glyphAt(state, 92, 100)).toBe(" ");
});

test("W1 constructors accept varied navigationOnly fields and sanitize code points", () => {
  const state = game.scenario({
    navigationOnly: true,
    rows: { "0": " A😀\tB\nC ", "1": "x".repeat(245), "159": "tail" },
    cursor: { x: 239, y: 159 },
  });
  const observation = game.observe(state);
  expect(observation.siteCount).toBe(0);
  expect(observation.buildingCount).toBe(0);
  expect(observation.impCount).toBe(0);
  expect(observation.sites).toEqual({});
  expect(observation.siteAtCursor).toBeNull();
  expect(observation.cursor).toEqual({ x: 239, y: 159 });
  expect(game.field(state).text.length).toBe(240 * 160);
  expect(game.glyphAt(state, 0, 0)).toBe(" ");
  expect(game.glyphAt(state, 1, 0)).toBe("A");
  expect(game.glyphAt(state, 2, 0)).toBe(" ");
  expect(game.glyphAt(state, 4, 0)).toBe("B");
  expect(game.glyphAt(state, 6, 0)).toBe("C");
  expect(game.glyphAt(state, 0, 1)).toBe("x");
  expect(game.glyphAt(state, 239, 1)).toBe("x");
  expect(game.glyphAt(state, 0, 2)).toBe(" ");
  expect(game.glyphAt(state, 0, 159)).toBe("t");
  expect(game.glyphAt(state, 3, 159)).toBe("l");
});

test("W1 constructors accept every site, both building kinds and all five imp counts", () => {
  const state = game.scenario({
    cursor: { x: 234, y: 158 },
    buildings: [
      { site: "a01", kind: "well", mana: 2000, link: "a02" },
      { site: "a02", kind: "ring", mana: 1000, produced: 5 },
      { site: "a03", kind: "well", mana: 123, link: "b02" },
      { site: "a04", kind: "ring", mana: 500, produced: 1 },
      { site: "b01", kind: "ring", mana: 7, produced: 2 },
      { site: "b02", kind: "ring", mana: 0, produced: 0 },
      { site: "z01", kind: "well", mana: 0, link: null },
      { site: "z02", kind: "ring", mana: 999, produced: 4 },
    ],
    pendingSource: "a01",
  });
  const observation = game.observe(state);
  expect(observation.siteAtCursor).toBe("z02");
  expect(observation.buildingCount).toBe(8);
  expect(observation.siteCount).toBe(8);
  expect(observation.pendingSource).toBe("a01");
  expect(observation.sites.a01).toEqual({ kind: "well", mana: 2000, link: "a02" });
  expect(observation.sites.a03).toEqual({ kind: "well", mana: 123, link: "b02" });
  expect(observation.sites.a04).toEqual({ kind: "ring", mana: 500, produced: 1 });
  expect(observation.sites.b01).toEqual({ kind: "ring", mana: 7, produced: 2 });
  expect(observation.sites.z02).toEqual({ kind: "ring", mana: 999, produced: 4 });
  expect(observation.impCount).toBe(12);
  const expected = (["a02", "a04", "b01", "z02"] as const).flatMap(id => {
    const site = sites.find(candidate => candidate.id === id)!;
    const produced = observation.sites[id]?.kind === "ring" ? observation.sites[id].produced : 0;
    return Array.from({ length: produced }, (_, index) => ({ ring: id, slot: impSlots[index]!, ...rally(site, index + 1) }));
  });
  expect(observation.imps).toEqual(expected);
});

test("W1 a valid ring produces exactly its first n reserved slot imps", () => {
  const site = sites.find(candidate => candidate.id === "a02")!;
  for (let produced = 0; produced <= 5; produced++) {
    const state = game.scenario({ buildings: [{ site: "a02", kind: "ring", produced }] });
    const observation = game.observe(state);
    expect(observation.impCount).toBe(produced);
    expect(observation.imps).toEqual(Array.from({ length: produced }, (_, index) => ({
      ring: "a02",
      slot: impSlots[index]!,
      ...rally(site, index + 1),
    })));
    for (let slot = 1; slot <= 5; slot++) {
      const cell = rally(site, slot);
      expect(game.siteAt(state, cell.x, cell.y)).toBe("a02");
      expect(game.glyphAt(state, cell.x, cell.y)).toBe(slot <= produced ? "i" : " ");
    }
  }
});

test("W1 snapshot and scenario roundtrip arbitrary valid observations and fields", () => {
  const scenarios: unknown[] = [
    {},
    { cursor: { x: 0, y: 0 } },
    { cursor: { x: 239, y: 159 } },
    { navigationOnly: true },
    { navigationOnly: true, rows: { "0": "alpha beta ++", "1": "  wall xx x", "159": "z".repeat(300) }, cursor: { x: 239, y: 159 } },
    {
      cursor: { x: 234, y: 158 },
      buildings: [
        { site: "a01", kind: "well", mana: 2000, link: "a02" },
        { site: "a02", kind: "ring", mana: 1000, produced: 5 },
        { site: "z02", kind: "ring", mana: 7, produced: 2 },
      ],
      pendingSource: "a01",
    },
  ];
  for (const spec of scenarios) {
    const state = game.scenario(spec);
    const roundtrip = game.scenario(game.snapshot(state));
    expect(game.observe(roundtrip)).toEqual(game.observe(state));
    expect(game.field(roundtrip)).toEqual(game.field(state));
  }
});

test("W1 invalid fixture inputs are rejected rather than narrowed", () => {
  const invalid: unknown[] = [
    null,
    [],
    { unknown: true },
    { navigationOnly: "yes" },
    { cursor: { x: 240, y: 0 } },
    { cursor: { x: 0, y: 160 } },
    { cursor: { x: -1, y: 0 } },
    { cursor: { x: 1.5, y: 0 } },
    { cursor: { x: 0 } },
    { rows: { "0": "x" } },
    { navigationOnly: true, rows: { "160": "x" } },
    { navigationOnly: true, rows: { "01": "x" } },
    { navigationOnly: true, rows: { "-1": "x" } },
    { navigationOnly: true, rows: { x: "x" } },
    { navigationOnly: true, rows: { "0": 3 } },
    { buildings: [{ site: "x01", kind: "well" }] },
    { buildings: [{ site: "a01", kind: "empty" }] },
    { buildings: [{ site: "a01", kind: "well" }, { site: "a01", kind: "ring" }] },
    { buildings: [{ site: "a01", kind: "well", mana: -1 }] },
    { buildings: [{ site: "a01", kind: "well", mana: 2001 }] },
    { buildings: [{ site: "a01", kind: "ring", mana: 1001 }] },
    { buildings: [{ site: "a01", kind: "ring", produced: 6 }] },
    { buildings: [{ site: "a01", kind: "ring", produced: -1 }] },
    { buildings: [{ site: "a01", kind: "ring", produced: 1.5 }] },
    { buildings: [{ site: "a01", kind: "well", produced: 1 }] },
    { buildings: [{ site: "a01", kind: "well", link: "a02" }] },
    { buildings: [{ site: "a01", kind: "well", link: "a02" }, { site: "a02", kind: "well" }] },
    { buildings: [{ site: "a01", kind: "ring", link: "a02" }] },
    { pendingSource: "a01" },
    { buildings: [{ site: "a01", kind: "ring" }], pendingSource: "a01" },
    { navigationOnly: true, buildings: [{ site: "a01", kind: "well" }] },
    { navigationOnly: true, pendingSource: "a01" },
  ];
  for (const spec of invalid) expect(() => game.scenario(spec)).toThrow();
});

test("W2 site hitboxes are exact non-overlapping 11x7 patches", () => {
  const state = game.initial();
  for (let left = 0; left < sites.length; left++) {
    for (let right = left + 1; right < sites.length; right++) {
      const a = sites[left]!;
      const b = sites[right]!;
      const disjoint = a.x + 11 <= b.x || b.x + 11 <= a.x || a.y + 7 <= b.y || b.y + 7 <= a.y;
      expect(disjoint).toBe(true);
    }
  }
  const counts = new Map<SiteId, number>();
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 240; x++) {
      const owner = sites.find(site => x >= site.x && x < site.x + 11 && y >= site.y && y < site.y + 7)?.id ?? null;
      expect(game.siteAt(state, x, y)).toBe(owner);
      if (owner !== null) counts.set(owner, (counts.get(owner) ?? 0) + 1);
    }
  }
  for (const site of sites) expect(counts.get(site.id)).toBe(77);
  expect(game.siteAt(state, -1, 0)).toBeNull();
  expect(game.siteAt(state, 0, -1)).toBeNull();
  expect(game.siteAt(state, 240, 0)).toBeNull();
  expect(game.siteAt(state, 0, 160)).toBeNull();
});

test("W2 patch corners, rally cells and far sites target as specified", () => {
  const state = game.scenario({
    buildings: [{ site: "z02", kind: "ring", produced: 5 }],
  });
  for (const site of sites) {
    expect(game.siteAt(state, site.x - 1, site.y)).toBeNull();
    expect(game.siteAt(state, site.x + 11, site.y)).toBeNull();
    expect(game.siteAt(state, site.x, site.y + 7)).toBeNull();
  }
  expect(game.siteAt(state, 8, 8)).toBe("a01");
  expect(game.siteAt(state, 18, 14)).toBe("a01");
  expect(game.siteAt(state, 18, 15)).toBeNull();
  expect(game.siteAt(state, 19, 8)).toBeNull();
  expect(game.siteAt(state, 224, 152)).toBe("z02");
  expect(game.siteAt(state, 234, 158)).toBe("z02");
  expect(game.siteAt(state, 235, 158)).toBeNull();
  expect(game.siteAt(state, 224, 159)).toBeNull();
  const far = sites.find(site => site.id === "z02")!;
  for (let slot = 1; slot <= 5; slot++) {
    const cell = rally(far, slot);
    expect(game.siteAt(state, cell.x, cell.y)).toBe("z02");
    expect(game.glyphAt(state, cell.x, cell.y)).toBe("i");
  }
});

test("W2 composed glyphs carry IDs, empty/well/ring art, labels and imps", () => {
  const empty = game.initial();
  expect(game.glyphAt(empty, 8, 8)).toBe("a");
  expect(game.glyphAt(empty, 9, 8)).toBe("0");
  expect(game.glyphAt(empty, 10, 8)).toBe("1");
  expect(game.glyphAt(empty, 13, 10)).toBe("+");
  expect(game.glyphAt(empty, 11, 9)).toBe(" ");

  const well = game.scenario({ buildings: [{ site: "a01", kind: "well" }] });
  expect(game.glyphAt(well, 8, 8)).toBe("a");
  expect(game.glyphAt(well, 13, 10)).toBe("~");
  expect(game.glyphAt(well, 11, 9)).toBe(".");
  expect(game.glyphAt(well, 12, 9)).toBe("-");
  expect(game.glyphAt(well, 13, 9)).toBe("-");
  expect(game.glyphAt(well, 11, 10)).toBe("|");
  expect(game.glyphAt(well, 15, 10)).toBe("|");
  expect(game.glyphAt(well, 11, 11)).toBe("'");
  expect(game.glyphAt(well, 15, 11)).toBe("'");
  expect(game.glyphAt(well, 11, 12)).toBe("W");
  expect(game.glyphAt(well, 12, 12)).toBe("E");
  expect(game.glyphAt(well, 13, 12)).toBe("L");
  expect(game.glyphAt(well, 14, 12)).toBe("L");

  const ring = game.scenario({ buildings: [{ site: "a01", kind: "ring", produced: 2 }] });
  expect(game.glyphAt(ring, 13, 10)).toBe("o");
  expect(game.glyphAt(ring, 11, 9)).toBe("/");
  expect(game.glyphAt(ring, 15, 9)).toBe("\\");
  expect(game.glyphAt(ring, 11, 11)).toBe("\\");
  expect(game.glyphAt(ring, 15, 11)).toBe("/");
  expect(game.glyphAt(ring, 11, 12)).toBe("R");
  expect(game.glyphAt(ring, 14, 12)).toBe("G");
  expect(game.glyphAt(ring, 9, 14)).toBe("i");
  expect(game.glyphAt(ring, 11, 14)).toBe("i");
  expect(game.glyphAt(ring, 13, 14)).toBe(" ");
});

test("W2 composition is pure, cursor-preserving and local to a patch", () => {
  const initial = game.initial();
  const before = game.observe(initial);
  const initialText = game.field(initial).text;
  for (let i = 0; i < 100; i++) {
    game.observe(initial);
    game.glyphAt(initial, i, 100);
    game.siteAt(initial, i, 8);
    game.field(initial);
    game.snapshot(initial);
  }
  expect(game.observe(initial)).toEqual(before);
  expect(game.field(initial).text).toBe(initialText);

  const built = game.scenario({
    cursor: { x: 13, y: 10 },
    buildings: [{ site: "a01", kind: "well" }],
  });
  const builtText = game.field(built).text;
  const patch = sites.find(site => site.id === "a01")!;
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 240; x++) {
      if (x >= patch.x && x < patch.x + 11 && y >= patch.y && y < patch.y + 7) continue;
      expect(builtText[y * 240 + x]).toBe(initialText[y * 240 + x]);
    }
  }
  expect(game.observe(built).cursor).toEqual({ x: 13, y: 10 });
});
