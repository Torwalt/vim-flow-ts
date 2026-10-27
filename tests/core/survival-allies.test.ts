import { expect, test } from "bun:test";
import {
  ALLY_AGGRO_RADIUS,
  ALLY_HP,
  CURSOR_MAX_HP,
  SUMMON_COST,
  TICK_MS,
  WAVE_INTERVAL,
  WAVE_START_TICK,
  game,
  type Scenario,
  type SurvivalEnemySetup,
  type SurvivalTroopSetup,
  type World,
} from "../../src/core/game";

function key(state: World, value: string): World {
  return game.dispatch(state, { type: "key", key: value });
}

function type(state: World, value: string): World {
  let next = state;
  for (const character of Array.from(value)) next = key(next, character);
  return next;
}

function ring(center = { x: 100, y: 100 }, produced = 1, mana = 0): Scenario["buildings"] {
  return [{ id: "b001", kind: "ring", center, mana, produced }];
}

function ally(serial: number, x: number, y: number, extra: { hp?: number; nextAttackTick?: number } = {}): SurvivalTroopSetup {
  return { faction: "ally", ring: "b001", serial, x, y, ...extra };
}

function enemy(id: string, x: number, y: number, extra: { hp?: number; nextAttackTick?: number } = {}): SurvivalEnemySetup {
  return { faction: "enemy", id, x, y, ...extra };
}

function positions(state: World): [string, number, number][] {
  return game.observe(state).troops.map(troop => [troop.id, troop.x, troop.y]);
}

function troop(state: World, id: string) {
  return game.observe(state).troops.find(candidate => candidate.id === id);
}

test("allies step north on a tie, reach the rally and then wait there", () => {
  let state = game.scenario({
    rules: "survival",
    cursor: { x: 100, y: 100 },
    rally: { x: 10, y: 10 },
    buildings: ring(),
    troops: [ally(1, 11, 11)],
  });
  expect(positions(game.advance(state, 5 * TICK_MS))).toEqual([["b001#1", 11, 10]]);

  state = game.scenario({
    rules: "survival",
    cursor: { x: 100, y: 100 },
    rally: { x: 10, y: 10 },
    buildings: ring(),
    troops: [ally(1, 10, 11)],
  });
  state = game.advance(state, 5 * TICK_MS);
  expect(positions(state)).toEqual([["b001#1", 10, 10]]);
  state = game.advance(state, 10 * TICK_MS);
  expect(positions(state)).toEqual([["b001#1", 10, 10]]);
});

test("stable ally order packs a group around the rally without overlap", () => {
  const state = game.advance(game.scenario({
    rules: "survival",
    cursor: { x: 100, y: 100 },
    rally: { x: 10, y: 10 },
    buildings: ring({ x: 100, y: 100 }, 2),
    troops: [ally(1, 10, 9), ally(2, 9, 10)],
  }), 5 * TICK_MS);
  expect(positions(state)).toEqual([
    ["b001#1", 10, 10],
    ["b001#2", 9, 10],
  ]);
  expect(new Set(positions(state).map(([, x, y]) => `${x},${y}`)).size).toBe(2);
});

test("allies never enter the cursor cell and hold beside an enemy", () => {
  let state = game.advance(game.scenario({
    rules: "survival",
    cursor: { x: 10, y: 10 },
    rally: { x: 10, y: 10 },
    buildings: ring(),
    troops: [ally(1, 10, 11)],
  }), 5 * TICK_MS);
  expect(game.observe(state).cursor).toEqual({ x: 10, y: 10 });
  expect(positions(state)).toEqual([["b001#1", 10, 11]]);

  state = game.advance(game.scenario({
    rules: "survival",
    cursor: { x: 100, y: 100 },
    rally: { x: 200, y: 100 },
    buildings: ring(),
    troops: [ally(1, 50, 50), enemy("e1", 51, 50, { nextAttackTick: 1_000_000 })],
  }), 5 * TICK_MS);
  expect(positions(state)).toEqual([
    ["b001#1", 50, 50],
    ["e1", 51, 50],
  ]);
});

test("retargeting the shared rally redirects existing allies onward", () => {
  let state = game.scenario({
    rules: "survival",
    cursor: { x: 22, y: 20 },
    rally: { x: 10, y: 20 },
    buildings: ring(),
    troops: [ally(1, 20, 20)],
  });
  state = game.advance(state, 5 * TICK_MS);
  expect(positions(state)).toEqual([["b001#1", 19, 20]]);

  state = key(state, "i");
  state = type(state, "rally");
  state = key(state, "Enter");
  expect({ mode: game.observe(state).mode, rally: game.observe(state).rally })
    .toEqual({ mode: "Normal", rally: { x: 22, y: 20 } });

  state = game.advance(state, 5 * TICK_MS);
  expect(positions(state)).toEqual([["b001#1", 20, 20]]);
});

test("a produced ally uses the current rally on its first movement phase", () => {
  let state = game.scenario({
    rules: "survival",
    cursor: { x: 200, y: 100 },
    rally: { x: 150, y: 100 },
    buildings: ring({ x: 100, y: 100 }, 0, SUMMON_COST),
  });
  state = game.advance(state, TICK_MS);
  expect(positions(state)).toEqual([["b001#1", 96, 104]]);
  state = game.advance(state, 4 * TICK_MS);
  expect(positions(state)).toEqual([["b001#1", 96, 103]]);
  expect(game.observe(state).buildings[0]).toMatchObject({ produced: 1, living: 1, mana: 0 });
});

test("the aggro boundary is six path cells and allies return to rally when enemies are gone", () => {
  let state = game.advance(game.scenario({
    rules: "survival",
    cursor: { x: 150, y: 150 },
    rally: { x: 200, y: 100 },
    buildings: ring({ x: 100, y: 100 }),
    troops: [
      ally(1, 100 + ALLY_AGGRO_RADIUS, 100),
      enemy("e1", 100, 100, { nextAttackTick: 1_000_000 }),
    ],
  }), 5 * TICK_MS);
  expect(positions(state)).toEqual([
    ["b001#1", 100 + ALLY_AGGRO_RADIUS - 1, 100],
    ["e1", 101, 100],
  ]);

  state = game.advance(game.scenario({
    rules: "survival",
    cursor: { x: 150, y: 150 },
    rally: { x: 200, y: 100 },
    buildings: ring({ x: 100, y: 100 }),
    troops: [
      ally(1, 100 + ALLY_AGGRO_RADIUS + 1, 100),
      enemy("e1", 100, 100, { nextAttackTick: 1_000_000 }),
    ],
  }), 5 * TICK_MS);
  expect(positions(state)).toEqual([
    ["b001#1", 100 + ALLY_AGGRO_RADIUS + 2, 100],
    ["e1", 101, 100],
  ]);

  const pursuit = game.scenario({
    rules: "survival",
    cursor: { x: 100, y: 100 },
    rally: { x: 50, y: 60 },
    buildings: ring({ x: 100, y: 100 }, 2),
    troops: [ally(1, 50, 50), ally(2, 56, 51), enemy("e1", 56, 50)],
  });
  state = game.advance(pursuit, 5 * TICK_MS);
  expect(troop(state, "b001#1")).toMatchObject({ x: 51, y: 50 });
  state = game.advance(pursuit, 20 * TICK_MS);
  expect(troop(state, "b001#1")).toMatchObject({ x: 54, y: 50 });
  expect(troop(state, "e1")).toMatchObject({ hp: 1 });
  state = game.advance(pursuit, 21 * TICK_MS);
  expect(troop(state, "e1")).toBeUndefined();
  expect(game.observe(state).kills).toBe(1);
  state = game.advance(pursuit, 25 * TICK_MS);
  expect(troop(state, "b001#1")).toMatchObject({ x: 54, y: 51 });
  expect(troop(state, "b001#2")).toMatchObject({ x: 56, y: 52 });
});

test("allied movement, combat and kills are partition-invariant", () => {
  const start = game.scenario({
    rules: "survival",
    cursor: { x: 100, y: 100 },
    rally: { x: 50, y: 60 },
    buildings: ring({ x: 100, y: 100 }, 2),
    troops: [ally(1, 50, 50), ally(2, 56, 51), enemy("e1", 56, 50)],
  });
  const once = game.advance(start, 25 * TICK_MS);
  let partitioned = start;
  for (const part of [1, 99, 100, 300, 600, 500, 900]) partitioned = game.advance(partitioned, part);
  expect(game.observe(partitioned)).toEqual(game.observe(once));
});

test("departed allies keep their origin-ring living cap and are not replaced", () => {
  const state = game.advance(game.scenario({
    rules: "survival",
    cursor: { x: 220, y: 100 },
    rally: { x: 200, y: 100 },
    buildings: ring({ x: 37, y: 10 }, 5, SUMMON_COST),
    troops: [
      ally(1, 50, 50),
      ally(2, 52, 50),
      ally(3, 54, 50),
      ally(4, 56, 50),
      ally(5, 58, 50),
    ],
  }), 10 * TICK_MS);
  expect(game.observe(state).buildings[0]).toMatchObject({
    produced: 5,
    living: 5,
    mana: SUMMON_COST,
  });
  expect(game.observe(state).troops.map(troop => troop.id))
    .toEqual(["b001#1", "b001#2", "b001#3", "b001#4", "b001#5"]);
});

test("allies rally beside the gate and fight a wave without moving the cursor there", () => {
  const start = game.scenario({
    rules: "survival",
    cursor: { x: 13, y: 136 },
    rally: { x: 197, y: 136 },
    buildings: ring({ x: 190, y: 140 }, 3),
    troops: [ally(1, 190, 136), ally(2, 190, 137), ally(3, 190, 138)],
  });
  let state = game.advance(start, (WAVE_START_TICK - 1) * TICK_MS);
  expect(game.observe(state).troops.map(troop => [troop.id, troop.x, troop.y])).toEqual([
    ["b001#1", 197, 136],
    ["b001#2", 196, 136],
    ["b001#3", 195, 136],
  ]);

  state = game.advance(start, 350 * TICK_MS);
  const observation = game.observe(state);
  expect({ cursor: observation.cursor, cursorHp: observation.cursorHp, wave: observation.wave })
    .toEqual({ cursor: { x: 13, y: 136 }, cursorHp: CURSOR_MAX_HP, wave: 1 });
  expect(observation.kills).toBe(3);
  expect(observation.troops.filter(troop => troop.faction === "enemy")).toEqual([]);
  expect(observation.troops.some(troop => troop.faction === "ally" && troop.hp < ALLY_HP)).toBe(true);
});

test("an occupied gate cell suppresses its wave slot without a hidden backlog", () => {
  const start = game.scenario({
    rules: "survival",
    cursor: { x: 13, y: 10 },
    elapsedTicks: WAVE_START_TICK + 13 * WAVE_INTERVAL - 1,
    troops: [enemy("e0", 198, 134, { nextAttackTick: 1_000_000 })],
  });
  let state = game.advance(start, TICK_MS);
  expect(game.observe(state).wave).toBe(14);
  expect(game.observe(state).troops.filter(troop => troop.id.startsWith("e14-")).map(troop => troop.id).sort())
    .toEqual(Array.from({ length: 15 }, (_, index) => `e14-${index + 1}`).sort());

  state = game.advance(state, WAVE_INTERVAL * TICK_MS);
  expect(game.observe(state).wave).toBe(15);
  expect(game.observe(state).troops.filter(troop => troop.id.startsWith("e15-"))).toHaveLength(16);
  expect(game.observe(state).troops.some(troop => troop.id === "e14-16")).toBe(false);
});

test("the finder observes and jumps to the current shared rally", () => {
  let state = game.scenario({
    rules: "survival",
    cursor: { x: 30, y: 30 },
    rally: { x: 60, y: 70 },
  });
  state = key(state, " ");
  state = key(state, "f");
  state = type(state, "rally");
  state = key(state, "Enter");
  expect({ mode: game.observe(state).mode, cursor: game.observe(state).cursor, rally: game.observe(state).rally })
    .toEqual({ mode: "Normal", cursor: { x: 60, y: 70 }, rally: { x: 60, y: 70 } });
});
