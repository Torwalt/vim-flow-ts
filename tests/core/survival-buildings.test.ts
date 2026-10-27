import { expect, test } from "bun:test";
import {
  DEFAULT_RALLY,
  GATE_CENTER,
  MAX_BUILDINGS,
  game,
  type Cursor,
  type World,
} from "../../src/core/game";

function rejected(spec: unknown): void {
  expect(() => game.scenario(spec)).toThrow();
}

function ids(state: World): string[] {
  return game.observe(state).buildings.map(building => building.id);
}

function building(state: World, id: string) {
  return game.observe(state).buildings.find(candidate => candidate.id === id);
}

function centres(): Cursor[] {
  const result: Cursor[] = [];
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 8; column++) {
      result.push({ x: 13 + 12 * column, y: 6 + 8 * row });
    }
  }
  return result;
}

test("survival gate renders fixed logical art inside its reserved patch", () => {
  const state = game.initial({ rules: "survival" });
  expect(game.glyphAt(state, GATE_CENTER.x - 1, GATE_CENTER.y - 1)).toBe("/");
  expect(game.glyphAt(state, GATE_CENTER.x, GATE_CENTER.y - 1)).toBe("O");
  expect(game.glyphAt(state, GATE_CENTER.x + 1, GATE_CENTER.y - 1)).toBe("\\");
  expect(game.glyphAt(state, GATE_CENTER.x - 1, GATE_CENTER.y)).toBe("|");
  expect(game.glyphAt(state, GATE_CENTER.x, GATE_CENTER.y)).toBe("O");
  expect(game.glyphAt(state, GATE_CENTER.x + 1, GATE_CENTER.y)).toBe("|");
  expect(game.glyphAt(state, GATE_CENTER.x - 1, GATE_CENTER.y + 1)).toBe("\\");
  expect(game.glyphAt(state, GATE_CENTER.x, GATE_CENTER.y + 1)).toBe("O");
  expect(game.glyphAt(state, GATE_CENTER.x + 1, GATE_CENTER.y + 1)).toBe("/");
  expect(game.glyphAt(state, 198, 134)).toBe(" ");
  expect(game.glyphAt(state, 202, 138)).toBe(" ");
  expect(game.glyphAt(state, 8, 60)).toBe("~");
  expect(game.glyphAt(state, 80, 100)).toBe("^");
});

test("survival placement accepts the interior edges and rejects anything outside them", () => {
  const start = game.initial({ rules: "survival" });
  const first = game.place(start, { x: 6, y: 3 }, "well");
  expect(first).not.toBe(start);
  expect(game.observe(first).buildings[0]).toEqual({
    id: "b001", kind: "well", center: { x: 6, y: 3 }, mana: 0, link: null, name: "Well b001",
  });
  expect(game.glyphAt(first, 1, 1)).toBe("b");
  expect(game.glyphAt(first, 4, 5)).toBe("W");

  const second = game.place(first, { x: 233, y: 154 }, "ring");
  expect(second).not.toBe(first);
  expect(ids(second)).toEqual(["b001", "b002"]);
  expect(building(second, "b002")).toEqual({
    id: "b002", kind: "ring", center: { x: 233, y: 154 }, mana: 0, produced: 0, name: "Ring b002",
  });
  expect(game.glyphAt(second, 234, 156)).toBe("G");

  for (const center of [
    { x: 5, y: 3 }, { x: 6, y: 2 }, { x: 234, y: 3 }, { x: 233, y: 155 },
    { x: 0, y: 0 }, { x: 239, y: 159 }, { x: 13.5, y: 10 },
  ]) {
    expect(game.place(start, center, "well")).toBe(start);
  }
});

test("placement clears scenery only inside its footprint", () => {
  const start = game.initial({ rules: "survival" });
  const state = game.place(start, { x: 20, y: 61 }, "well");
  expect(state).not.toBe(start);
  expect(game.glyphAt(start, 20, 60)).toBe("~");
  expect(game.glyphAt(state, 20, 60)).not.toBe("~");
  expect(game.glyphAt(state, 14, 61)).toBe("~");
  expect(game.glyphAt(state, 31, 61)).toBe("~");
  expect(game.glyphAt(state, 15, 59)).toBe("b");
  expect(game.observe(state).buildings[0]?.center).toEqual({ x: 20, y: 61 });
});

test("overlapping placement is atomic and does not consume an ID", () => {
  const start = game.initial({ rules: "survival" });
  const first = game.place(start, { x: 13, y: 10 }, "well");
  expect(ids(first)).toEqual(["b001"]);

  expect(game.place(first, { x: 13, y: 10 }, "ring")).toBe(first);
  expect(game.place(first, { x: 14, y: 10 }, "ring")).toBe(first);
  expect(game.place(first, { x: 13, y: 11 }, "ring")).toBe(first);

  const second = game.place(first, { x: 24, y: 10 }, "ring");
  expect(ids(second)).toEqual(["b001", "b002"]);
  expect(building(second, "b002")?.kind).toBe("ring");
});

test("the enemy gate reserves its patch from building placement", () => {
  const start = game.initial({ rules: "survival" });
  for (const center of [
    GATE_CENTER,
    { x: 193, y: 130 },
    { x: 207, y: 140 },
    { x: 198, y: 136 },
    { x: 200, y: 138 },
  ]) {
    expect(game.place(start, center, "well")).toBe(start);
  }

  let state = game.place(start, { x: 192, y: 130 }, "well");
  expect(state).not.toBe(start);
  state = game.place(state, { x: 208, y: 140 }, "ring");
  expect(ids(state)).toEqual(["b001", "b002"]);
  expect(game.glyphAt(state, GATE_CENTER.x, GATE_CENTER.y)).toBe("O");
  expect(game.glyphAt(state, GATE_CENTER.x - 1, GATE_CENTER.y - 1)).toBe("/");
});

test("successful construction allocates b001 through b032 and stops at the cap", () => {
  const positions = centres();
  expect(positions).toHaveLength(MAX_BUILDINGS);
  let state = game.initial({ rules: "survival" });
  for (const [index, center] of positions.entries()) {
    const next = game.place(state, center, index % 2 === 0 ? "well" : "ring");
    expect(next).not.toBe(state);
    state = next;
  }
  expect(game.observe(state).buildingCount).toBe(MAX_BUILDINGS);
  expect(ids(state)).toEqual(positions.map((_, index) => `b${String(index + 1).padStart(3, "0")}`));
  expect(building(state, "b032")?.center).toEqual(positions[31]!);
  expect(game.place(state, { x: 150, y: 50 }, "well")).toBe(state);
});

test("survival scenario links arbitrary dynamic endpoints and round-trips", () => {
  const state = game.scenario({
    rules: "survival",
    cursor: { x: 8, y: 10 },
    buildings: [
      { id: "b001", kind: "well", center: { x: 13, y: 10 }, mana: 400 },
      { id: "b002", kind: "ring", center: { x: 37, y: 10 }, mana: 300 },
    ],
  });
  const before = game.observe(state);
  expect(before.buildingCount).toBe(2);
  expect(before.siteAtCursor).toBe("b001");
  expect(before.rally).toEqual(DEFAULT_RALLY);
  expect(before.buildings).toEqual([
    { id: "b001", kind: "well", center: { x: 13, y: 10 }, mana: 400, link: null, name: "Well b001" },
    { id: "b002", kind: "ring", center: { x: 37, y: 10 }, mana: 300, produced: 0, name: "Ring b002" },
  ]);
  expect(game.siteAt(state, 8, 10)).toBe("b001");
  expect(game.siteAt(state, 18, 12)).toBe("b001");
  expect(game.siteAt(state, 19, 10)).toBeNull();

  const linked = game.link(state, "b001", "b002");
  expect(linked).not.toBe(state);
  const observation = game.observe(linked);
  expect(building(linked, "b001")).toEqual({
    id: "b001", kind: "well", center: { x: 13, y: 10 }, mana: 400, link: "b002", name: "Well b001",
  });
  expect(observation.links).toEqual([
    { source: "b001", target: "b002", from: { x: 13, y: 10 }, to: { x: 37, y: 10 } },
  ]);

  const snapshot = game.snapshot(linked);
  expect(snapshot.rules).toBe("survival");
  expect(snapshot.rally).toEqual(DEFAULT_RALLY);
  expect(snapshot.buildings).toEqual([
    { id: "b001", kind: "well", center: { x: 13, y: 10 }, mana: 400, link: "b002", name: "Well b001" },
    { id: "b002", kind: "ring", center: { x: 37, y: 10 }, mana: 300, produced: 0, name: "Ring b002" },
  ]);
  const roundtrip = game.scenario(snapshot);
  expect(game.observe(roundtrip)).toEqual(observation);
  expect(game.field(roundtrip)).toEqual(game.field(linked));
  expect(game.snapshot(roundtrip)).toEqual(snapshot);
});

test("dynamic links reject non-wells, fixed IDs and missing endpoints", () => {
  const state = game.scenario({
    rules: "survival",
    buildings: [
      { id: "b001", kind: "well", center: { x: 13, y: 10 } },
      { id: "b002", kind: "ring", center: { x: 37, y: 10 } },
    ],
  });
  expect(game.link(state, "b001", "b001")).toBe(state);
  expect(game.link(state, "b002", "b001")).toBe(state);
  expect(game.link(state, "b001", "b003")).toBe(state);
  expect(game.link(state, "a01", "b002")).toBe(state);
  const linked = game.link(state, "b001", "b002");
  expect(linked).not.toBe(state);
  expect(game.link(linked, "b001", "b002")).toBe(linked);
});

test("survival rally defaults to the initial cursor and accepts validated cells", () => {
  const start = game.initial({ rules: "survival" });
  expect(game.observe(start).rally).toEqual(DEFAULT_RALLY);
  expect(game.snapshot(start).rally).toEqual(DEFAULT_RALLY);

  const custom = game.scenario({ rules: "survival", rally: { x: 50, y: 50 } });
  expect(game.observe(custom).rally).toEqual({ x: 50, y: 50 });
  expect(game.snapshot(custom).rally).toEqual({ x: 50, y: 50 });
  expect(game.observe(game.scenario(game.snapshot(custom))).rally).toEqual({ x: 50, y: 50 });

  rejected({ rules: "survival", rally: { x: 0, y: 10 } });
  rejected({ rules: "survival", rally: { x: 239, y: 10 } });
  rejected({ rules: "survival", rally: GATE_CENTER });
  rejected({ rules: "first-playable", rally: DEFAULT_RALLY });
});

test("survival scenarios reject fixed sites, invalid positions, overlaps and bad links", () => {
  rejected({ rules: "survival", buildings: [{ site: "a01", kind: "well" }] });
  rejected({ rules: "survival", buildings: [{ id: "b001", kind: "well", center: { x: 5, y: 10 } }] });
  rejected({ rules: "survival", buildings: [{ id: "b001", kind: "well", center: GATE_CENTER }] });
  rejected({
    rules: "survival",
    buildings: [
      { id: "b001", kind: "well", center: { x: 13, y: 10 } },
      { id: "b002", kind: "well", center: { x: 14, y: 10 } },
    ],
  });
  rejected({
    rules: "survival",
    buildings: [
      { id: "b001", kind: "well", center: { x: 13, y: 10 } },
      { id: "b001", kind: "ring", center: { x: 37, y: 10 } },
    ],
  });
  for (const id of ["b1", "b000", "b033", "a01"]) {
    rejected({ rules: "survival", buildings: [{ id, kind: "well", center: { x: 13, y: 10 } }] });
  }
  rejected({
    rules: "survival",
    buildings: [{ id: "b001", kind: "well", center: { x: 13, y: 10 }, link: "b002" }],
  });
  rejected({
    rules: "survival",
    buildings: [
      { id: "b001", kind: "well", center: { x: 13, y: 10 }, link: "b002" },
      { id: "b002", kind: "well", center: { x: 37, y: 10 } },
    ],
  });
  rejected({
    rules: "survival",
    buildings: [{ id: "b001", kind: "ring", center: { x: 13, y: 10 }, link: "b002" }],
  });
  rejected({
    rules: "survival",
    buildings: [{ id: "b001", kind: "well", center: { x: 13, y: 10 }, produced: 1 }],
  });
  rejected({
    rules: "survival",
    pendingSource: "b001",
    buildings: [{ id: "b001", kind: "ring", center: { x: 13, y: 10 } }],
  });
  rejected({ rules: "survival", pendingSource: "b001", buildings: [] });
  rejected({ rules: "survival", buildings: [{ id: "b001", kind: "well", center: GATE_CENTER }] });
  rejected({
    buildings: [{ id: "b001", kind: "well", center: { x: 13, y: 10 } }],
  });

  const tooMany = centres().concat([{ x: 150, y: 50 }]);
  rejected({
    rules: "survival",
    buildings: tooMany.map((center, index) => ({
      id: `b${String(index + 1).padStart(3, "0")}`,
      kind: "well",
      center,
    })),
  });
});

test("dynamic placement and scenario validation do not touch the legacy profile", () => {
  const legacy = game.initial();
  expect(game.place(legacy, { x: 13, y: 10 }, "well")).toBe(legacy);
  expect(game.observe(legacy).buildings).toEqual([]);
  expect(game.observe(legacy).rally).toBeNull();
  expect(game.snapshot(legacy)).not.toHaveProperty("rally");
  expect(game.link(legacy, "b001", "b002")).toBe(legacy);
  expect(game.siteAt(legacy, 13, 10)).toBe("a01");
  expect(game.siteAt(legacy, 8, 8)).toBe("a01");
});
