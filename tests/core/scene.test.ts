import { expect, test } from "bun:test";
import Scene from "../../src/core/scene";

test("baseline is the same 40 by 20 bordered glyph field", () => {
  expect(Scene.columns()).toBe(40);
  expect(Scene.rows()).toBe(20);
  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < 40; col++) {
      const border = col === 0 || col === 39 || row === 0 || row === 19;
      expect(Scene.glyph(Scene.cell(col, row))).toBe(border ? "#" : ".");
    }
  }
});
