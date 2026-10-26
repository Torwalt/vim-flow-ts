import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { game, type World } from "../../src/core/game";
import { createNavigation } from "../../src/core/game-navigation";
import { seedText } from "../../spec/navigation/helpers";

type NavCase = {
  id: string;
  requires: string[];
  setup: Record<string, unknown>;
  events: Array<{ type: string; key?: string; blocked?: boolean }>;
  expect: Record<string, unknown>;
};

const root = resolve(import.meta.dir, "../..");
const cases = JSON.parse(readFileSync(resolve(root, "spec/first-playable/navigation.json"), "utf8")) as NavCase[];
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

function apply(state: World, event: NavCase["events"][number]): World {
  if (event.type === "key") {
    return game.dispatch(state, { type: "key", key: event.key ?? "", blocked: event.blocked === true });
  }
  if (event.type === "blur") return game.dispatch(state, { type: "blur" });
  throw new Error(`Unsupported navigation event ${event.type}`);
}

function key(state: World, value: string, blocked = false): World {
  return game.dispatch(state, { type: "key", key: value, blocked });
}

function blur(state: World): World {
  return game.dispatch(state, { type: "blur" });
}

function cursor(state: World): { x: number; y: number } {
  return game.observe(state).cursor;
}

for (const example of cases) {
  test(`navigation.json ${example.id}`, () => {
    let state = game.scenario(example.setup);
    for (const event of example.events) state = apply(state, event);
    partial(observed(state, example.expect), example.expect);
  });
}

test("coverage activates N1 and N2 with every navigation case", () => {
  const n1 = cases.filter(example => example.requires.includes("N1")).map(example => example.id).sort();
  const n2 = cases.filter(example => example.requires.includes("N2")).map(example => example.id).sort();
  expect(n1.length).toBe(9);
  expect(n2.length).toBe(3);
  expect(coverage.requirements.N1?.status).toBe("active");
  expect(coverage.requirements.N2?.status).toBe("active");
  expect(coverage.requirements.N1?.unit).toBe("2.2");
  expect(coverage.requirements.N2?.unit).toBe("2.2");
  expect(coverage.requirements.N1?.exports).toContain("game.dispatch");
  expect(coverage.requirements.N2?.exports).toContain("game.dispatch");
  expect(coverage.requirements.N1?.tests).toContain("tests/core/first-playable-navigation.test.ts");
  expect(coverage.requirements.N2?.tests).toContain("tests/core/first-playable-navigation.test.ts");
  expect(coverage.requirements.N1?.cases?.slice().sort()).toEqual(n1);
  expect(coverage.requirements.N2?.cases?.slice().sort()).toEqual(n2);
  expect(coverage.requirements.V1?.status).toBe("active");
  for (const id of ["B1", "B2", "I1", "V2"]) expect(coverage.requirements[id]?.status).toBe("active");
});

test("N1 axis destinations use the 240x160 bounds and preserve the other coordinate", () => {
  const nav = createNavigation({ columns: 240, rows: 160 });
  const at = (x: number, y: number): number => nav.position({ x, y });
  expect(nav.axisMove(at(0, 0), "right", 0n)).toBe(at(0, 0));
  expect(nav.axisMove(at(0, 0), "right", 239n)).toBe(at(239, 0));
  expect(nav.axisMove(at(0, 0), "right", 240n)).toBe(at(239, 0));
  expect(nav.axisMove(at(239, 10), "left", 239n)).toBe(at(0, 10));
  expect(nav.axisMove(at(13, 10), "down", 159n)).toBe(at(13, 159));
  expect(nav.axisMove(at(13, 159), "down", 1n)).toBe(at(13, 159));
  expect(nav.axisMove(at(239, 159), "up", 10n ** 30n)).toBe(at(239, 0));
  expect(nav.axisMove(at(239, 159), "left", 10n ** 30n)).toBe(at(0, 159));
  expect(nav.axisMove(at(237, 158), "right", 2n)).toBe(at(239, 158));
  expect(nav.axisMove(at(237, 158), "down", 2n)).toBe(at(237, 159));
  expect(nav.axisMove(at(1, 1), "left", 10n ** 30n)).toBe(at(0, 1));
  expect(nav.axisMove(at(1, 1), "up", 10n ** 30n)).toBe(at(1, 0));
});

test("N1 generalized words split on whitespace, punctuation and 240-column row boundaries", () => {
  const nav = createNavigation({ columns: 240, rows: 160 });
  const field = nav.field("foo.bar!! baz");
  const smallStarts = [3, 4, 7, 10];
  const bigStarts = [10];
  const smallEnds = [2, 3, 6, 8, 12];
  const bigEnds = [8, 12];
  const backStarts = [10, 7, 4, 3, 0];
  const bigBackStarts = [10, 0];
  smallStarts.forEach((destination, index) => {
    expect(nav.wordMove(field, 0, "forward", false, BigInt(index + 1))).toBe(destination);
  });
  bigStarts.forEach((destination, index) => {
    expect(nav.wordMove(field, 0, "forward", true, BigInt(index + 1))).toBe(destination);
  });
  smallEnds.forEach((destination, index) => {
    expect(nav.wordMove(field, 0, "end", false, BigInt(index + 1))).toBe(destination);
  });
  bigEnds.forEach((destination, index) => {
    expect(nav.wordMove(field, 0, "end", true, BigInt(index + 1))).toBe(destination);
  });
  backStarts.forEach((destination, index) => {
    expect(nav.wordMove(field, 12, "backward", false, BigInt(index + 1))).toBe(destination);
  });
  bigBackStarts.forEach((destination, index) => {
    expect(nav.wordMove(field, 12, "backward", true, BigInt(index + 1))).toBe(destination);
  });
  expect(nav.wordMove(field, 0, "forward", false, 5n)).toBe(nav.size - 1);
  expect(nav.wordMove(field, 0, "forward", true, 2n)).toBe(nav.size - 1);
  expect(nav.wordMove(field, 12, "backward", false, 6n)).toBe(0);
  expect(nav.wordMove(field, 12, "backward", true, 3n)).toBe(0);

  const split = nav.field("a".repeat(240 * 2));
  expect(nav.wordMove(split, 0, "forward", false, 1n)).toBe(240);
  expect(nav.wordMove(split, 0, "end", false, 1n)).toBe(239);
  expect(nav.wordMove(split, 0, "end", false, 2n)).toBe(479);
  expect(nav.wordMove(split, 479, "backward", false, 1n)).toBe(240);
  expect(nav.wordMove(split, 479, "backward", true, 2n)).toBe(0);
  expect(nav.wordMove(split, 0, "forward", true, 2n)).toBe(nav.size - 1);
});

test("N1 line motions clamp to all 160 rows and take the first nonblank of the target row", () => {
  const nav = createNavigation({ columns: 240, rows: 160 });
  const field = nav.field(
    "  alpha".padEnd(240)
      + "    ".padEnd(240)
      + " gamma".padEnd(240)
      + "delta".padEnd(240),
  );
  const at = (x: number, y: number): number => nav.position({ x, y });
  expect(nav.lineMove(field, at(13, 0), "zero", 10n)).toBe(at(0, 0));
  expect(nav.lineMove(field, at(13, 0), "indent", 0n)).toBe(at(2, 0));
  expect(nav.lineMove(field, at(13, 2), "indent", 9999n)).toBe(at(1, 2));
  expect(nav.lineMove(field, at(13, 1), "indent", 2n)).toBe(at(0, 1));
  expect(nav.lineMove(field, at(13, 0), "end", 0n)).toBe(at(239, 0));
  expect(nav.lineMove(field, at(13, 0), "end", 1n)).toBe(at(239, 0));
  expect(nav.lineMove(field, at(13, 0), "end", 2n)).toBe(at(239, 1));
  expect(nav.lineMove(field, at(13, 0), "end", 10n ** 30n)).toBe(at(239, 159));
  expect(nav.lineMove(field, at(13, 0), "first", 0n)).toBe(at(2, 0));
  expect(nav.lineMove(field, at(13, 0), "first", 2n)).toBe(at(0, 1));
  expect(nav.lineMove(field, at(13, 0), "first", 3n)).toBe(at(1, 2));
  expect(nav.lineMove(field, at(13, 0), "first", 10n ** 30n)).toBe(at(0, 159));
  expect(nav.lineMove(field, at(13, 0), "last", 0n)).toBe(at(0, 159));
  expect(nav.lineMove(field, at(13, 0), "last", 1n)).toBe(at(2, 0));
  expect(nav.lineMove(field, at(13, 0), "last", 4n)).toBe(at(0, 3));
  expect(nav.lineMove(field, at(13, 0), "last", 10n ** 30n)).toBe(at(0, 159));
});

test("N1 generalized 40x20 destinations match hand-worked compatibility examples", () => {
  const nav = createNavigation({ columns: 40, rows: 20 });
  const field = nav.field(seedText);
  expect(nav.axisMove(0, "right", 39n)).toBe(39);
  expect(nav.axisMove(0, "down", 19n)).toBe(760);
  expect(nav.wordMove(field, 0, "forward", false, 1n)).toBe(6);
  expect(nav.wordMove(field, 0, "forward", true, 1n)).toBe(6);
  expect(nav.lineMove(field, 0, "last", 0n)).toBe(760);
  expect(nav.lineMove(field, 0, "end", 2n)).toBe(79);
  expect(nav.findMove(field, 0, "o", true, 1n)).toBe(13);
  expect(nav.findMove(field, 0, "o", true, 2n)).toBe(14);
});

test("N1 find ranks strict row-local hits, misses and 240-column predecessors", () => {
  const nav = createNavigation({ columns: 240, rows: 160 });
  const field = nav.field("abacad".padEnd(240) + "za");
  expect(nav.findMove(field, 0, "a", true, 1n)).toBe(2);
  expect(nav.findMove(field, 0, "a", true, 2n)).toBe(4);
  expect(nav.findMove(field, 0, "a", true, 3n)).toBe(0);
  expect(nav.findMove(field, 4, "a", false, 1n)).toBe(2);
  expect(nav.findMove(field, 4, "a", false, 2n)).toBe(0);
  expect(nav.findMove(field, 4, "a", false, 3n)).toBe(4);
  expect(nav.findMove(field, 0, "q", true, 1n)).toBe(0);
  expect(nav.findMove(field, 0, "a", true, 0n)).toBe(0);
  expect(nav.findMove(field, 0, "a", true, 10n ** 30n)).toBe(0);

  const spaced = nav.field("ab ac ".padEnd(240));
  expect(nav.findMove(spaced, 0, " ", true, 1n)).toBe(2);
  expect(nav.findMove(spaced, 0, " ", true, 2n)).toBe(5);
  expect(nav.findMove(spaced, 0, " ", true, 3n)).toBe(6);

  const run = nav.field("a".repeat(240 * 2));
  expect(nav.findMove(run, 0, "a", true, 239n)).toBe(239);
  expect(nav.findMove(run, 0, "a", true, 240n)).toBe(0);
  expect(nav.findMove(run, 240, "a", true, 1n)).toBe(241);
  expect(nav.findMove(run, 240, "a", true, 239n)).toBe(479);
  expect(nav.findMove(run, 240, "a", true, 240n)).toBe(240);
  expect(nav.findMove(run, 240, "a", false, 1n)).toBe(240);
  expect(nav.findMove(run, 480, "a", false, 1n)).toBe(480);
});

test("N1/N2 count saturation, zero disambiguation and pending modes come from real keys", () => {
  const setup = {
    navigationOnly: true,
    rows: { "0": "alpha beta ++", "1": "  wall xx x" },
    cursor: { x: 0, y: 0 },
  };
  let state = game.scenario(setup);
  for (let digit = 0; digit < 5; digit++) state = key(state, "9");
  expect(game.observe(state).mode).toBe("Normal");
  expect(game.observe(state).count).toBe(9999);
  expect(cursor(state)).toEqual({ x: 0, y: 0 });
  state = key(state, "l");
  expect(cursor(state)).toEqual({ x: 239, y: 0 });
  expect(game.observe(state).count).toBe(0);

  state = game.scenario(setup);
  state = key(state, "2");
  state = key(state, "f");
  expect(game.observe(state).mode).toBe("FindRight");
  expect(game.observe(state).count).toBe(2);
  state = key(state, "x");
  expect(cursor(state)).toEqual({ x: 0, y: 0 });
  expect(game.observe(state).mode).toBe("Normal");

  state = game.scenario(setup);
  state = key(state, "2");
  state = key(state, "g");
  expect(game.observe(state).mode).toBe("Go");
  expect(game.observe(state).count).toBe(2);
  state = key(state, "g");
  expect(cursor(state)).toEqual({ x: 2, y: 1 });
  expect(game.observe(state).mode).toBe("Normal");

  state = game.scenario({ ...setup, cursor: { x: 10, y: 0 } });
  state = key(state, "2");
  state = key(state, "F");
  expect(game.observe(state).mode).toBe("FindLeft");
  expect(game.observe(state).count).toBe(2);
  state = key(state, "a");
  expect(cursor(state)).toEqual({ x: 4, y: 0 });
  expect(game.observe(state).mode).toBe("Normal");

  state = game.scenario(setup);
  state = key(state, "2");
  state = key(state, "g");
  state = key(state, "x");
  expect(cursor(state)).toEqual({ x: 0, y: 0 });
  expect(game.observe(state).mode).toBe("Normal");
  expect(game.observe(state).count).toBe(0);

  state = game.scenario({ ...setup, cursor: { x: 5, y: 0 } });
  state = key(state, "0");
  expect(cursor(state)).toEqual({ x: 0, y: 0 });
  state = game.scenario({ ...setup, cursor: { x: 5, y: 0 } });
  state = key(state, "2");
  state = key(state, "0");
  expect(game.observe(state).count).toBe(20);
  expect(cursor(state)).toEqual({ x: 5, y: 0 });
  state = key(state, "h");
  expect(cursor(state)).toEqual({ x: 0, y: 0 });
});

test("N1 literal find targets consume i, p and Space without invoking later game bindings", () => {
  const setup = { navigationOnly: true, rows: { "0": "x i p" }, cursor: { x: 0, y: 0 } };
  let state = game.scenario(setup);
  state = key(state, "f");
  state = key(state, "i");
  expect(cursor(state)).toEqual({ x: 2, y: 0 });
  expect(game.observe(state).mode).toBe("Normal");

  state = game.scenario(setup);
  state = key(state, "f");
  state = key(state, "p");
  expect(cursor(state)).toEqual({ x: 4, y: 0 });
  expect(game.observe(state).manualPaused).toBe(false);

  state = game.scenario(setup);
  state = key(state, "f");
  state = key(state, " ");
  expect(cursor(state)).toEqual({ x: 1, y: 0 });
  expect(game.observe(state).mode).toBe("Normal");
});

test("N2 pending Escape preserves a staged source; Normal Escape and blur cancel it", () => {
  const built = game.scenario({
    buildings: [
      { site: "a01", kind: "well" },
      { site: "a02", kind: "ring" },
    ],
    pendingSource: "a01",
  });
  let state = key(built, "2");
  state = key(state, "f");
  expect(game.observe(state).mode).toBe("FindRight");
  expect(game.observe(state).pendingSource).toBe("a01");
  expect(cursor(state)).toEqual({ x: 13, y: 10 });
  state = key(state, "Escape");
  expect(game.observe(state).mode).toBe("Normal");
  expect(game.observe(state).count).toBe(0);
  expect(game.observe(state).pendingSource).toBe("a01");
  expect(cursor(state)).toEqual({ x: 13, y: 10 });
  state = key(state, "Escape");
  expect(game.observe(state).pendingSource).toBeNull();

  state = key(built, "2");
  state = key(state, "g");
  expect(game.observe(state).mode).toBe("Go");
  state = blur(state);
  expect(game.observe(state).mode).toBe("Normal");
  expect(game.observe(state).count).toBe(0);
  expect(game.observe(state).pendingSource).toBeNull();
  expect(cursor(state)).toEqual({ x: 13, y: 10 });
});

test("N2 blocked modifiers, Other and nonprintable input leave pending navigation unchanged", () => {
  let state = game.scenario({
    buildings: [{ site: "a01", kind: "well" }],
    pendingSource: "a01",
  });
  state = key(state, "2");
  state = key(state, "f");
  const before = game.observe(state);
  for (const blocked of ["j", "f", "9", " ", "é"]) {
    const unchanged = key(state, blocked, true);
    expect(unchanged).toBe(state);
    expect(game.observe(unchanged)).toEqual(before);
  }
  const blockedEscape = game.dispatch(state, { type: "key", key: "Escape", blocked: true });
  expect(blockedEscape).toBe(state);
  for (const value of ["Enter", "Backspace", "\n", "\t", "\u0000", "\u007f", "é", "😀"]) {
    const unchanged = key(state, value);
    expect(game.observe(unchanged)).toEqual(before);
  }
  state = key(state, "x");
  expect(game.observe(state).mode).toBe("Normal");
  expect(game.observe(state).count).toBe(0);
  expect(game.observe(state).pendingSource).toBe("a01");
});

test("N2 navigation preserves the composed field, buildings, links, mana and imps", () => {
  const built = game.scenario({
    cursor: { x: 20, y: 12 },
    buildings: [
      { site: "a01", kind: "well", mana: 140, link: "a02" },
      { site: "a02", kind: "ring", mana: 70, produced: 2 },
    ],
    pendingSource: "a01",
  });
  const before = game.observe(built);
  const text = game.field(built).text;
  let state = built;
  for (const value of ["l", "j", "w", "$", "G", "f", "i", "F", "p", "Escape"]) state = key(state, value);
  expect(game.field(state).text).toBe(text);
  const after = game.observe(state);
  expect(after.sites).toEqual(before.sites);
  expect(after.siteCount).toBe(before.siteCount);
  expect(after.buildingCount).toBe(before.buildingCount);
  expect(after.impCount).toBe(before.impCount);
  expect(after.imps).toEqual(before.imps);
  expect(game.observe(built)).toEqual(before);
  expect(game.field(built).text).toBe(text);
});

test("N1 motions read the current composed site, building and imp glyphs", () => {
  let state = game.scenario({
    cursor: { x: 8, y: 12 },
    buildings: [{ site: "a01", kind: "well" }],
  });
  expect(game.glyphAt(state, 11, 12)).toBe("W");
  state = key(state, "f");
  state = key(state, "W");
  expect(cursor(state)).toEqual({ x: 11, y: 12 });

  state = game.scenario({
    cursor: { x: 8, y: 14 },
    buildings: [{ site: "a01", kind: "ring", produced: 1 }],
  });
  expect(game.glyphAt(state, 9, 14)).toBe("i");
  state = key(state, "f");
  state = key(state, "i");
  expect(cursor(state)).toEqual({ x: 9, y: 14 });

  state = game.scenario({ cursor: { x: 0, y: 60 } });
  expect(game.glyphAt(state, 8, 60)).toBe("~");
  state = key(state, "f");
  state = key(state, "~");
  expect(cursor(state)).toEqual({ x: 8, y: 60 });
});

test("N1 malformed row text is sanitized by the real constructor before navigation", () => {
  let state = game.scenario({
    navigationOnly: true,
    rows: { "0": " A😀\tB\nC ", "1": "x".repeat(245) },
    cursor: { x: 0, y: 0 },
  });
  expect(game.glyphAt(state, 1, 0)).toBe("A");
  expect(game.glyphAt(state, 4, 0)).toBe("B");
  expect(game.glyphAt(state, 6, 0)).toBe("C");
  expect(game.glyphAt(state, 239, 1)).toBe("x");
  state = key(state, "w");
  expect(cursor(state)).toEqual({ x: 1, y: 0 });
  state = key(state, "w");
  expect(cursor(state)).toEqual({ x: 4, y: 0 });
  state = key(state, "w");
  expect(cursor(state)).toEqual({ x: 6, y: 0 });
  state = key(state, "j");
  expect(cursor(state)).toEqual({ x: 6, y: 1 });
});

test("N2 high-count word and line motions terminate at fixed points and stay there", () => {
  const setup = {
    navigationOnly: true,
    rows: { "0": "alpha beta ++", "1": "  wall xx x" },
    cursor: { x: 0, y: 0 },
  };
  let state = game.scenario(setup);
  for (let digit = 0; digit < 4; digit++) state = key(state, "9");
  state = key(state, "w");
  expect(cursor(state)).toEqual({ x: 239, y: 159 });
  const fixed = cursor(state);
  state = key(state, "w");
  expect(cursor(state)).toEqual(fixed);
  state = key(state, "e");
  expect(cursor(state)).toEqual(fixed);

  state = game.scenario(setup);
  state = key(state, "9");
  state = key(state, "9");
  state = key(state, "9");
  state = key(state, "9");
  state = key(state, "G");
  expect(cursor(state)).toEqual({ x: 0, y: 159 });
  const lastRow = cursor(state);
  state = key(state, "G");
  expect(cursor(state)).toEqual(lastRow);
});
