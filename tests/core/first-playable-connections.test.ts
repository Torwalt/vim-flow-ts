import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { game, type SiteId, type World } from "../../src/core/game";
import { arrowHead, cellCenter, clipSegment } from "../../src/web/overlay";

type ConnectionCase = {
  id: string;
  requires: string[];
  setup: Record<string, unknown>;
  events: Array<
    | { type: "key"; key: string; blocked?: boolean }
    | { type: "build"; site: SiteId; kind: "well" | "ring" }
    | { type: "link"; source: SiteId; target: SiteId }
    | { type: "blur" }
  >;
  expect: Record<string, unknown>;
};

const root = resolve(import.meta.dir, "../..");
const cases = JSON.parse(readFileSync(resolve(root, "spec/first-playable/connections.json"), "utf8")) as ConnectionCase[];
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

function apply(state: World, event: ConnectionCase["events"][number]): World {
  if (event.type === "key") return game.dispatch(state, { type: "key", key: event.key, blocked: event.blocked === true });
  if (event.type === "build") return game.build(state, event.site, event.kind);
  if (event.type === "link") return game.link(state, event.source, event.target);
  if (event.type === "blur") return game.dispatch(state, { type: "blur" });
  throw new Error("Unsupported connection event");
}

function key(state: World, value: string, blocked = false): World {
  return game.dispatch(state, { type: "key", key: value, blocked });
}

function blur(state: World): World {
  return game.dispatch(state, { type: "blur" });
}

function type(state: World, value: string): World {
  let next = state;
  for (const character of Array.from(value)) next = key(next, character);
  return next;
}

function center(site: (typeof sites)[number]): { x: number; y: number } {
  return { x: site.x + 5, y: site.y + 2 };
}

function site(id: SiteId): (typeof sites)[number] {
  return sites.find(candidate => candidate.id === id)!;
}

function count(value: number): string[] {
  return String(value).split("");
}

function move(state: World, from: { x: number; y: number }, to: { x: number; y: number }): World {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let next = state;
  if (dx !== 0) {
    for (const digit of count(Math.abs(dx))) next = key(next, digit);
    next = key(next, dx > 0 ? "l" : "h");
  }
  if (dy !== 0) {
    for (const digit of count(Math.abs(dy))) next = key(next, digit);
    next = key(next, dy > 0 ? "j" : "k");
  }
  return next;
}

for (const example of cases) {
  test(`connections.json ${example.id}`, () => {
    let state = game.scenario(example.setup);
    for (const event of example.events) state = apply(state, event);
    partial(observed(state, example.expect), example.expect);
  });
}

test("coverage activates I2, L1 and L2 with every connection case and leaves later work pending", () => {
  for (const id of ["I2", "L1", "L2"]) {
    const owned = cases.filter(example => example.requires.includes(id)).map(example => example.id).sort();
    expect(coverage.requirements[id]?.status).toBe("active");
    expect(coverage.requirements[id]?.unit).toBe("5.1");
    expect(coverage.requirements[id]?.exports).toContain("game.dispatch");
    expect(coverage.requirements[id]?.tests).toContain("tests/core/first-playable-connections.test.ts");
    expect(coverage.requirements[id]?.cases?.slice().sort()).toEqual(owned);
    expect(owned.length).toBeGreaterThan(0);
  }
  expect(coverage.requirements.L1?.exports).toContain("game.link");
  expect(coverage.requirements.L2?.exports).toContain("game.link");
  for (const id of ["V2", "E1", "E2", "E3", "E4", "T1", "T2"]) {
    expect(coverage.requirements[id]?.status).toBe("pending");
  }
});

test("I2 accepts bounded printable drafts, wastes backspaces and ignores blocked/nonprintable input", () => {
  const built = game.scenario({
    cursor: { x: 13, y: 10 },
    buildings: [{ site: "a01", kind: "well" }],
  });
  const fieldBefore = game.field(built).text;
  let state = key(built, "i");
  expect(game.observe(state).mode).toBe("Insert");
  expect(game.observe(state).insertSite).toBe("a01");
  expect(game.observe(state).commandBuffer).toBe("");
  expect(game.observe(state).cursor).toEqual({ x: 13, y: 10 });

  for (let index = 0; index < 40; index++) state = key(state, "x");
  expect(game.observe(state).commandBuffer).toBe("x".repeat(32));
  expect(game.field(state).text).toBe(fieldBefore);
  state = key(state, "Backspace");
  expect(game.observe(state).commandBuffer).toBe("x".repeat(31));
  state = key(state, "l");
  expect(game.observe(state).commandBuffer).toBe(`${"x".repeat(31)}l`);
  expect(game.observe(state).cursor).toEqual({ x: 13, y: 10 });

  const before = game.observe(state);
  for (const value of ["ArrowLeft", "\t", "\n", "é", "😀"]) {
    const unchanged = key(state, value);
    expect(game.observe(unchanged)).toEqual(before);
  }
  for (const value of ["Escape", "Enter", "Backspace", "x"]) {
    expect(key(state, value, true)).toBe(state);
  }

  for (let index = 0; index < 40; index++) state = key(state, "Backspace");
  expect(game.observe(state).commandBuffer).toBe("");
  const empty = game.observe(state);
  expect(key(state, "Backspace")).toBe(state);
  expect(game.observe(state)).toEqual(empty);

  state = key(state, "Escape");
  expect(game.observe(state).mode).toBe("Normal");
  expect(game.observe(state).commandBuffer).toBe("");
  expect(game.observe(state).pendingSource).toBeNull();
});

test("I2 matches only the exact connect command and keeps ring Escape distinct from Enter", () => {
  const setup = {
    cursor: { x: 37, y: 10 },
    buildings: [
      { site: "a01", kind: "well", mana: 400 },
      { site: "a02", kind: "ring", mana: 300, produced: 2 },
    ],
  };
  for (const draft of ["Connect", "connect ", " connect", "connect\n", ""]) {
    let state = key(game.scenario(setup), "i");
    state = type(state, draft);
    state = key(state, "Enter");
    const invalid = game.observe(state);
    expect({ mode: invalid.mode, source: invalid.pendingSource, draft: invalid.commandBuffer })
      .toEqual({ mode: "Normal", source: null, draft: "" });
    expect(invalid.notice.length).toBeGreaterThan(0);
    expect(invalid.sites.a01?.kind === "well" ? invalid.sites.a01.link : undefined).toBeNull();
  }

  const staged = game.scenario({ ...setup, pendingSource: "a01" });
  let state = key(staged, "i");
  state = type(state, "connect");
  state = key(state, "Escape");
  let observation = game.observe(state);
  expect({ mode: observation.mode, source: observation.pendingSource, draft: observation.commandBuffer })
    .toEqual({ mode: "Normal", source: "a01", draft: "" });
  expect(observation.links).toEqual([]);

  state = key(staged, "i");
  state = type(state, "connect");
  state = key(state, "Enter");
  observation = game.observe(state);
  expect({ mode: observation.mode, source: observation.pendingSource, draft: observation.commandBuffer })
    .toEqual({ mode: "Normal", source: null, draft: "" });
  expect(observation.links).toEqual([{
    source: "a01",
    target: "a02",
    from: { x: 13, y: 10 },
    to: { x: 37, y: 10 },
  }]);
  expect(observation.sites.a01).toEqual({ kind: "well", mana: 400, link: "a02" });
  expect(observation.sites.a02).toEqual({ kind: "ring", mana: 300, produced: 2 });
});

test("I2 invalid Enter and well Escape preserve a staged source; Normal Escape and blur cancel it", () => {
  const setup = {
    cursor: { x: 37, y: 10 },
    buildings: [
      { site: "a01", kind: "well" },
      { site: "a02", kind: "ring" },
    ],
    pendingSource: "a01" as SiteId,
  };
  let state = key(game.scenario(setup), "i");
  state = type(state, "con");
  state = key(state, "Enter");
  let observation = game.observe(state);
  expect({ mode: observation.mode, source: observation.pendingSource, draft: observation.commandBuffer })
    .toEqual({ mode: "Normal", source: "a01", draft: "" });
  expect(observation.notice.length).toBeGreaterThan(0);
  expect(observation.links).toEqual([]);

  state = key(game.scenario(setup), "i");
  state = type(state, "connect");
  state = key(state, "Enter");
  expect(game.observe(state).pendingSource).toBeNull();

  const well = game.scenario({
    cursor: { x: 13, y: 10 },
    buildings: [
      { site: "a01", kind: "well" },
      { site: "b01", kind: "well" },
    ],
    pendingSource: "b01",
  });
  state = key(well, "i");
  state = type(state, "nonsense");
  state = key(state, "Escape");
  observation = game.observe(state);
  expect({ mode: observation.mode, source: observation.pendingSource, draft: observation.commandBuffer })
    .toEqual({ mode: "Normal", source: "b01", draft: "" });

  state = key(game.scenario(setup), "i");
  state = type(state, "connect");
  state = key(state, "Enter");
  expect(game.observe(state).pendingSource).toBeNull();
  state = blur(game.scenario(setup));
  expect(game.observe(state).pendingSource).toBeNull();
});

test("I2 Escape scopes retain a source in navigation prefixes, Leader and Build but blur clears all", () => {
  const setup = {
    cursor: { x: 13, y: 10 },
    buildings: [
      { site: "a01", kind: "well" },
      { site: "a02", kind: "ring" },
    ],
    pendingSource: "a01" as SiteId,
  };
  let state = key(game.scenario(setup), "f");
  expect(game.observe(state).mode).toBe("FindRight");
  state = key(state, "Escape");
  expect({ mode: game.observe(state).mode, source: game.observe(state).pendingSource })
    .toEqual({ mode: "Normal", source: "a01" });

  state = key(game.scenario(setup), "g");
  expect(game.observe(state).mode).toBe("Go");
  state = key(state, "Escape");
  expect({ mode: game.observe(state).mode, source: game.observe(state).pendingSource })
    .toEqual({ mode: "Normal", source: "a01" });

  state = key(game.scenario(setup), " ");
  expect(game.observe(state).mode).toBe("Leader");
  state = key(state, "Escape");
  expect({ mode: game.observe(state).mode, source: game.observe(state).pendingSource })
    .toEqual({ mode: "Normal", source: "a01" });

  state = key(key(game.scenario(setup), " "), "f");
  expect(game.observe(state).mode).toBe("Build");
  state = key(state, "Escape");
  expect({ mode: game.observe(state).mode, source: game.observe(state).pendingSource })
    .toEqual({ mode: "Normal", source: "a01" });

  state = key(game.scenario(setup), "Escape");
  expect(game.observe(state).pendingSource).toBeNull();

  state = key(game.scenario(setup), "i");
  state = type(state, "con");
  state = blur(state);
  const blurred = game.observe(state);
  expect({ mode: blurred.mode, source: blurred.pendingSource, draft: blurred.commandBuffer, links: blurred.links })
    .toEqual({ mode: "Normal", source: null, draft: "", links: [] });
});

test("I2 Normal i requires a built captured site and reports empty and outside cells", () => {
  for (const cursor of [{ x: 13, y: 10 }, { x: 19, y: 8 }, { x: 100, y: 100 }]) {
    const state = key(game.scenario({ cursor }), "i");
    const observation = game.observe(state);
    expect({ mode: observation.mode, insertSite: observation.insertSite, draft: observation.commandBuffer })
      .toEqual({ mode: "Normal", insertSite: null, draft: "" });
    expect(observation.notice.length).toBeGreaterThan(0);
  }

  const ring = game.scenario({
    cursor: { x: 37, y: 10 },
    buildings: [{ site: "a02", kind: "ring" }],
  });
  const state = key(ring, "i");
  const observation = game.observe(state);
  expect({ mode: observation.mode, insertSite: observation.insertSite, draft: observation.commandBuffer })
    .toEqual({ mode: "Insert", insertSite: "a02", draft: "" });
});

test("L1 the keyboard sequence links each varied well/ring pair without a premature link", () => {
  const pairs = [
    ["a01", "a02"],
    ["a03", "a04"],
    ["b01", "b02"],
  ] as const;
  for (const [well, ring] of pairs) {
    const wellSite = site(well);
    const ringSite = site(ring);
    let state = game.scenario({
      cursor: center(wellSite),
      buildings: [
        { site: well, kind: "well", mana: 321 },
        { site: ring, kind: "ring", mana: 654, produced: 1 },
      ],
    });
    state = key(state, "i");
    state = type(state, "connect");
    state = key(state, "Escape");
    let observation = game.observe(state);
    expect({ mode: observation.mode, source: observation.pendingSource, link: observation.links.length })
      .toEqual({ mode: "Normal", source: well, link: 0 });

    state = move(state, center(wellSite), center(ringSite));
    expect(game.observe(state).cursor).toEqual(center(ringSite));
    state = key(state, "i");
    state = type(state, "connect");
    observation = game.observe(state);
    expect({ mode: observation.mode, source: observation.pendingSource, links: observation.links.length })
      .toEqual({ mode: "Insert", source: well, links: 0 });

    state = key(state, "Enter");
    observation = game.observe(state);
    expect({ mode: observation.mode, source: observation.pendingSource })
      .toEqual({ mode: "Normal", source: null });
    expect(observation.sites[well]).toEqual({ kind: "well", mana: 321, link: ring });
    expect(observation.sites[ring]).toEqual({ kind: "ring", mana: 654, produced: 1 });
    expect(observation.links).toEqual([{
      source: well,
      target: ring,
      from: center(wellSite),
      to: center(ringSite),
    }]);
  }
});

test("L2 every existing well can legally link to every existing ring and invalid endpoints are identity", () => {
  for (const well of sites) {
    for (const ring of sites) {
      if (well.id === ring.id) continue;
      const state = game.scenario({
        buildings: [
          { site: well.id, kind: "well", mana: 123 },
          { site: ring.id, kind: "ring", mana: 456, produced: 3 },
        ],
      });
      const linked = game.link(state, well.id, ring.id);
      const observation = game.observe(linked);
      expect(observation.sites[well.id]).toEqual({ kind: "well", mana: 123, link: ring.id });
      expect(observation.sites[ring.id]).toEqual({ kind: "ring", mana: 456, produced: 3 });
      expect(observation.impCount).toBe(3);
      expect(observation.cursor).toEqual(game.observe(state).cursor);
      expect(game.link(linked, well.id, ring.id)).toBe(linked);
    }
  }

  const well = game.scenario({ buildings: [{ site: "a01", kind: "well", mana: 10 }, { site: "a02", kind: "ring" }] });
  const ring = game.scenario({ buildings: [{ site: "a01", kind: "ring" }, { site: "a02", kind: "ring" }] });
  const emptyTarget = game.scenario({ buildings: [{ site: "a01", kind: "well" }] });
  const blank = game.scenario({ navigationOnly: true });
  expect(game.link(ring, "a01", "a02")).toBe(ring);
  expect(game.link(well, "a02", "a01")).toBe(well);
  expect(game.link(emptyTarget, "a01", "a02")).toBe(emptyTarget);
  expect(game.link(blank, "a01", "a02")).toBe(blank);
  expect(game.link(well, "a01", "a01")).toBe(well);
});

test("L2 links have one outgoing and many incoming IDs; relinking is atomic and preserves ownership", () => {
  const state = game.scenario({
    buildings: [
      { site: "a01", kind: "well", mana: 111, link: "b02" },
      { site: "a02", kind: "ring", mana: 222, produced: 1 },
      { site: "a03", kind: "well", mana: 333, link: "b02" },
      { site: "a04", kind: "well", mana: 444, link: "b02" },
      { site: "b01", kind: "ring", mana: 555, produced: 4 },
      { site: "b02", kind: "ring", mana: 666, produced: 2 },
    ],
  });
  let observation = game.observe(state);
  expect(observation.sites.a01).toEqual({ kind: "well", mana: 111, link: "b02" });
  expect(observation.sites.a03).toEqual({ kind: "well", mana: 333, link: "b02" });
  expect(observation.sites.a04).toEqual({ kind: "well", mana: 444, link: "b02" });
  expect(observation.links.map(link => `${link.source}>${link.target}`).sort())
    .toEqual(["a01>b02", "a03>b02", "a04>b02"]);

  const relinked = game.link(state, "a01", "b01");
  observation = game.observe(relinked);
  expect(observation.sites.a01).toEqual({ kind: "well", mana: 111, link: "b01" });
  expect(observation.sites.a03).toEqual({ kind: "well", mana: 333, link: "b02" });
  expect(observation.sites.a04).toEqual({ kind: "well", mana: 444, link: "b02" });
  expect(observation.sites.a02).toEqual({ kind: "ring", mana: 222, produced: 1 });
  expect(observation.sites.b01).toEqual({ kind: "ring", mana: 555, produced: 4 });
  expect(observation.sites.b02).toEqual({ kind: "ring", mana: 666, produced: 2 });
  expect(observation.imps).toEqual(game.observe(state).imps);
});

test("L2 crossing links stay independent with no accidental junction or endpoint swap", () => {
  let state = game.scenario({
    buildings: [
      { site: "a01", kind: "well" },
      { site: "a03", kind: "well" },
      { site: "b01", kind: "ring" },
      { site: "b02", kind: "ring" },
    ],
  });
  state = game.link(game.link(state, "a01", "b02"), "a03", "b01");
  let observation = game.observe(state);
  expect(observation.links.map(link => `${link.source}>${link.target}`).sort())
    .toEqual(["a01>b02", "a03>b01"]);
  expect(observation.sites.a01).toEqual({ kind: "well", mana: 0, link: "b02" });
  expect(observation.sites.a03).toEqual({ kind: "well", mana: 0, link: "b01" });

  const first = observation.links.find(link => link.source === "a01")!;
  const second = observation.links.find(link => link.source === "a03")!;
  expect(first.from).toEqual({ x: 13, y: 10 });
  expect(first.to).toEqual({ x: 37, y: 34 });
  expect(second.from).toEqual({ x: 61, y: 10 });
  expect(second.to).toEqual({ x: 13, y: 34 });

  state = game.link(state, "a01", "b01");
  observation = game.observe(state);
  expect(observation.links.map(link => `${link.source}>${link.target}`).sort())
    .toEqual(["a01>b01", "a03>b01"]);
  expect(observation.sites.b02).toEqual({ kind: "ring", mana: 0, produced: 0 });
});

test("L2 overlay geometry clips off-screen links and keeps crossing arrowheads separate", () => {
  expect(cellCenter(3, 2, 12, 20)).toEqual({ x: 42, y: 50 });
  expect(clipSegment({ x: 10, y: 10 }, { x: 20, y: 10 }, 100, 100))
    .toEqual({ from: { x: 10, y: 10 }, to: { x: 20, y: 10 } });
  expect(clipSegment({ x: -10, y: 10 }, { x: 20, y: 10 }, 100, 100))
    .toEqual({ from: { x: 0, y: 10 }, to: { x: 20, y: 10 } });
  expect(clipSegment({ x: 20, y: 10 }, { x: 120, y: 10 }, 100, 100))
    .toEqual({ from: { x: 20, y: 10 }, to: { x: 100, y: 10 } });
  expect(clipSegment({ x: -10, y: -10 }, { x: 110, y: 110 }, 100, 100))
    .toEqual({ from: { x: 0, y: 0 }, to: { x: 100, y: 100 } });
  expect(clipSegment({ x: -10, y: 20 }, { x: -20, y: 30 }, 100, 100)).toBeNull();
  expect(clipSegment({ x: 10, y: 10 }, { x: 20, y: 20 }, 0, 100)).toBeNull();

  const [left, right] = arrowHead({ x: 0, y: 0 }, { x: 10, y: 0 }, 6);
  expect(left.x).toBeLessThan(10);
  expect(right.x).toBeLessThan(10);
  expect(left.y).not.toBe(right.y);
  const [backLeft, backRight] = arrowHead({ x: 10, y: 0 }, { x: 0, y: 0 }, 6);
  expect(backLeft.x).toBeGreaterThan(0);
  expect(backRight.x).toBeGreaterThan(0);

  const down = clipSegment({ x: 5, y: 5 }, { x: 105, y: 105 }, 100, 100)!;
  const up = clipSegment({ x: 5, y: 95 }, { x: 105, y: -5 }, 100, 100)!;
  expect(down.to).toEqual({ x: 100, y: 100 });
  expect(up.to).toEqual({ x: 100, y: 0 });
  expect(down.from).not.toEqual(up.from);
  const downHead = arrowHead(down.from, down.to, 4);
  const upHead = arrowHead(up.from, up.to, 4);
  expect(downHead[0].y).toBeLessThan(down.to.y);
  expect(upHead[0].y).toBeGreaterThan(up.to.y);
  expect(downHead).not.toEqual(upHead);
});
