import { expect, test } from "bun:test";
import {
  DEFAULT_RALLY,
  GATE_CENTER,
  game,
  type World,
} from "../../src/core/game";

function key(state: World, value: string, blocked = false): World {
  return game.dispatch(state, { type: "key", key: value, blocked });
}

function type(state: World, value: string): World {
  let next = state;
  for (const character of Array.from(value)) next = key(next, character);
  return next;
}

function openFinder(state: World): World {
  return key(key(state, " "), "f");
}

function scenario() {
  return game.scenario({
    rules: "survival",
    cursor: { x: 100, y: 100 },
    buildings: [
      { id: "b001", kind: "well", center: { x: 13, y: 10 }, name: "Foo" },
      { id: "b002", kind: "ring", center: { x: 37, y: 10 }, name: "Foo" },
      { id: "b003", kind: "well", center: { x: 61, y: 10 }, name: "Bar" },
    ],
  });
}

function finderNames(state: World): string[] {
  return game.observe(state).finder?.entries.map(entry => entry.name) ?? [];
}

function finderIds(state: World): string[] {
  return game.observe(state).finder?.entries.map(entry => entry.id) ?? [];
}

test("Space f opens a finder on any cell with sorted buildings and special destinations", () => {
  const state = openFinder(scenario());
  const observation = game.observe(state);
  expect(observation.mode).toBe("Finder");
  expect(observation.count).toBe(0);
  expect(observation.finder?.query).toBe("");
  expect(observation.finder?.selection).toBe(0);
  expect(finderNames(state)).toEqual(["Bar", "Enemy gate", "Foo", "Foo", "Rally"]);
  expect(finderIds(state)).toEqual(["b003", "gate", "b001", "b002", "rally"]);
  expect(observation.cursor).toEqual({ x: 100, y: 100 });

  const onBuilding = key(game.scenario({
    rules: "survival",
    cursor: { x: 13, y: 10 },
    buildings: [{ id: "b001", kind: "well", center: { x: 13, y: 10 } }],
  }), " ");
  const opened = key(onBuilding, "f");
  expect(game.observe(opened).mode).toBe("Finder");
  expect(finderIds(opened)).toEqual(["gate", "rally", "b001"]);
});

test("finder matches ASCII-case-insensitive subsequences of name, type and ID", () => {
  let state = openFinder(scenario());
  state = type(state, "FOO");
  expect(finderIds(state)).toEqual(["b001", "b002"]);

  state = type(state, "zzz");
  expect(game.observe(state).finder?.entries).toEqual([]);

  state = key(state, "Backspace");
  state = key(state, "Backspace");
  state = key(state, "Backspace");
  expect(finderIds(state)).toEqual(["b001", "b002"]);
  state = key(state, "Backspace");
  state = key(state, "Backspace");
  state = key(state, "Backspace");
  expect(finderIds(state)).toEqual(["b003", "gate", "b001", "b002", "rally"]);

  state = type(openFinder(scenario()), "fow");
  expect(finderIds(state)).toEqual(["b001"]);
  state = type(openFinder(scenario()), "summoning");
  expect(finderIds(state)).toEqual(["b002"]);
  state = type(openFinder(scenario()), "b003");
  expect(finderIds(state)).toEqual(["b003"]);
});

test("finder duplicates keep stable IDs and are ordered by name then ID", () => {
  let state = openFinder(scenario());
  state = type(state, "fo");
  const observation = game.observe(state);
  expect(observation.finder?.entries.map(entry => `${entry.name}|${entry.type}|${entry.id}`)).toEqual([
    "Foo|mana well|b001",
    "Foo|summoning ring|b002",
  ]);
  expect(observation.finder?.entries.map(entry => entry.destination)).toEqual(["building", "building"]);
});

test("finder selection clamps, query edits reset it and highlighting never moves the cursor", () => {
  let state = openFinder(scenario());
  state = type(state, "fo");
  let observation = game.observe(state);
  expect(observation.finder?.selection).toBe(0);
  state = key(state, "ArrowDown");
  expect(game.observe(state).finder?.selection).toBe(1);
  state = key(state, "ArrowDown");
  expect(game.observe(state).finder?.selection).toBe(1);
  state = key(state, "ArrowUp");
  expect(game.observe(state).finder?.selection).toBe(0);
  state = key(state, "ArrowUp");
  expect(game.observe(state).finder?.selection).toBe(0);

  state = key(state, "ArrowDown");
  state = key(state, "o");
  observation = game.observe(state);
  expect(observation.finder?.query).toBe("foo");
  expect(observation.finder?.selection).toBe(0);
  expect(observation.cursor).toEqual({ x: 100, y: 100 });
});

test("finder Enter jumps to a building centre, the rally cell and the gate, then returns Normal", () => {
  let state = openFinder(scenario());
  state = type(state, "bar");
  state = key(state, "Enter");
  let observation = game.observe(state);
  expect({ mode: observation.mode, cursor: observation.cursor, finder: observation.finder })
    .toEqual({ mode: "Normal", cursor: { x: 61, y: 10 }, finder: null });

  state = openFinder(state);
  state = type(state, "rally");
  state = key(state, "Enter");
  observation = game.observe(state);
  expect({ mode: observation.mode, cursor: observation.cursor, rally: observation.rally })
    .toEqual({ mode: "Normal", cursor: DEFAULT_RALLY, rally: DEFAULT_RALLY });

  state = openFinder(state);
  state = type(state, "spawn");
  state = key(state, "Enter");
  observation = game.observe(state);
  expect({ mode: observation.mode, cursor: observation.cursor })
    .toEqual({ mode: "Normal", cursor: GATE_CENTER });
});

test("finder no-result Enter stays open with a notice and Escape closes without moving", () => {
  let state = openFinder(scenario());
  state = type(state, "zzz");
  const before = game.observe(state).cursor;
  state = key(state, "Enter");
  let observation = game.observe(state);
  expect(observation.mode).toBe("Finder");
  expect(observation.notice).toBe("No finder result");
  expect(observation.cursor).toEqual(before);
  expect(observation.finder?.entries).toEqual([]);
  state = key(state, "ArrowDown");
  expect(game.observe(state).finder?.selection).toBe(0);

  state = key(state, "Escape");
  observation = game.observe(state);
  expect({ mode: observation.mode, cursor: observation.cursor, finder: observation.finder })
    .toEqual({ mode: "Normal", cursor: before, finder: null });
});

test("a pending source survives a finder jump and is used by typed connect", () => {
  const source = game.scenario({
    rules: "survival",
    cursor: { x: 13, y: 10 },
    pendingSource: "b001",
    buildings: [
      { id: "b001", kind: "well", center: { x: 13, y: 10 }, name: "Foo" },
      { id: "b002", kind: "ring", center: { x: 37, y: 10 }, name: "Guard" },
    ],
  });
  let state = openFinder(source);
  state = type(state, "summoning");
  state = key(state, "Enter");
  let observation = game.observe(state);
  expect({ mode: observation.mode, source: observation.pendingSource, cursor: observation.cursor })
    .toEqual({ mode: "Normal", source: "b001", cursor: { x: 37, y: 10 } });

  state = key(state, "i");
  state = type(state, "connect");
  state = key(state, "Enter");
  observation = game.observe(state);
  expect({ source: observation.pendingSource, links: observation.links.map(link => `${link.source}>${link.target}`) })
    .toEqual({ source: null, links: ["b001>b002"] });

  const escaped = openFinder(state);
  expect(game.observe(escaped).pendingSource).toBeNull();
});

test("finder Escape preserves a staged source while blur clears it", () => {
  const source = game.scenario({
    rules: "survival",
    cursor: { x: 13, y: 10 },
    pendingSource: "b001",
    buildings: [{ id: "b001", kind: "well", center: { x: 13, y: 10 } }],
  });
  let state = openFinder(source);
  expect(game.observe(key(state, "Escape")).pendingSource).toBe("b001");

  state = game.dispatch(state, { type: "blur" });
  const observation = game.observe(state);
  expect({ mode: observation.mode, source: observation.pendingSource, finder: observation.finder })
    .toEqual({ mode: "Normal", source: null, finder: null });
});

test("finder queries are bounded printable ASCII, discard counts and ignore navigation bindings", () => {
  let state = key(game.initial({ rules: "survival" }), "7");
  expect(game.observe(state).count).toBe(7);
  state = openFinder(state);
  expect(game.observe(state).count).toBe(0);
  for (let index = 0; index < 40; index++) state = key(state, "x");
  expect(game.observe(state).finder?.query).toBe("x".repeat(32));
  state = key(state, "Backspace");
  expect(game.observe(state).finder?.query).toBe("x".repeat(31));
  const before = game.observe(state);
  for (const value of ["\n", "é", "😀", "mana well"]) {
    expect(key(state, value)).toBe(state);
  }
  for (const value of ["ArrowUp", "ArrowDown", "Enter", "Backspace", "x"]) {
    expect(key(state, value, true)).toBe(state);
  }
  expect(game.observe(state).finder?.query).toBe(before.finder?.query);
});

test("pending f and F consume Space and i as literal navigation targets", () => {
  const state = game.scenario({
    rules: "survival",
    navigationOnly: true,
    rows: { "2": "a i c" },
    cursor: { x: 0, y: 2 },
  });
  const foundSpace = type(key(state, "f"), " ");
  expect({ mode: game.observe(foundSpace).mode, cursor: game.observe(foundSpace).cursor })
    .toEqual({ mode: "Normal", cursor: { x: 1, y: 2 } });
  const foundI = type(key(foundSpace, "f"), "i");
  expect({ mode: game.observe(foundI).mode, cursor: game.observe(foundI).cursor })
    .toEqual({ mode: "Normal", cursor: { x: 2, y: 2 } });
});
