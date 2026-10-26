import { expect, test } from "bun:test";
import { find, model } from "../../src/core/navigation";

const huge = [BigInt(Number.MAX_SAFE_INTEGER) + 1n, 2n ** 64n, 10n ** 30n];
const positions = [0, 2, 4, 39, 40, 41, 400, 799];

test("forward find selects the exact nth strict hit on the current row", () => {
  const field = model.field("abacad".padEnd(40) + "za".padEnd(40));
  const expected = new Map<number, number>([
    [1, 2],
    [2, 4],
    [3, 0],
  ]);
  for (const [n, destination] of expected) {
    expect(find.findMove(field, 0, "a", true, BigInt(n))).toBe(destination);
  }
  expect(find.findMove(field, 2, "a", true, 1n)).toBe(4);
  expect(find.findMove(field, 2, "a", true, 2n)).toBe(2);
  expect(find.findMove(field, 4, "a", true, 1n)).toBe(4);
  expect(find.findMove(field, 40, "a", true, 1n)).toBe(41);
  expect(find.findMove(field, 41, "a", true, 1n)).toBe(41);
  expect(find.findMove(field, 5, "a", true, 1n)).toBe(5);
  expect(find.findMove(field, 39, "a", true, 1n)).toBe(39);
  expect(find.findMove(field, 0, "z", true, 1n)).toBe(0);
  expect(find.findMove(field, 40, "z", true, 1n)).toBe(40);
});

test("backward find selects the exact nth strict hit on the current row", () => {
  const field = model.field("abacad".padEnd(40) + "za".padEnd(40));
  const expected = new Map<number, number>([
    [1, 2],
    [2, 0],
    [3, 4],
  ]);
  for (const [n, destination] of expected) {
    expect(find.findMove(field, 4, "a", false, BigInt(n))).toBe(destination);
  }
  expect(find.findMove(field, 2, "a", false, 1n)).toBe(0);
  expect(find.findMove(field, 2, "a", false, 2n)).toBe(2);
  expect(find.findMove(field, 0, "a", false, 1n)).toBe(0);
  expect(find.findMove(field, 41, "a", false, 1n)).toBe(41);
  expect(find.findMove(field, 40, "a", false, 1n)).toBe(40);
  expect(find.findMove(field, 5, "a", false, 1n)).toBe(4);
  expect(find.findMove(field, 5, "a", false, 2n)).toBe(2);
  expect(find.findMove(field, 5, "a", false, 3n)).toBe(0);
  expect(find.findMove(field, 5, "a", false, 4n)).toBe(5);
  expect(find.findMove(field, 41, "z", false, 1n)).toBe(40);
  expect(find.findMove(field, 41, "z", false, 2n)).toBe(41);
});

test("row boundaries split runs and adjacent rows are never searched", () => {
  const run = model.field("a".repeat(80));
  expect(find.findMove(run, 0, "a", true, 39n)).toBe(39);
  expect(find.findMove(run, 0, "a", true, 40n)).toBe(0);
  expect(find.findMove(run, 39, "a", true, 1n)).toBe(39);
  expect(find.findMove(run, 40, "a", true, 1n)).toBe(41);
  expect(find.findMove(run, 40, "a", true, 39n)).toBe(79);
  expect(find.findMove(run, 40, "a", true, 40n)).toBe(40);
  expect(find.findMove(run, 40, "a", false, 1n)).toBe(40);
  expect(find.findMove(run, 41, "a", false, 1n)).toBe(40);
  expect(find.findMove(run, 41, "a", false, 2n)).toBe(41);
  expect(find.findMove(run, 79, "a", false, 39n)).toBe(40);
  expect(find.findMove(run, 79, "a", false, 40n)).toBe(79);
});

test("zero, missing and insufficient ranks preserve the original position", () => {
  const fields = [
    model.field("abacad".padEnd(40) + "za".padEnd(40)),
    model.field("ab ac ".padEnd(40)),
    model.field("a".repeat(80)),
  ];
  for (const field of fields) {
    for (const position of positions) {
      for (const right of [true, false]) {
        for (const target of ["a", " ", "x", "z"]) {
          expect(find.findMove(field, position, target, right, 0n)).toBe(position);
        }
        for (const count of [1n, 2n, 41n, ...huge]) {
          expect(find.findMove(field, position, "q", right, count)).toBe(position);
        }
      }
    }
  }

  const repeated = fields[0]!;
  expect(find.findMove(repeated, 0, "a", true, 3n)).toBe(0);
  expect(find.findMove(repeated, 4, "a", false, 3n)).toBe(4);

  const spaced = model.field("ab ac ".padEnd(40));
  expect(find.findMove(spaced, 0, " ", true, 36n)).toBe(39);
  expect(find.findMove(spaced, 0, " ", true, 37n)).toBe(0);
});

test("the current cell is never counted as a hit", () => {
  const field = model.field("aaa".padEnd(40));
  expect(find.findMove(field, 1, "a", true, 1n)).toBe(2);
  expect(find.findMove(field, 1, "a", true, 2n)).toBe(1);
  expect(find.findMove(field, 1, "a", false, 1n)).toBe(0);
  expect(find.findMove(field, 1, "a", false, 2n)).toBe(1);
});

test("spaces are literal targets and huge ranks remain row-local and bounded", () => {
  const spaced = model.field("ab ac ".padEnd(40));
  const spacedRight = new Map<number, number>([
    [1, 2],
    [2, 5],
    [3, 6],
    [36, 39],
    [37, 0],
  ]);
  for (const [n, destination] of spacedRight) {
    expect(find.findMove(spaced, 0, " ", true, BigInt(n))).toBe(destination);
  }
  const spacedLeft = new Map<number, number>([
    [1, 38],
    [2, 37],
    [35, 2],
    [36, 39],
  ]);
  for (const [n, destination] of spacedLeft) {
    expect(find.findMove(spaced, 39, " ", false, BigInt(n))).toBe(destination);
  }
  expect(find.findMove(spaced, 3, " ", true, 1n)).toBe(5);
  expect(find.findMove(spaced, 3, " ", true, 2n)).toBe(6);
  expect(find.findMove(spaced, 4, " ", false, 1n)).toBe(2);
  expect(find.findMove(spaced, 4, " ", false, 2n)).toBe(4);

  const run = model.field("a".repeat(80));
  for (const count of huge) {
    expect(find.findMove(run, 0, "a", true, count)).toBe(0);
    expect(find.findMove(run, 79, "a", false, count)).toBe(79);
    expect(find.findMove(spaced, 0, " ", true, count)).toBe(0);
    expect(find.findMove(spaced, 39, " ", false, count)).toBe(39);
  }
});

test("every find destination stays inside the field", () => {
  const fields = [
    model.field("abacad".padEnd(40) + "za".padEnd(40)),
    model.field("ab ac ".padEnd(40)),
    model.field("a".repeat(80)),
    model.field(" ".repeat(800)),
  ];
  for (const field of fields) {
    for (const position of positions) {
      for (const right of [true, false]) {
        for (const target of ["a", " ", "x", "Z"]) {
          for (const count of [0n, 1n, 2n, 41n, ...huge]) {
            const destination = find.findMove(field, position, target, right, count);
            expect(Number.isInteger(destination)).toBe(true);
            expect(destination).toBeGreaterThanOrEqual(0);
            expect(destination).toBeLessThan(800);
          }
        }
      }
    }
  }
});
