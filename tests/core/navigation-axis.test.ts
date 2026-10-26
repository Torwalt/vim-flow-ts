import { expect, test } from "bun:test";
import type { Direction } from "../../src/core/navigation";
import { axis } from "../../src/core/navigation";

const directions: Direction[] = ["left", "right", "up", "down"];

test("a zero count is the identity at row starts, row ends and interior cells", () => {
  const positions = [0, 1, 13, 38, 39, 40, 55, 79, 80, 400, 778, 799];
  for (const position of positions) {
    for (const direction of directions) {
      expect(axis.axisMove(position, direction, 0n)).toBe(position);
    }
  }
});

test("left and right stop at their row edge without crossing into another row", () => {
  expect(axis.axisMove(13, "left", 12n)).toBe(1);
  expect(axis.axisMove(13, "left", 13n)).toBe(0);
  expect(axis.axisMove(13, "left", 14n)).toBe(0);
  expect(axis.axisMove(55, "left", 20n)).toBe(40);
  expect(axis.axisMove(79, "left", 40n)).toBe(40);
  expect(axis.axisMove(55, "left", 10n ** 30n)).toBe(40);

  expect(axis.axisMove(26, "right", 12n)).toBe(38);
  expect(axis.axisMove(26, "right", 13n)).toBe(39);
  expect(axis.axisMove(26, "right", 14n)).toBe(39);
  expect(axis.axisMove(0, "right", 39n)).toBe(39);
  expect(axis.axisMove(0, "right", 40n)).toBe(39);
  expect(axis.axisMove(55, "right", 10n ** 30n)).toBe(79);
});

test("up and down stop at the first and last row without changing the column", () => {
  expect(axis.axisMove(55, "up", 1n)).toBe(15);
  expect(axis.axisMove(55, "up", 2n)).toBe(15);
  expect(axis.axisMove(5, "up", 1n)).toBe(5);
  expect(axis.axisMove(799, "up", 19n)).toBe(39);
  expect(axis.axisMove(799, "up", 20n)).toBe(39);
  expect(axis.axisMove(405, "up", 10n ** 30n)).toBe(5);

  expect(axis.axisMove(15, "down", 1n)).toBe(55);
  expect(axis.axisMove(15, "down", 18n)).toBe(735);
  expect(axis.axisMove(15, "down", 19n)).toBe(775);
  expect(axis.axisMove(15, "down", 20n)).toBe(775);
  expect(axis.axisMove(595, "down", 10n ** 30n)).toBe(795);
  expect(axis.axisMove(799, "down", 1n)).toBe(799);
});

test("counts above Number.MAX_SAFE_INTEGER saturate exactly like smaller overflowing counts", () => {
  const huge = [
    BigInt(Number.MAX_SAFE_INTEGER) + 1n,
    BigInt(Number.MAX_SAFE_INTEGER) + 2n,
    2n ** 64n,
    10n ** 100n,
  ];
  for (const count of huge) {
    expect(axis.axisMove(405, "left", count)).toBe(400);
    expect(axis.axisMove(405, "right", count)).toBe(439);
    expect(axis.axisMove(405, "up", count)).toBe(5);
    expect(axis.axisMove(405, "down", count)).toBe(765);
    expect(axis.axisMove(0, "left", count)).toBe(0);
    expect(axis.axisMove(799, "down", count)).toBe(799);
  }
});

test("horizontal moves keep the row and vertical moves keep the column", () => {
  const counts = [0n, 1n, 2n, 7n, 38n, 39n, 40n, 41n, 10n ** 30n];
  for (let position = 0; position < 800; position++) {
    for (const count of counts) {
      const left = axis.axisMove(position, "left", count);
      const right = axis.axisMove(position, "right", count);
      const up = axis.axisMove(position, "up", count);
      const down = axis.axisMove(position, "down", count);
      expect(Math.floor(left / 40)).toBe(Math.floor(position / 40));
      expect(Math.floor(right / 40)).toBe(Math.floor(position / 40));
      expect(up % 40).toBe(position % 40);
      expect(down % 40).toBe(position % 40);
      for (const destination of [left, right, up, down]) {
        expect(Number.isInteger(destination)).toBe(true);
        expect(destination).toBeGreaterThanOrEqual(0);
        expect(destination).toBeLessThan(800);
      }
    }
  }
});
