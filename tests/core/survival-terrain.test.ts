import { expect, test } from "bun:test";
import { game } from "../../src/core/game";
import {
  CELL_WIDTH,
  GUTTER_COLUMNS,
  GUTTER_WIDTH,
  gutterLabel,
  visibleCells,
} from "../../src/web/camera";

test("survival clusters are deterministic and skip the gate reservation", () => {
  const state = game.initial({ rules: "survival" });
  for (let c = 0; c < 10; c++) {
    for (let r = 0; r < 10; r++) {
      const x = 8 + 24 * c;
      const y = 8 + 16 * r;
      if (c === 8 && r === 8) {
        expect(game.glyphAt(state, x + 2, y)).toBe(" ");
        expect(game.glyphAt(state, x + 2, y + 1)).toBe(" ");
        continue;
      }
      const even = (c + r) % 2 === 0;
      expect([0, 1, 2].map(dx => game.glyphAt(state, x + dx, y)))
        .toEqual(even ? ["^", "^", "^"] : ["o", "o", " "]);
      expect(game.glyphAt(state, x + 1, y + 1)).toBe(even ? "^" : "o");
      expect(game.glyphAt(state, x, y + 1)).toBe(" ");
      expect(game.glyphAt(state, x + 2, y + 1)).toBe(" ");
    }
  }
  expect(game.field(state).text.includes(".")).toBe(false);
});

test("landmarks survive as real glyphs while blank ground stays whitespace", () => {
  const state = game.scenario({ rules: "survival", cursor: { x: 11, y: 8 } });
  expect(game.glyphAt(state, 11, 8)).toBe(" ");
  expect(game.observe(game.dispatch(state, { type: "key", key: "b" })).cursor)
    .toEqual({ x: 8, y: 8 });

  const finder = game.scenario({ rules: "survival", cursor: { x: 7, y: 8 } });
  const finding = game.dispatch(finder, { type: "key", key: "f" });
  expect(game.observe(finding).mode).toBe("FindRight");
  expect(game.observe(game.dispatch(finding, { type: "key", key: "^" })).cursor)
    .toEqual({ x: 8, y: 8 });
});

test("buildings clear landmark glyphs only inside their footprint", () => {
  const state = game.initial({ rules: "survival" });
  const built = game.place(state, { x: 13, y: 10 }, "well");
  expect(built).not.toBe(state);
  expect(game.glyphAt(built, 8, 8)).not.toBe("^");
  expect(game.glyphAt(built, 32, 8)).toBe("o");
  expect(game.glyphAt(built, 33, 9)).toBe("o");
});

test("the gutter removes four whole cells before viewport and camera math", () => {
  expect(GUTTER_COLUMNS).toBe(4);
  expect(GUTTER_WIDTH).toBe(4 * CELL_WIDTH);
  expect(visibleCells(800, 568, GUTTER_WIDTH)).toEqual({ columns: 62, rows: 28 });
  expect(visibleCells(1000, 668, GUTTER_WIDTH)).toEqual({ columns: 79, rows: 33 });
  expect(visibleCells(48, 28, GUTTER_WIDTH)).toEqual({ columns: 1, rows: 1 });
  expect(visibleCells(40, 28, GUTTER_WIDTH)).toEqual({ columns: 1, rows: 1 });
  expect(visibleCells(0, 0, GUTTER_WIDTH)).toEqual({ columns: 1, rows: 1 });
  expect(visibleCells(800, 568)).toEqual({ columns: 66, rows: 28 });
});

test("gutter labels show the absolute row at the cursor and distance elsewhere", () => {
  expect(gutterLabel(10, 10)).toBe("11");
  expect(gutterLabel(9, 10)).toBe("1");
  expect(gutterLabel(11, 10)).toBe("1");
  expect(gutterLabel(8, 10)).toBe("2");
  expect(gutterLabel(12, 10)).toBe("2");
  expect(gutterLabel(0, 159)).toBe("159");
  expect(gutterLabel(159, 159)).toBe("160");
});

test("seven rows move seven world rows with the gutter in place", () => {
  let state = game.initial({ rules: "survival" });
  for (const key of ["7", "j"]) state = game.dispatch(state, { type: "key", key });
  expect(game.observe(state).cursor).toEqual({ x: 13, y: 17 });
});
