import { expect, test } from "bun:test";
import type { Mode } from "../../src/core/navigation";
import { model } from "../../src/core/navigation";

test("field normalizes arbitrary code points, pads and truncates on code points", () => {
  const field = model.field(" A😀\tB\nC");
  expect(model.contents(field)).toBe(" A  B C".padEnd(800, " "));
  expect(model.at(field, 0n)).toBe(" ");
  expect(model.at(field, 1n)).toBe("A");
  expect(model.at(field, 2n)).toBe(" ");
  expect(model.at(field, 4n)).toBe("B");
  expect(model.at(field, 6n)).toBe("C");
  expect(model.contents(field).length).toBe(800);

  const astral = model.field("a😀".repeat(800));
  expect(model.contents(astral)).toBe("a ".repeat(400));
  expect(model.at(astral, 0n)).toBe("a");
  expect(model.at(astral, 1n)).toBe(" ");
  expect(model.at(astral, 798n)).toBe("a");
  expect(model.at(astral, 799n)).toBe(" ");
});

test("at observes only inside cells and returns space outside the field", () => {
  const field = model.field("x");
  expect(model.at(field, 0n)).toBe("x");
  expect(model.at(field, 799n)).toBe(" ");
  expect(model.at(field, 800n)).toBe(" ");
  expect(model.at(field, 10n ** 30n)).toBe(" ");
});

test("pack and view roundtrip arbitrary text and every grammar state", () => {
  const texts = [
    "",
    " ",
    "a..b_9  x x",
    "é😀\u0000\t~\u007f",
    "word ".repeat(400),
  ];
  const modes: Mode[] = [
    { $: "Normal", count: 0 },
    { $: "Normal", count: 9999 },
    { $: "FindRight", count: 1 },
    { $: "FindLeft", count: 41 },
    { $: "Go", count: 0 },
  ];
  for (const text of texts) {
    const field = model.field(text);
    for (const position of [0, 1, 39, 40, 399, 799]) {
      for (const mode of modes) {
        const view = { field, position, mode };
        expect(model.view(model.pack(view))).toEqual(view);
      }
    }
  }
});

test("initial observes the literal seed and a valid normal snapshot", () => {
  const view = model.view(model.initial());
  expect(view.position).toBe(0);
  expect(view.mode).toEqual({ $: "Normal", count: 0 });
  expect(model.contents(view.field).length).toBe(800);
  expect(model.contents(view.field).slice(0, 40)).toBe(
    'alpha beta  foo_bar ++ 42 "quote"       ',
  );
  expect(model.contents(view.field).slice(40, 80)).toBe(
    "  scout.move(x);  wall## gate  x x      ",
  );
  expect(model.contents(view.field).slice(80, 120)).toBe(" ".repeat(40));
  expect(model.contents(view.field).slice(120, 160)).toBe(
    "ore_7  unit-2  { north south }  x  END  ",
  );
  expect(model.contents(view.field).slice(160)).toBe(" ".repeat(640));
});
