import { expect, test } from "bun:test";
import {
  ALLY_HP,
  ATTACK_COOLDOWN,
  CURSOR_MAX_HP,
  ENEMY_HP,
  IMP_CAP,
  SUMMON_COST,
  TICK_MS,
  game,
  type Scenario,
  type World,
} from "../../src/core/game";

function rejected(spec: unknown): void {
  expect(() => game.scenario(spec)).toThrow();
}

function key(state: World, value: string): World {
  return game.dispatch(state, { type: "key", key: value });
}

function ring(mana = 0, produced = 0, center = { x: 37, y: 10 }): Scenario["buildings"] {
  return [{ id: "b001", kind: "ring", center, mana, produced }];
}

function troop(state: World, id: string) {
  return game.observe(state).troops.find(candidate => candidate.id === id);
}

function building(state: World, id: string) {
  return game.observe(state).buildings.find(candidate => candidate.id === id);
}

test("survival troops keep identity, damage, origin ring and snapshot state", () => {
  const spec: Scenario = {
    rules: "survival",
    cursor: { x: 100, y: 100 },
    buildings: [{ id: "b001", kind: "ring", center: { x: 37, y: 10 }, mana: 0, produced: 4, name: "Guard" }],
    troops: [
      { faction: "ally", ring: "b001", serial: 1, x: 1, y: 1, hp: 2, nextAttackTick: 7 },
      { faction: "ally", ring: "b001", serial: 3, x: 238, y: 158 },
      { faction: "enemy", id: "e1", x: 120, y: 120, hp: 1, nextAttackTick: 3 },
    ],
    cursorHp: 6,
    kills: 2,
  };
  const state = game.scenario(spec);
  const observation = game.observe(state);
  expect(observation.cursorHp).toBe(6);
  expect(observation.kills).toBe(2);
  expect(observation.impCount).toBe(0);
  expect(observation.imps).toEqual([]);
  expect(game.imps(state)).toEqual([]);
  expect(observation.troops).toEqual([
    { id: "b001#1", faction: "ally", ring: "b001", serial: 1, x: 1, y: 1, hp: 2, nextAttackTick: 7 },
    { id: "b001#3", faction: "ally", ring: "b001", serial: 3, x: 238, y: 158, hp: ALLY_HP, nextAttackTick: 0 },
    { id: "e1", faction: "enemy", ring: null, serial: null, x: 120, y: 120, hp: 1, nextAttackTick: 3 },
  ]);
  expect(building(state, "b001")).toEqual({
    id: "b001", kind: "ring", center: { x: 37, y: 10 }, mana: 0, produced: 4, living: 2, name: "Guard",
  });
  expect(game.glyphAt(state, 1, 1)).toBe("i");
  expect(game.glyphAt(state, 238, 158)).toBe("i");
  expect(game.glyphAt(state, 120, 120)).toBe("i");

  const snapshot = game.snapshot(state);
  expect(snapshot.cursorHp).toBe(6);
  expect(snapshot.kills).toBe(2);
  expect(snapshot.troops).toEqual([
    { faction: "ally", ring: "b001", serial: 1, x: 1, y: 1, hp: 2, nextAttackTick: 7 },
    { faction: "ally", ring: "b001", serial: 3, x: 238, y: 158, hp: ALLY_HP, nextAttackTick: 0 },
    { faction: "enemy", id: "e1", x: 120, y: 120, hp: 1, nextAttackTick: 3 },
  ]);
  const roundtrip = game.scenario(snapshot);
  expect(game.observe(roundtrip)).toEqual(observation);
  expect(game.field(roundtrip)).toEqual(game.field(state));
  expect(game.snapshot(roundtrip)).toEqual(snapshot);
});

test("survival troop scenarios allow ally/cursor overlap and reject invalid setup", () => {
  const overlapping: Scenario = {
    rules: "survival",
    cursor: { x: 50, y: 50 },
    buildings: ring(0, 1),
    troops: [{ faction: "ally", ring: "b001", serial: 1, x: 50, y: 50 }],
  };
  expect(game.observe(game.scenario(overlapping)).troops).toHaveLength(1);

  rejected({ rules: "first-playable", troops: [] });
  rejected({ rules: "survival", navigationOnly: true, troops: [] });
  rejected({ rules: "survival", troops: [{}] });
  rejected({ rules: "survival", troops: [{ faction: "neutral", x: 50, y: 50 }] });
  rejected({ rules: "survival", troops: [{ faction: "ally", ring: "b001", serial: 1, x: 50, y: 50 }] });
  rejected({ rules: "survival", buildings: [{ id: "b001", kind: "well", center: { x: 37, y: 10 } }], troops: [{ faction: "ally", ring: "b001", serial: 1, x: 50, y: 50 }] });
  rejected({ rules: "survival", buildings: ring(), troops: [{ faction: "enemy", id: "e1", ring: "b001", x: 50, y: 50 }] });
  for (const id of ["", "has space", "é", "x".repeat(33)]) {
    rejected({ rules: "survival", troops: [{ faction: "enemy", id, x: 50, y: 50 }] });
  }
  rejected({ rules: "survival", buildings: ring(), troops: [{ faction: "enemy", id: "b001#1", x: 50, y: 50 }] });
  rejected({
    rules: "survival",
    buildings: ring(),
    troops: [
      { faction: "ally", ring: "b001", serial: 1, x: 50, y: 50 },
      { faction: "ally", ring: "b001", serial: 1, x: 52, y: 50 },
    ],
  });
  rejected({
    rules: "survival",
    troops: [
      { faction: "enemy", id: "e1", x: 50, y: 50 },
      { faction: "enemy", id: "e1", x: 52, y: 50 },
    ],
  });
  rejected({
    rules: "survival",
    buildings: ring(),
    troops: [
      { faction: "ally", ring: "b001", serial: 1, x: 50, y: 50 },
      { faction: "enemy", id: "e1", x: 50, y: 50 },
    ],
  });
  rejected({ rules: "survival", cursor: { x: 50, y: 50 }, troops: [{ faction: "enemy", id: "e1", x: 50, y: 50 }] });
  for (const [x, y] of [[0, 50], [50, 0], [239, 50], [50, 159]]) {
    rejected({ rules: "survival", troops: [{ faction: "enemy", id: "e1", x, y }] });
  }
  rejected({ rules: "survival", buildings: ring(), troops: [{ faction: "ally", ring: "b001", serial: 1, x: 50, y: 50, hp: ALLY_HP + 1 }] });
  for (const hp of [0, ENEMY_HP + 1]) {
    rejected({ rules: "survival", troops: [{ faction: "enemy", id: "e1", x: 50, y: 50, hp }] });
  }
  for (const nextAttackTick of [-1, 1.5]) {
    rejected({ rules: "survival", troops: [{ faction: "enemy", id: "e1", x: 50, y: 50, nextAttackTick }] });
  }
  rejected({ rules: "survival", buildings: ring(0, 1), troops: [{ faction: "ally", ring: "b001", serial: 0, x: 50, y: 50 }] });
  rejected({ rules: "survival", buildings: ring(0, 1), troops: [{ faction: "ally", ring: "b001", serial: 2, x: 50, y: 50 }] });
  rejected({ rules: "survival", cursorHp: CURSOR_MAX_HP + 1 });
  rejected({ rules: "survival", cursorHp: -1 });
  rejected({ rules: "survival", kills: -1 });
  rejected({ rules: "survival", kills: 1.5 });
  rejected({ rules: "first-playable", cursorHp: 5 });
  rejected({ rules: "first-playable", kills: 1 });
  rejected({ rules: "survival", troops: "none" });
});

test("survival funded production uses the first free spawn exit and a fresh serial", () => {
  const start = game.scenario({
    rules: "survival",
    buildings: ring(SUMMON_COST, 0),
  });
  const state = game.advance(start, TICK_MS);
  expect(building(state, "b001")).toEqual({
    id: "b001", kind: "ring", center: { x: 37, y: 10 }, mana: 0, produced: 1, living: 1, name: "Ring b001",
  });
  expect(game.observe(state).troops).toEqual([
    {
      id: "b001#1", faction: "ally", ring: "b001", serial: 1,
      x: 33, y: 14, hp: ALLY_HP, nextAttackTick: 1 + ATTACK_COOLDOWN,
    },
  ]);
  expect(game.glyphAt(state, 33, 14)).toBe("i");

  const blocked: Scenario = {
    rules: "survival",
    cursor: { x: 33, y: 14 },
    buildings: ring(SUMMON_COST, 2),
    troops: [
      { faction: "ally", ring: "b001", serial: 1, x: 35, y: 14, nextAttackTick: 100 },
      { faction: "enemy", id: "e1", x: 37, y: 14, nextAttackTick: 100 },
    ],
  };
  const skipped = game.advance(game.scenario(blocked), TICK_MS);
  expect(troop(skipped, "b001#3")).toEqual({
    id: "b001#3", faction: "ally", ring: "b001", serial: 3,
    x: 39, y: 14, hp: ALLY_HP, nextAttackTick: 1 + ATTACK_COOLDOWN,
  });
  expect(building(skipped, "b001")).toEqual({
    id: "b001", kind: "ring", center: { x: 37, y: 10 }, mana: 0, produced: 3, living: 2, name: "Ring b001",
  });

  const allBlocked: Scenario = {
    rules: "survival",
    cursor: { x: 33, y: 14 },
    buildings: ring(SUMMON_COST, 0),
    troops: [
      { faction: "enemy", id: "e1", x: 35, y: 14, nextAttackTick: 100 },
      { faction: "enemy", id: "e2", x: 37, y: 14, nextAttackTick: 100 },
      { faction: "enemy", id: "e3", x: 39, y: 14, nextAttackTick: 100 },
      { faction: "enemy", id: "e4", x: 41, y: 14, nextAttackTick: 100 },
    ],
  };
  const held = game.advance(game.scenario(allBlocked), TICK_MS);
  expect(building(held, "b001")).toEqual({
    id: "b001", kind: "ring", center: { x: 37, y: 10 }, mana: SUMMON_COST, produced: 0, living: 0, name: "Ring b001",
  });
  expect(game.observe(held).troops.map(candidate => candidate.id)).toEqual(["e1", "e2", "e3", "e4"]);
});

test("a combat death frees origin-ring population for a fresh replacement", () => {
  const start = game.scenario({
    rules: "survival",
    buildings: ring(SUMMON_COST, IMP_CAP),
    troops: [
      { faction: "ally", ring: "b001", serial: 1, x: 60, y: 50 },
      { faction: "ally", ring: "b001", serial: 2, x: 61, y: 50 },
      { faction: "ally", ring: "b001", serial: 3, x: 62, y: 50, hp: 1 },
      { faction: "ally", ring: "b001", serial: 4, x: 63, y: 50 },
      { faction: "ally", ring: "b001", serial: 5, x: 64, y: 50 },
      { faction: "enemy", id: "e1", x: 62, y: 51, hp: 3 },
    ],
  });
  let state = game.advance(start, TICK_MS);
  expect(troop(state, "b001#3")).toBeUndefined();
  expect(game.observe(state).troops.filter(candidate => candidate.faction === "enemy")).toHaveLength(1);
  expect(building(state, "b001")).toMatchObject({ produced: 5, living: 4, mana: SUMMON_COST });

  state = game.advance(state, TICK_MS);
  expect(troop(state, "b001#6")).toEqual({
    id: "b001#6", faction: "ally", ring: "b001", serial: 6,
    x: 33, y: 14, hp: ALLY_HP, nextAttackTick: 2 + ATTACK_COOLDOWN,
  });
  expect(building(state, "b001")).toMatchObject({ produced: 6, living: 5, mana: 0 });
});


test("survival combat cooldowns gate attacks and idle ready troops stay ready", () => {
  let state = game.scenario({
    rules: "survival",
    buildings: ring(0, 1),
    troops: [
      { faction: "ally", ring: "b001", serial: 1, x: 50, y: 50, hp: 4 },
      { faction: "enemy", id: "e1", x: 51, y: 50, hp: 3 },
    ],
  });
  state = game.advance(state, TICK_MS);
  expect(troop(state, "b001#1")).toMatchObject({ hp: 3, nextAttackTick: 11 });
  expect(troop(state, "e1")).toMatchObject({ hp: 2, nextAttackTick: 11 });

  state = game.advance(state, TICK_MS * 9);
  expect(troop(state, "b001#1")).toMatchObject({ hp: 3, nextAttackTick: 11 });
  expect(troop(state, "e1")).toMatchObject({ hp: 2, nextAttackTick: 11 });

  state = game.advance(state, TICK_MS);
  expect(troop(state, "b001#1")).toMatchObject({ hp: 2, nextAttackTick: 21 });
  expect(troop(state, "e1")).toMatchObject({ hp: 1, nextAttackTick: 21 });

  state = game.advance(state, TICK_MS * 10);
  expect(troop(state, "e1")).toBeUndefined();
  expect(troop(state, "b001#1")).toMatchObject({ hp: 1, nextAttackTick: 31 });
  expect(game.observe(state).kills).toBe(1);

  state = game.advance(state, TICK_MS * 10);
  expect(troop(state, "b001#1")).toMatchObject({ hp: 1, nextAttackTick: 31 });
});

test("one-target selection uses lowest HP and then stable ID without over-selecting", () => {
  let state = game.scenario({
    rules: "survival",
    buildings: ring(0, 1),
    troops: [
      { faction: "ally", ring: "b001", serial: 1, x: 50, y: 50 },
      { faction: "enemy", id: "e-a", x: 49, y: 50, hp: 2 },
      { faction: "enemy", id: "e-z", x: 51, y: 50, hp: 1 },
    ],
  });
  state = game.advance(state, TICK_MS);
  expect(troop(state, "e-z")).toBeUndefined();
  expect(troop(state, "e-a")).toMatchObject({ hp: 2 });
  expect(game.observe(state).kills).toBe(1);

  state = game.scenario({
    rules: "survival",
    buildings: ring(0, 1),
    troops: [
      { faction: "ally", ring: "b001", serial: 1, x: 50, y: 50 },
      { faction: "enemy", id: "e-a", x: 49, y: 50, hp: 2 },
      { faction: "enemy", id: "e-b", x: 51, y: 50, hp: 2 },
    ],
  });
  state = game.advance(state, TICK_MS);
  expect(troop(state, "e-a")).toMatchObject({ hp: 1 });
  expect(troop(state, "e-b")).toMatchObject({ hp: 2 });
});

test("simultaneous attacks allow mutual kills and remove both troop IDs", () => {
  const state = game.advance(game.scenario({
    rules: "survival",
    buildings: ring(0, 1),
    troops: [
      { faction: "ally", ring: "b001", serial: 1, x: 50, y: 50, hp: 1 },
      { faction: "enemy", id: "e1", x: 51, y: 50, hp: 1 },
    ],
  }), TICK_MS);
  expect(game.observe(state).troops).toEqual([]);
  expect(game.observe(state).kills).toBe(1);
  expect(building(state, "b001")).toMatchObject({ produced: 1, living: 0 });
});

test("enemies prefer adjacent allies and damage the cursor only when no ally is adjacent", () => {
  let state = game.scenario({
    rules: "survival",
    cursor: { x: 50, y: 50 },
    buildings: ring(0, 1),
    troops: [
      { faction: "ally", ring: "b001", serial: 1, x: 50, y: 50 },
      { faction: "enemy", id: "e1", x: 51, y: 50 },
    ],
  });
  state = game.advance(state, TICK_MS);
  expect(game.observe(state).cursorHp).toBe(CURSOR_MAX_HP);
  expect(troop(state, "b001#1")).toMatchObject({ hp: 3 });
  expect(troop(state, "e1")).toMatchObject({ hp: 2 });

  state = game.scenario({
    rules: "survival",
    cursor: { x: 50, y: 50 },
    troops: [{ faction: "enemy", id: "e1", x: 51, y: 50 }],
  });
  state = game.advance(state, TICK_MS);
  expect(game.observe(state).cursorHp).toBe(CURSOR_MAX_HP - 1);
  expect(troop(state, "e1")).toMatchObject({ nextAttackTick: 11 });
  state = game.advance(state, TICK_MS * 9);
  expect(game.observe(state).cursorHp).toBe(CURSOR_MAX_HP - 1);
  state = game.advance(state, TICK_MS);
  expect(game.observe(state).cursorHp).toBe(CURSOR_MAX_HP - 2);
});

test("newborn troops wait for their spawn cooldown before attacking", () => {
  let state = game.scenario({
    rules: "survival",
    buildings: ring(SUMMON_COST, 0),
    troops: [{ faction: "enemy", id: "e1", x: 33, y: 13 }],
  });
  state = game.advance(state, TICK_MS);
  expect(troop(state, "b001#1")).toMatchObject({ x: 33, y: 14, nextAttackTick: 11 });
  expect(troop(state, "e1")).toMatchObject({ hp: ENEMY_HP, nextAttackTick: 11 });
  expect(troop(state, "b001#1")).toMatchObject({ hp: ALLY_HP - 1 });

  state = game.advance(state, TICK_MS * 9);
  expect(troop(state, "e1")).toMatchObject({ hp: ENEMY_HP });

  state = game.advance(state, TICK_MS);
  expect(troop(state, "e1")).toMatchObject({ hp: ENEMY_HP - 1, nextAttackTick: 21 });
  expect(troop(state, "b001#1")).toMatchObject({ hp: ALLY_HP - 2, nextAttackTick: 21 });
});

test("survival combat is deterministic across elapsed partitions and pause", () => {
  const start = game.scenario({
    rules: "survival",
    buildings: ring(0, 1),
    troops: [
      { faction: "ally", ring: "b001", serial: 1, x: 50, y: 50, hp: 4 },
      { faction: "enemy", id: "e1", x: 51, y: 50, hp: 3 },
    ],
  });
  const once = game.advance(start, 2500);
  let partitioned = start;
  for (const part of [1, 99, 100, 300, 600, 500, 900]) partitioned = game.advance(partitioned, part);
  expect(game.observe(partitioned)).toEqual(game.observe(once));

  const paused = key(start, "p");
  const held = game.advance(paused, 10_000);
  expect(game.observe(held).troops).toEqual(game.observe(paused).troops);
  expect(game.observe(held).elapsedTicks).toBe(0);
  const hidden = game.dispatch(start, { type: "visibility", hidden: true });
  expect(game.observe(game.advance(hidden, 10_000)).troops).toEqual(game.observe(hidden).troops);
});

test("survival wells still generate and transfer into rings before summoning", () => {
  const start = game.scenario({
    rules: "survival",
    buildings: [
      { id: "b001", kind: "well", center: { x: 13, y: 10 }, mana: 0, link: "b002" },
      { id: "b002", kind: "ring", center: { x: 37, y: 10 }, mana: 0, produced: 0 },
    ],
  });
  const before = game.advance(start, TICK_MS * 49);
  expect(building(before, "b001")).toMatchObject({ mana: 0 });
  expect(building(before, "b002")).toMatchObject({ mana: 980, produced: 0, living: 0 });
  const state = game.advance(before, TICK_MS);
  expect(building(state, "b001")).toMatchObject({ mana: 0 });
  expect(building(state, "b002")).toMatchObject({ mana: 0, produced: 1, living: 1 });
  expect(game.observe(state).troops).toHaveLength(1);
});
