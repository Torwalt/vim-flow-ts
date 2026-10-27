import { expect, test } from "bun:test";
import {
  TICK_MS,
  WAVE_INTERVAL,
  WAVE_START_TICK,
  game,
  RULES_PROFILES,
  type World,
} from "../../src/core/game";

function rejected(spec: unknown): void {
  expect(() => game.scenario(spec)).toThrow();
}

function key(state: World, value: string): World {
  return game.dispatch(state, { type: "key", key: value });
}

test("rules profiles are explicit and omitted construction stays first-playable", () => {
  expect([...RULES_PROFILES]).toEqual(["first-playable", "survival"]);
  const omitted = game.initial();
  const explicit = game.scenario({ rules: "first-playable" });
  expect(game.observe(explicit)).toEqual(game.observe(omitted));
  expect(game.field(explicit)).toEqual(game.field(omitted));
  expect(game.observe(omitted).siteCount).toBe(8);
  expect(game.observe(omitted).siteAtCursor).toBe("a01");
  expect(game.snapshot(omitted)).not.toHaveProperty("rules");
  expect(game.snapshot(explicit)).not.toHaveProperty("rules");
});

test("survival starts without fixed sites or buildings and keeps the initial cursor", () => {
  const state = game.initial({ rules: "survival" });
  const observation = game.observe(state);
  expect(observation.cursor).toEqual({ x: 13, y: 10 });
  expect(observation.siteCount).toBe(0);
  expect(observation.buildingCount).toBe(0);
  expect(observation.impCount).toBe(0);
  expect(observation.sites).toEqual({});
  expect(observation.siteAtCursor).toBeNull();
  expect(observation.imps).toEqual([]);
  expect(observation.links).toEqual([]);
  expect(game.siteAt(state, 10, 10)).toBeNull();
  expect(game.glyphAt(state, 8, 8)).toBe("^");
  expect(game.field(state).text).toHaveLength(240 * 160);
  expect(game.field(state)).not.toEqual(game.field(game.initial()));
});

test("survival scenarios accept clock and cursor fields and round-trip their profile", () => {
  const state = game.scenario({
    rules: "survival",
    cursor: { x: 239, y: 159 },
    suspended: false,
    elapsedTicks: 12,
    remainderMs: 34,
  });
  const advanced = game.advance(state, 250);
  const observation = game.observe(advanced);
  expect(observation.cursor).toEqual({ x: 239, y: 159 });
  expect(observation.elapsedTicks).toBe(14);
  expect(observation.remainderMs).toBe(84);
  expect(observation.siteCount).toBe(0);

  const snapshot = game.snapshot(advanced);
  expect(snapshot.rules).toBe("survival");
  const roundtrip = game.scenario(snapshot);
  expect(game.observe(roundtrip)).toEqual(observation);
  expect(game.field(roundtrip)).toEqual(game.field(advanced));
  expect(game.snapshot(roundtrip)).toEqual(snapshot);
});

test("survival navigation-only scenarios keep their profile through snapshots", () => {
  const state = game.scenario({
    rules: "survival",
    navigationOnly: true,
    rows: { "2": "x ^^ ~" },
    cursor: { x: 0, y: 2 },
  });
  const snapshot = game.snapshot(state);
  expect(snapshot.rules).toBe("survival");
  expect(snapshot.navigationOnly).toBe(true);
  const roundtrip = game.scenario(snapshot);
  expect(game.observe(roundtrip)).toEqual(game.observe(state));
  expect(game.field(roundtrip)).toEqual(game.field(state));
});

test("navigation-only survival keeps navigation and clock without waves or troops", () => {
  const start = game.scenario({
    rules: "survival",
    navigationOnly: true,
    rows: { "2": "x ^^ ~", "5": "alpha beta" },
    cursor: { x: 0, y: 2 },
  });
  const totalMs = WAVE_START_TICK * TICK_MS + 3 * WAVE_INTERVAL * TICK_MS + 15_000;
  let partitioned = start;
  for (const part of [1, 99, 100, 300, 600, 500, 900, 12_500, 20_000, 70_000]) {
    partitioned = game.advance(partitioned, part);
  }
  const once = game.advance(start, totalMs);
  expect(game.observe(partitioned)).toEqual(game.observe(once));
  expect(game.snapshot(partitioned)).toEqual(game.snapshot(once));
  const observation = game.observe(once);
  expect(observation.elapsedTicks).toBe(totalMs / TICK_MS);
  expect(observation.remainderMs).toBe(0);
  expect(observation.wave).toBe(0);
  expect(observation.nextWaveTick).toBe(0);
  expect(observation.troops).toEqual([]);
  expect(observation.cursorHp).toBe(10);
  expect(game.field(once)).toEqual(game.field(start));
  expect(game.glyphAt(once, 2, 2)).toBe("^");
  expect(game.glyphAt(once, 0, 5)).toBe("a");

  const moved = key(once, "w");
  expect(game.observe(moved).cursor).toEqual({ x: 2, y: 2 });
  const snapshot = game.snapshot(moved);
  const roundtrip = game.scenario(snapshot);
  expect(game.observe(roundtrip)).toEqual(game.observe(moved));
  expect(game.field(roundtrip)).toEqual(game.field(moved));
  expect(game.snapshot(roundtrip)).toEqual(snapshot);
  const future = game.advance(roundtrip, totalMs);
  const direct = game.advance(moved, totalMs);
  expect(game.observe(future)).toEqual(game.observe(direct));
  expect(game.observe(future).troops).toEqual([]);
  expect(game.observe(future).wave).toBe(0);

  const clocked = game.scenario({
    rules: "survival",
    navigationOnly: true,
    elapsedTicks: 12,
    remainderMs: 34,
  });
  const advanced = game.advance(clocked, 250);
  expect(game.observe(advanced).elapsedTicks).toBe(14);
  expect(game.observe(advanced).remainderMs).toBe(84);
  for (const stop of [{ manualPaused: true }, { suspended: true }]) {
    const held = game.scenario({ rules: "survival", navigationOnly: true, elapsedTicks: 7, remainderMs: 89, ...stop });
    expect(game.observe(game.advance(held, totalMs))).toEqual(game.observe(held));
  }

  const ordinary = game.advance(game.scenario({
    rules: "survival",
    elapsedTicks: WAVE_START_TICK - 1,
  }), TICK_MS);
  expect(game.observe(ordinary).wave).toBe(1);
  expect(game.observe(ordinary).troops.filter(troop => troop.faction === "enemy")).toHaveLength(3);
});

test("survival rejects legacy fixed-site construction without changing the world", () => {
  const state: World = game.initial({ rules: "survival" });
  expect(game.build(state, "a01", "well")).toBe(state);
  expect(game.link(state, "a01", "a02")).toBe(state);
  expect(game.dispatch(state, { type: "build", site: "a01", kind: "well" })).toBe(state);
  expect(game.preview(state, "a01", "well").text).toBe(game.field(state).text);
  expect(game.siteAt(state, 8, 8)).toBeNull();
});

test("invalid profiles and survival fixed-site data are rejected independently", () => {
  for (const invalid of [
    { rules: "legacy" },
    { rules: "SURVIVAL" },
    { rules: "" },
    { rules: 1 },
    { rules: null },
    { rules: true },
  ]) {
    expect(() => game.initial(invalid)).toThrow();
    rejected(invalid);
  }
  expect(() => game.initial("survival")).toThrow();
  expect(() => game.initial(null)).toThrow();
  expect(() => game.initial({ profile: "survival" })).toThrow();
  rejected({ rules: "survival", buildings: [{ site: "a01", kind: "well" }] });
  rejected({ rules: "survival", buildings: [{ site: "a01", kind: "well", produced: 1 }] });
  rejected({ rules: "survival", pendingSource: "a01" });
  rejected({ rules: "survival", pendingSource: "a01", buildings: [] });
  expect(game.snapshot(game.scenario({ rules: "survival", buildings: [] })).rules).toBe("survival");
});

test("both profiles round-trip through initial snapshots", () => {
  for (const value of RULES_PROFILES) {
    const state = game.initial({ rules: value });
    expect(game.snapshot(state).rules ?? "first-playable").toBe(value);
  }
});
