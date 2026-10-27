import { expect, test } from "bun:test";
import {
  ATTACK_COOLDOWN,
  CURSOR_MAX_HP,
  ENEMY_CAP,
  TICK_MS,
  WAVE_INTERVAL,
  WAVE_START_TICK,
  game,
  type Scenario,
  type SurvivalEnemySetup,
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

function enemies(state: World) {
  return game.observe(state).troops.filter(troop => troop.faction === "enemy");
}

function enemyScenario(troops: readonly SurvivalEnemySetup[], extra: Scenario = {}): Scenario {
  return { rules: "survival", cursor: { x: 10, y: 10 }, troops, ...extra };
}

test("waves start on exact ticks with capped sizes at the fixed gate perimeter", () => {
  const before = game.scenario({ rules: "survival", elapsedTicks: WAVE_START_TICK - 1 });
  expect(game.observe(before).wave).toBe(0);
  expect(game.observe(before).nextWaveTick).toBe(WAVE_START_TICK);

  let state = game.advance(before, TICK_MS);
  expect(game.observe(state).wave).toBe(1);
  expect(game.observe(state).nextWaveTick).toBe(WAVE_START_TICK + WAVE_INTERVAL);
  expect(enemies(state).map(troop => troop.id)).toEqual(["e1-1", "e1-2", "e1-3"]);
  expect(enemies(state).map(troop => ({ x: troop.x, y: troop.y }))).toEqual([
    { x: 198, y: 133 },
    { x: 199, y: 133 },
    { x: 200, y: 133 },
  ]);

  state = game.advance(state, (WAVE_START_TICK + WAVE_INTERVAL - 1 - game.observe(state).elapsedTicks) * TICK_MS);
  expect(game.observe(state).elapsedTicks).toBe(WAVE_START_TICK + WAVE_INTERVAL - 1);
  expect(enemies(state).map(troop => troop.id).filter(id => id.startsWith("e2-"))).toEqual([]);

  state = game.advance(state, TICK_MS);
  expect(game.observe(state).wave).toBe(2);
  expect(game.observe(state).nextWaveTick).toBe(WAVE_START_TICK + 2 * WAVE_INTERVAL);
  expect(enemies(state).map(troop => troop.id).filter(id => id.startsWith("e2-"))).toEqual([
    "e2-1", "e2-2", "e2-3", "e2-4",
  ]);
  expect(enemies(state)
    .filter(troop => troop.id.startsWith("e2-"))
    .map(troop => ({ x: troop.x, y: troop.y }))).toEqual([
    { x: 198, y: 133 },
    { x: 199, y: 133 },
    { x: 200, y: 133 },
    { x: 201, y: 133 },
  ]);
});

test("wave fourteen fills the sixteen-cell perimeter and the enemy cap suppresses spawning", () => {
  const waveFourteen = game.advance(game.scenario({
    rules: "survival",
    elapsedTicks: WAVE_START_TICK + 13 * WAVE_INTERVAL - 1,
  }), TICK_MS);
  expect(game.observe(waveFourteen).wave).toBe(14);
  expect(enemies(waveFourteen)).toHaveLength(16);
  expect(enemies(waveFourteen).map(troop => troop.id).sort()).toEqual(
    Array.from({ length: 16 }, (_, index) => `e14-${index + 1}`).sort(),
  );

  const full: SurvivalEnemySetup[] = [];
  for (let index = 0; index < ENEMY_CAP; index++) {
    full.push({
      faction: "enemy",
      id: `n${String(index).padStart(3, "0")}`,
      x: 50 + (index % 16),
      y: 20 + Math.floor(index / 16),
      nextAttackTick: 1_000_000,
    });
  }
  const capped = game.advance(game.scenario({
    rules: "survival",
    elapsedTicks: WAVE_START_TICK - 1,
    troops: full,
  }), TICK_MS);
  expect(game.observe(capped).wave).toBe(1);
  expect(enemies(capped)).toHaveLength(ENEMY_CAP);
  expect(enemies(capped).some(troop => troop.id.startsWith("e1-"))).toBe(false);
});

test("occupied gate perimeter cells are skipped while the cursor and gate stay fixed", () => {
  const start = game.scenario({
    rules: "survival",
    cursor: { x: 198, y: 134 },
    cursorHp: CURSOR_MAX_HP,
    elapsedTicks: WAVE_START_TICK - 1,
    troops: [{ faction: "enemy", id: "e0", x: 199, y: 134, nextAttackTick: 1_000_000 }],
  });
  const state = game.advance(start, TICK_MS);
  expect(game.observe(state).cursor).toEqual({ x: 198, y: 134 });
  expect(enemies(state).map(troop => ({ id: troop.id, x: troop.x, y: troop.y }))).toEqual([
    { id: "e0", x: 199, y: 134 },
    { id: "e1-1", x: 200, y: 134 },
    { id: "e1-2", x: 201, y: 134 },
    { id: "e1-3", x: 202, y: 134 },
  ]);

  const far = game.advance(game.scenario({ rules: "survival", elapsedTicks: WAVE_START_TICK - 1 }), TICK_MS);
  expect(game.observe(far).cursor).toEqual({ x: 13, y: 10 });
  expect(enemies(far).every(troop => troop.x >= 198 && troop.x <= 200 && troop.y === 133)).toBe(true);
});

test("hostile BFS uses stable ID order, earlier moves and a deterministic congestion hold", () => {
  let state = game.advance(game.scenario(enemyScenario([
    { faction: "enemy", id: "e1", x: 20, y: 20, nextAttackTick: 1_000_000 },
  ])), 5 * TICK_MS);
  expect(enemies(state).map(troop => ({ x: troop.x, y: troop.y }))).toEqual([{ x: 20, y: 19 }]);

  state = game.advance(game.scenario(enemyScenario([
    { faction: "enemy", id: "e-z", x: 12, y: 11, nextAttackTick: 1_000_000 },
    { faction: "enemy", id: "e-a", x: 12, y: 10, nextAttackTick: 1_000_000 },
  ])), 5 * TICK_MS);
  expect(enemies(state).map(troop => ({ id: troop.id, x: troop.x, y: troop.y }))).toEqual([
    { id: "e-a", x: 11, y: 10 },
    { id: "e-z", x: 12, y: 10 },
  ]);

  state = game.advance(game.scenario(enemyScenario([
    { faction: "enemy", id: "e-a", x: 11, y: 10, nextAttackTick: 1_000_000 },
    { faction: "enemy", id: "e-b", x: 12, y: 10, nextAttackTick: 1_000_000 },
  ])), 5 * TICK_MS);
  expect(enemies(state).map(troop => ({ id: troop.id, x: troop.x, y: troop.y }))).toEqual([
    { id: "e-a", x: 11, y: 10 },
    { id: "e-b", x: 12, y: 10 },
  ]);
});

test("axis, line, find, word and finder displacements stop before hostiles", () => {
  let state = game.scenario(enemyScenario([
    { faction: "enemy", id: "e1", x: 15, y: 10, nextAttackTick: 1_000_000 },
  ]));
  state = type(state, "9l");
  expect(game.observe(state).cursor).toEqual({ x: 14, y: 10 });

  state = game.scenario(enemyScenario([
    { faction: "enemy", id: "e1", x: 100, y: 10, nextAttackTick: 1_000_000 },
  ]));
  state = key(state, "$");
  expect(game.observe(state).cursor).toEqual({ x: 99, y: 10 });

  state = game.scenario(enemyScenario([
    { faction: "enemy", id: "e1", x: 5, y: 8, nextAttackTick: 1_000_000 },
  ], { cursor: { x: 1, y: 8 } }));
  state = key(key(state, "f"), "^");
  expect(game.observe(state).cursor).toEqual({ x: 4, y: 8 });

  state = game.scenario(enemyScenario([
    { faction: "enemy", id: "e1", x: 5, y: 7, nextAttackTick: 1_000_000 },
  ], { cursor: { x: 1, y: 7 } }));
  state = type(state, "2w");
  expect(game.observe(state).cursor).toEqual({ x: 4, y: 7 });

  state = game.scenario({
    rules: "survival",
    cursor: { x: 100, y: 100 },
    buildings: [{ id: "b001", kind: "well", center: { x: 13, y: 100 } }],
    troops: [{ faction: "enemy", id: "e1", x: 50, y: 100, nextAttackTick: 1_000_000 }],
  });
  state = key(key(state, " "), "f");
  state = type(state, "b001");
  state = key(state, "Enter");
  const observation = game.observe(state);
  expect(observation.cursor).toEqual({ x: 51, y: 100 });
  expect(observation.mode).toBe("Normal");
  expect(observation.notice).toBe("Blocked by hostile at 50,100");
});

test("collision contact damages only the first hostile and shares the attack cooldown", () => {
  let state = game.scenario(enemyScenario([
    { faction: "enemy", id: "e1", x: 51, y: 50 },
    { faction: "enemy", id: "e2", x: 52, y: 50 },
  ], { cursor: { x: 50, y: 50 } }));
  state = type(state, "9l");
  let observation = game.observe(state);
  expect(observation.cursor).toEqual({ x: 50, y: 50 });
  expect(observation.cursorHp).toBe(CURSOR_MAX_HP - 1);
  expect(observation.troops.find(troop => troop.id === "e1")?.nextAttackTick)
    .toBe(observation.elapsedTicks + ATTACK_COOLDOWN);
  expect(observation.troops.find(troop => troop.id === "e2")?.nextAttackTick).toBe(0);

  state = key(state, "l");
  observation = game.observe(state);
  expect(observation.cursorHp).toBe(CURSOR_MAX_HP - 1);
  expect(observation.troops.find(troop => troop.id === "e1")?.nextAttackTick)
    .toBe(ATTACK_COOLDOWN);

  state = game.advance(state, 9 * TICK_MS);
  expect(game.observe(state).cursorHp).toBe(CURSOR_MAX_HP - 1);
  state = game.advance(state, TICK_MS);
  observation = game.observe(state);
  expect(observation.elapsedTicks).toBe(ATTACK_COOLDOWN);
  expect(observation.cursorHp).toBe(CURSOR_MAX_HP - 2);
  expect(observation.troops.find(troop => troop.id === "e1")?.nextAttackTick)
    .toBe(2 * ATTACK_COOLDOWN);
});

test("input death clears source and remainder, ignores later play and Enter restarts fresh", () => {
  const dead = key(game.scenario({
    rules: "survival",
    cursor: { x: 50, y: 50 },
    cursorHp: 1,
    remainderMs: 60,
    buildings: [{ id: "b001", kind: "well", center: { x: 13, y: 10 } }],
    pendingSource: "b001",
    troops: [{ faction: "enemy", id: "e1", x: 51, y: 50 }],
  }), "l");
  let observation = game.observe(dead);
  expect({
    gameOver: observation.gameOver,
    cursorHp: observation.cursorHp,
    cursor: observation.cursor,
    mode: observation.mode,
    pendingSource: observation.pendingSource,
    remainderMs: observation.remainderMs,
  }).toEqual({
    gameOver: true,
    cursorHp: 0,
    cursor: { x: 50, y: 50 },
    mode: "Normal",
    pendingSource: null,
    remainderMs: 0,
  });
  expect(observation.notice).toContain("Game over");
  expect(key(dead, "l")).toBe(dead);
  expect(key(dead, "i")).toBe(dead);
  expect(key(dead, "Enter", true)).toBe(dead);
  const afterTime = game.advance(dead, 10_000);
  expect(afterTime).toBe(dead);
  expect(game.snapshot(dead).cursorHp).toBe(0);

  const restarted = key(dead, "Enter");
  observation = game.observe(restarted);
  expect({
    gameOver: observation.gameOver,
    cursorHp: observation.cursorHp,
    cursor: observation.cursor,
    elapsedTicks: observation.elapsedTicks,
    remainderMs: observation.remainderMs,
    troops: observation.troops,
    buildingCount: observation.buildingCount,
    rally: observation.rally,
  }).toEqual({
    gameOver: false,
    cursorHp: CURSOR_MAX_HP,
    cursor: { x: 13, y: 10 },
    elapsedTicks: 0,
    remainderMs: 0,
    troops: [],
    buildingCount: 0,
    rally: { x: 13, y: 10 },
  });
});

test("tick death stops at the lethal tick, drops typed interaction and consumes no later time", () => {
  const start = game.scenario({
    rules: "survival",
    cursor: { x: 50, y: 50 },
    cursorHp: 1,
    remainderMs: 60,
    elapsedTicks: 4,
    buildings: [{ id: "b001", kind: "well", center: { x: 13, y: 10 } }],
    pendingSource: "b001",
    troops: [{ faction: "enemy", id: "e1", x: 51, y: 50 }],
  });
  let typing = key(start, "i");
  typing = type(typing, "mana");
  expect(game.observe(typing).commandBuffer).toBe("mana");
  const once = game.advance(typing, 2500);
  let observation = game.observe(once);
  expect({
    gameOver: observation.gameOver,
    elapsedTicks: observation.elapsedTicks,
    remainderMs: observation.remainderMs,
    mode: observation.mode,
    commandBuffer: observation.commandBuffer,
    pendingSource: observation.pendingSource,
  }).toEqual({
    gameOver: true,
    elapsedTicks: 5,
    remainderMs: 0,
    mode: "Normal",
    commandBuffer: "",
    pendingSource: null,
  });

  let partitioned = typing;
  for (const part of [1, 99, 100, 300, 600, 500, 900]) partitioned = game.advance(partitioned, part);
  expect(game.observe(partitioned)).toEqual(game.observe(once));

  const frozen = game.advance(once, 10_000);
  expect(frozen).toBe(once);
  expect(game.observe(frozen).elapsedTicks).toBe(5);
  expect(game.observe(frozen).remainderMs).toBe(0);
});

test("manual pause and hidden suspension hold wave progress without catch-up", () => {
  const start = game.scenario({ rules: "survival", elapsedTicks: WAVE_START_TICK - 1 });
  const paused = key(start, "p");
  expect(game.observe(game.advance(paused, 10_000)).elapsedTicks).toBe(WAVE_START_TICK - 1);
  const resumed = key(paused, "p");
  const wave = game.advance(resumed, TICK_MS);
  expect(game.observe(wave).elapsedTicks).toBe(WAVE_START_TICK);
  expect(enemies(wave)).toHaveLength(3);

  const hidden = game.dispatch(start, { type: "visibility", hidden: true });
  expect(game.observe(game.advance(hidden, 10_000)).elapsedTicks).toBe(WAVE_START_TICK - 1);
  const shown = game.dispatch(hidden, { type: "visibility", hidden: false });
  const resumedWave = game.advance(shown, TICK_MS);
  expect(game.observe(resumedWave).elapsedTicks).toBe(WAVE_START_TICK);
  expect(enemies(resumedWave)).toHaveLength(3);
});
