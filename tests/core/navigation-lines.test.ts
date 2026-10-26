import { expect, test } from "bun:test";
import type { LineMotion } from "../../src/core/navigation";
import { lines, model } from "../../src/core/navigation";

const motions: LineMotion[] = ["zero", "indent", "end", "first", "last"];
const finite = [0n, 1n, 2n, 3n, 4n, 5n, 20n];
const huge = [BigInt(Number.MAX_SAFE_INTEGER) + 1n, 2n ** 64n, 10n ** 30n];

const field = model.field(
  "  alpha".padEnd(40) +
    "    ".padEnd(40) +
    " gamma".padEnd(40) +
    "delta".padEnd(40),
);

test("zero returns column zero of the current row and ignores the count", () => {
  for (const position of [0, 17, 39, 45, 81, 400, 799]) {
    const expected = position - (position % 40);
    for (const count of [...finite, ...huge]) {
      expect(lines.lineMove(field, position, "zero", count)).toBe(expected);
    }
  }
});

test("indent selects the first nonblank cell, falling back to column zero on blank rows", () => {
  const expected = new Map([
    [0, 2],
    [2, 2],
    [39, 2],
    [40, 40],
    [79, 40],
    [80, 81],
    [120, 120],
    [160, 160],
    [799, 760],
  ]);
  for (const [position, destination] of expected) {
    for (const count of [...finite, ...huge]) {
      expect(lines.lineMove(field, position, "indent", count)).toBe(destination);
    }
  }
});

test("end selects column 39 of the default, counted or clamped target row", () => {
  const rowEnd = (row: number) => row * 40 + 39;
  const targets = new Map([
    [0n, rowEnd(0)],
    [1n, rowEnd(0)],
    [2n, rowEnd(1)],
    [3n, rowEnd(2)],
    [4n, rowEnd(3)],
    [5n, rowEnd(4)],
    [20n, rowEnd(19)],
  ]);
  for (const [count, destination] of targets) {
    expect(lines.lineMove(field, 0, "end", count)).toBe(destination);
  }
  expect(lines.lineMove(field, 40, "end", 2n)).toBe(rowEnd(2));
  expect(lines.lineMove(field, 799, "end", 2n)).toBe(rowEnd(19));
  for (const count of huge) expect(lines.lineMove(field, 0, "end", count)).toBe(rowEnd(19));
});

test("first selects the first nonblank cell of the explicit or default first row", () => {
  const targets = new Map([
    [0n, 2],
    [1n, 2],
    [2n, 40],
    [3n, 81],
    [4n, 120],
    [5n, 160],
    [20n, 760],
  ]);
  for (const [count, destination] of targets) {
    expect(lines.lineMove(field, 799, "first", count)).toBe(destination);
  }
  expect(lines.lineMove(field, 0, "first", 3n)).toBe(81);
  for (const count of huge) expect(lines.lineMove(field, 0, "first", count)).toBe(760);
});

test("last selects the first nonblank cell of the explicit or default last row", () => {
  const targets = new Map([
    [0n, 760],
    [1n, 2],
    [2n, 40],
    [3n, 81],
    [4n, 120],
    [5n, 160],
    [20n, 760],
  ]);
  for (const [count, destination] of targets) {
    expect(lines.lineMove(field, 0, "last", count)).toBe(destination);
  }
  expect(lines.lineMove(field, 799, "last", 2n)).toBe(40);
  for (const count of huge) expect(lines.lineMove(field, 0, "last", count)).toBe(760);
});

test("every line destination stays inside the padded field", () => {
  const filled = model.field("a".repeat(800));
  for (const candidate of [field, filled]) {
    for (const position of [0, 1, 38, 39, 40, 79, 400, 799]) {
      for (const motion of motions) {
        for (const count of [...finite, ...huge]) {
          const destination = lines.lineMove(candidate, position, motion, count);
          expect(Number.isInteger(destination)).toBe(true);
          expect(destination).toBeGreaterThanOrEqual(0);
          expect(destination).toBeLessThan(800);
        }
      }
    }
  }
  const filledFirst = new Map([
    [0n, 0],
    [1n, 0],
    [2n, 40],
    [20n, 760],
    [10n ** 30n, 760],
  ]);
  const filledLast = new Map([
    [0n, 760],
    [1n, 0],
    [2n, 40],
    [20n, 760],
    [10n ** 30n, 760],
  ]);
  for (const [count, destination] of filledFirst) {
    expect(lines.lineMove(filled, 0, "first", count)).toBe(destination);
  }
  for (const [count, destination] of filledLast) {
    expect(lines.lineMove(filled, 0, "last", count)).toBe(destination);
  }
});
