import { expect, test } from "bun:test";
import {
  DEFAULT_RALLY,
  GATE_CENTER,
  MAX_BUILDINGS,
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

function blur(state: World): World {
  return game.dispatch(state, { type: "blur" });
}

function building(state: World, id: string) {
  return game.observe(state).buildings.find(candidate => candidate.id === id);
}

function centres(): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 8; column++) {
      result.push({ x: 13 + 12 * column, y: 6 + 8 * row });
    }
  }
  return result;
}

test("survival Insert opens on open ground and on a built footprint with ordered candidates", () => {
  const ground = game.initial({ rules: "survival" });
  let state = key(ground, "i");
  let observation = game.observe(state);
  expect({
    mode: observation.mode,
    insertSite: observation.insertSite,
    insertCell: observation.insertCell,
    draft: observation.commandBuffer,
    cursor: observation.cursor,
    candidates: observation.candidates,
    buildings: observation.buildingCount,
  }).toEqual({
    mode: "Insert",
    insertSite: null,
    insertCell: { x: 13, y: 10 },
    draft: "",
    cursor: { x: 13, y: 10 },
    candidates: ["mana well", "summoning ring", "rally"],
    buildings: 0,
  });

  state = type(state, "mana");
  observation = game.observe(state);
  expect(observation.commandBuffer).toBe("mana");
  expect(observation.candidates).toEqual(["mana well"]);
  expect(observation.cursor).toEqual({ x: 13, y: 10 });
  state = key(state, "Tab");
  observation = game.observe(state);
  expect({ mode: observation.mode, draft: observation.commandBuffer, buildings: observation.buildingCount })
    .toEqual({ mode: "Insert", draft: "mana well", buildings: 0 });

  const built = game.scenario({
    rules: "survival",
    cursor: { x: 8, y: 8 },
    buildings: [{ id: "b001", kind: "well", center: { x: 13, y: 10 } }],
  });
  observation = game.observe(key(built, "i"));
  expect({
    mode: observation.mode,
    insertSite: observation.insertSite,
    insertCell: observation.insertCell,
    candidates: observation.candidates,
  }).toEqual({
    mode: "Insert",
    insertSite: "b001",
    insertCell: { x: 8, y: 8 },
    candidates: ["connect", "rally"],
  });
});

test("survival drafts are bounded ASCII and ignore blocked or nonprintable keys", () => {
  let state = key(game.initial({ rules: "survival" }), "i");
  const cursor = game.observe(state).cursor;
  for (let index = 0; index < 40; index++) state = key(state, "x");
  expect(game.observe(state).commandBuffer).toBe("x".repeat(32));
  state = key(state, "Backspace");
  expect(game.observe(state).commandBuffer).toBe("x".repeat(31));
  const before = game.observe(state);
  for (const value of ["ArrowLeft", "\t", "\n", "é", "😀", "mana well"]) {
    const next = key(state, value);
    if (value === "\t") {
      expect(game.observe(next).commandBuffer).toBe(before.commandBuffer);
    } else {
      expect(next).toBe(state);
    }
  }
  for (const value of ["Escape", "Enter", "Backspace", "x", "Tab"]) {
    expect(key(state, value, true)).toBe(state);
  }
  expect(game.observe(state).cursor).toEqual(cursor);
  for (let index = 0; index < 40; index++) state = key(state, "Backspace");
  expect(game.observe(state).commandBuffer).toBe("");
  expect(key(state, "Backspace")).toBe(state);
});

test("real survival keys construct both building kinds, default names and stable IDs", () => {
  let state = key(game.initial({ rules: "survival" }), "i");
  state = type(state, "mana well");
  state = key(state, "Enter");
  let observation = game.observe(state);
  expect({
    mode: observation.mode,
    nameTarget: observation.nameTarget,
    buildings: observation.buildingCount,
    cursor: observation.cursor,
  }).toEqual({ mode: "Name", nameTarget: "b001", buildings: 1, cursor: { x: 13, y: 10 } });
  expect(building(state, "b001")).toEqual({
    id: "b001", kind: "well", center: { x: 13, y: 10 }, mana: 0, link: null, name: "Well b001",
  });
  expect(game.glyphAt(state, 8, 8)).toBe("b");
  state = type(state, "Foo");
  state = key(state, "Enter");
  observation = game.observe(state);
  expect({ mode: observation.mode, draft: observation.commandBuffer, nameTarget: observation.nameTarget })
    .toEqual({ mode: "Normal", draft: "", nameTarget: null });
  expect(building(state, "b001")?.name).toBe("Foo");

  state = key(state, "2");
  state = key(state, "4");
  state = key(state, "l");
  expect(game.observe(state).cursor).toEqual({ x: 37, y: 10 });
  state = key(state, "i");
  expect(game.observe(game.dispatch(state, { type: "elapsed", ms: 250 })).mode).toBe("Insert");
  state = type(state, "summoning");
  expect(game.observe(state).candidates).toEqual(["summoning ring"]);
  state = key(state, "Tab");
  state = key(state, "Enter");
  state = type(state, "Guard");
  state = key(state, "Enter");
  observation = game.observe(state);
  expect(observation.buildings).toEqual([
    { id: "b001", kind: "well", center: { x: 13, y: 10 }, mana: 0, link: null, name: "Foo" },
    { id: "b002", kind: "ring", center: { x: 37, y: 10 }, mana: 0, produced: 0, living: 0, name: "Guard" },
  ]);
  expect(observation.cursor).toEqual({ x: 37, y: 10 });
});

test("empty or escaped names keep the default while Enter trims and limits custom names", () => {
  let state = key(game.initial({ rules: "survival" }), "i");
  state = type(state, "mana well");
  state = key(state, "Enter");
  state = key(state, "Enter");
  expect(building(state, "b001")?.name).toBe("Well b001");
  expect(game.observe(state).mode).toBe("Normal");

  state = key(game.initial({ rules: "survival" }), "i");
  state = type(state, "summoning ring");
  state = key(state, "Enter");
  state = type(state, "  Foo Bar  ");
  state = key(state, "Enter");
  expect(building(state, "b001")?.name).toBe("Foo Bar");

  state = key(game.initial({ rules: "survival" }), "i");
  state = type(state, "mana well");
  state = key(state, "Enter");
  state = type(state, "Draft!");
  expect(game.observe(state).commandBuffer).toBe("Draft");
  state = key(state, "Escape");
  expect(building(state, "b001")?.name).toBe("Well b001");
  expect(game.observe(state).buildingCount).toBe(1);

  state = key(game.initial({ rules: "survival" }), "i");
  state = type(state, "mana well");
  state = key(state, "Enter");
  state = type(state, "abcdefghijklmnopqrstuvwxyz");
  expect(game.observe(state).commandBuffer).toBe("abcdefghijklmnopqrst");
  state = blur(state);
  expect(building(state, "b001")?.name).toBe("Well b001");
  expect(game.observe(state).nameTarget).toBeNull();
  expect(game.observe(state).commandBuffer).toBe("");
});

test("names are not unique, stay in observations and survive snapshot round-trips", () => {
  let state = key(game.initial({ rules: "survival" }), "i");
  state = type(state, "mana well");
  state = key(state, "Enter");
  state = type(state, "Same");
  state = key(state, "Enter");
  state = key(state, "2");
  state = key(state, "4");
  state = key(state, "l");
  state = key(state, "i");
  state = type(state, "summoning ring");
  state = key(state, "Enter");
  state = type(state, "Same");
  state = key(state, "Enter");
  expect(game.observe(state).buildings.map(candidate => candidate.name)).toEqual(["Same", "Same"]);

  const snapshot = game.snapshot(state);
  expect(snapshot.buildings).toEqual([
    { id: "b001", kind: "well", center: { x: 13, y: 10 }, mana: 0, link: null, name: "Same" },
    { id: "b002", kind: "ring", center: { x: 37, y: 10 }, mana: 0, produced: 0, name: "Same" },
  ]);
  const roundtrip = game.scenario(snapshot);
  expect({ ...game.observe(roundtrip), notice: "" }).toEqual({ ...game.observe(state), notice: "" });
  expect(game.snapshot(roundtrip)).toEqual(snapshot);
});

test("scenario names validate and survive observations while blank names take the default", () => {
  const named = game.scenario({
    rules: "survival",
    buildings: [
      { id: "b001", kind: "well", center: { x: 13, y: 10 }, name: "Pump_1-west" },
      { id: "b002", kind: "ring", center: { x: 37, y: 10 }, name: "   " },
    ],
  });
  expect(game.observe(named).buildings.map(candidate => candidate.name)).toEqual(["Pump_1-west", "Ring b002"]);
  expect(game.snapshot(named).buildings?.map(candidate => "name" in candidate ? candidate.name : undefined))
    .toEqual(["Pump_1-west", "Ring b002"]);
  for (const name of ["x".repeat(21), "é", "bang!", 7]) {
    expect(() => game.scenario({
      rules: "survival",
      buildings: [{ id: "b001", kind: "well", center: { x: 13, y: 10 }, name }],
    })).toThrow();
  }
});

test("construction rejects boundary, gate, overlap and cap at commit without allocating", () => {
  const boundary = game.scenario({ rules: "survival", cursor: { x: 3, y: 3 } });
  let state = key(boundary, "i");
  state = type(state, "mana well");
  state = key(state, "Enter");
  let observation = game.observe(state);
  expect(observation.buildingCount).toBe(0);
  expect(observation.nameTarget).toBeNull();
  expect(observation.cursor).toEqual({ x: 3, y: 3 });
  expect(observation.notice).toContain("inside the world");

  const gate = game.scenario({ rules: "survival", cursor: { x: 194, y: 132 } });
  state = key(gate, "i");
  state = type(state, "summoning ring");
  state = key(state, "Enter");
  observation = game.observe(state);
  expect(observation.buildingCount).toBe(0);
  expect(observation.notice).toContain("enemy gate");

  const occupied = game.scenario({
    rules: "survival",
    cursor: { x: 13, y: 10 },
    buildings: [{ id: "b001", kind: "well", center: { x: 13, y: 10 } }],
  });
  state = key(occupied, "i");
  state = type(state, "summoning ring");
  state = key(state, "Enter");
  observation = game.observe(state);
  expect(observation.buildingCount).toBe(1);
  expect(building(state, "b001")?.kind).toBe("well");
  expect(observation.notice).toContain("overlaps b001");

  const full = game.scenario({
    rules: "survival",
    cursor: { x: 150, y: 100 },
    buildings: centres().map((center, index) => ({
      id: `b${String(index + 1).padStart(3, "0")}`,
      kind: "well" as const,
      center,
    })),
  });
  state = key(full, "i");
  state = type(state, "mana well");
  state = key(state, "Enter");
  observation = game.observe(state);
  expect(observation.buildingCount).toBe(MAX_BUILDINGS);
  expect(observation.notice).toContain(`${MAX_BUILDINGS}-building limit`);
});

test("rally sets the shared point anywhere valid and invalid commands leave it untouched", () => {
  let state = key(game.initial({ rules: "survival" }), "i");
  state = type(state, "rally");
  state = key(state, "Enter");
  let observation = game.observe(state);
  expect({
    mode: observation.mode,
    rally: observation.rally,
    buildings: observation.buildingCount,
    draft: observation.commandBuffer,
  }).toEqual({ mode: "Normal", rally: { x: 13, y: 10 }, buildings: 0, draft: "" });
  expect(observation.notice).toContain("13,10");

  const gate = game.scenario({ rules: "survival", cursor: GATE_CENTER, rally: { x: 50, y: 50 } });
  state = key(gate, "i");
  state = type(state, "rally");
  state = key(state, "Enter");
  observation = game.observe(state);
  expect(observation.rally).toEqual({ x: 50, y: 50 });
  expect(observation.mode).toBe("Normal");
  expect(observation.notice).toContain("enemy gate");

  const edge = game.scenario({ rules: "survival", cursor: { x: 0, y: 0 }, rally: { x: 50, y: 50 } });
  state = key(edge, "i");
  state = type(state, "rally");
  state = key(state, "Enter");
  expect(game.observe(state).rally).toEqual({ x: 50, y: 50 });

  const staged = game.scenario({
    rules: "survival",
    cursor: { x: 32, y: 8 },
    rally: { x: 50, y: 50 },
    pendingSource: "b001",
    buildings: [
      { id: "b001", kind: "well", center: { x: 13, y: 10 } },
      { id: "b002", kind: "ring", center: { x: 37, y: 10 } },
    ],
  });
  state = key(staged, "i");
  state = type(state, "rally");
  state = key(state, "Enter");
  observation = game.observe(state);
  expect(observation.rally).toEqual({ x: 32, y: 8 });
  expect(observation.pendingSource).toBe("b001");
  expect(observation.buildings).toEqual(game.observe(staged).buildings);

  state = key(staged, "i");
  state = type(state, "r");
  state = key(state, "Escape");
  expect(game.observe(state).rally).toEqual({ x: 50, y: 50 });
  state = key(staged, "i");
  state = type(state, "nope");
  state = key(state, "Enter");
  observation = game.observe(state);
  expect(observation.rally).toEqual({ x: 50, y: 50 });
  expect(observation.notice).toContain("Unknown command");
});

test("typed connect stages a well, links a ring and clears the source only on success", () => {
  const setup = {
    rules: "survival" as const,
    cursor: { x: 13, y: 10 },
    buildings: [
      { id: "b001", kind: "well" as const, center: { x: 13, y: 10 }, mana: 400 },
      { id: "b002", kind: "ring" as const, center: { x: 37, y: 10 }, mana: 300 },
      { id: "b003", kind: "ring" as const, center: { x: 61, y: 10 }, mana: 200 },
    ],
  };
  let state = key(game.scenario(setup), "i");
  state = type(state, "connect");
  state = key(state, "Escape");
  expect(game.observe(state).pendingSource).toBeNull();

  state = key(game.scenario(setup), "i");
  state = type(state, "connect");
  state = key(state, "Enter");
  let observation = game.observe(state);
  expect({ mode: observation.mode, source: observation.pendingSource, draft: observation.commandBuffer })
    .toEqual({ mode: "Normal", source: "b001", draft: "" });

  state = key(state, "2");
  state = key(state, "4");
  state = key(state, "l");
  state = key(state, "i");
  state = type(state, "connect");
  state = key(state, "Enter");
  observation = game.observe(state);
  expect({ mode: observation.mode, source: observation.pendingSource })
    .toEqual({ mode: "Normal", source: null });
  expect(building(state, "b001")).toEqual({
    id: "b001", kind: "well", center: { x: 13, y: 10 }, mana: 400, link: "b002", name: "Well b001",
  });
  expect(observation.links).toEqual([
    { source: "b001", target: "b002", from: { x: 13, y: 10 }, to: { x: 37, y: 10 } },
  ]);

  const noSource = game.scenario({ ...setup, cursor: { x: 37, y: 10 } });
  state = key(noSource, "i");
  state = type(state, "connect");
  state = key(state, "Enter");
  observation = game.observe(state);
  expect(observation.pendingSource).toBeNull();
  expect(observation.links).toEqual([]);
  expect(observation.notice).toContain("No source");

  const staged = game.scenario({ ...setup, pendingSource: "b001" });
  state = key(staged, "i");
  state = type(state, "con");
  state = key(state, "Escape");
  expect(game.observe(state).pendingSource).toBe("b001");

  state = key(game.scenario({ ...setup, pendingSource: "b001" }), "i");
  state = type(state, "connect");
  state = key(state, "Enter");
  state = key(state, "4");
  state = key(state, "8");
  state = key(state, "l");
  state = key(state, "i");
  state = type(state, "connect");
  state = key(state, "Enter");
  observation = game.observe(state);
  expect(observation.pendingSource).toBeNull();
  const well = building(state, "b001");
  expect(well?.kind === "well" ? well.link : null).toBe("b003");
  expect(observation.links.map(link => `${link.source}>${link.target}`)).toEqual(["b001>b003"]);
});

test("time advances through Insert and Name while drafts survive, and blur cancels source", () => {
  let state = key(game.initial({ rules: "survival" }), "i");
  state = type(state, "mana");
  state = game.dispatch(state, { type: "elapsed", ms: 250 });
  let observation = game.observe(state);
  expect({ mode: observation.mode, draft: observation.commandBuffer, ticks: observation.elapsedTicks })
    .toEqual({ mode: "Insert", draft: "mana", ticks: 2 });
  state = key(state, "Tab");
  state = key(state, "Enter");
  state = type(state, "Fo");
  state = game.dispatch(state, { type: "elapsed", ms: 150 });
  observation = game.observe(state);
  expect({ mode: observation.mode, draft: observation.commandBuffer, ticks: observation.elapsedTicks })
    .toEqual({ mode: "Name", draft: "Fo", ticks: 4 });
  state = key(state, "Enter");
  expect(building(state, "b001")?.name).toBe("Fo");

  const staged = game.scenario({
    rules: "survival",
    pendingSource: "b001",
    buildings: [{ id: "b001", kind: "well", center: { x: 13, y: 10 } }],
  });
  state = key(staged, "i");
  state = type(state, "connect");
  state = blur(state);
  observation = game.observe(state);
  expect({
    mode: observation.mode,
    source: observation.pendingSource,
    draft: observation.commandBuffer,
    insertCell: observation.insertCell,
    nameTarget: observation.nameTarget,
  }).toEqual({ mode: "Normal", source: null, draft: "", insertCell: null, nameTarget: null });
  expect(observation.rally).toEqual(DEFAULT_RALLY);

  state = key(staged, "i");
  state = game.dispatch(state, { type: "visibility", hidden: true });
  observation = game.observe(state);
  expect({ mode: observation.mode, source: observation.pendingSource, suspended: observation.suspended })
    .toEqual({ mode: "Normal", source: null, suspended: true });
});

test("survival Space f opens the finder while the legacy Build and Escape staging still run", () => {
  let survival = key(game.initial({ rules: "survival" }), " ");
  survival = key(survival, "f");
  let observation = game.observe(survival);
  expect({
    mode: observation.mode,
    buildings: observation.buildingCount,
    finder: observation.finder?.entries.map(entry => entry.id),
  }).toEqual({ mode: "Finder", buildings: 0, finder: ["gate", "rally"] });

  let legacy = game.scenario({ rules: "first-playable", cursor: { x: 13, y: 10 } });
  legacy = key(legacy, " ");
  legacy = key(legacy, "f");
  expect(game.observe(legacy).mode).toBe("Build");
  legacy = key(legacy, "r");
  legacy = key(legacy, "Enter");
  expect(game.observe(legacy).sites.a01).toEqual({ kind: "ring", mana: 0, produced: 0 });

  let staged = game.build(game.scenario({ rules: "first-playable", cursor: { x: 13, y: 10 } }), "a01", "well");
  staged = key(staged, "i");
  staged = type(staged, "connect");
  staged = key(staged, "Escape");
  observation = game.observe(staged);
  expect({ mode: observation.mode, source: observation.pendingSource })
    .toEqual({ mode: "Normal", source: "a01" });
});
