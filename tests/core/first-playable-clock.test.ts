import { expect, test } from "bun:test";
import { ElapsedClock } from "../../src/web/clock";

test("the frame clock starts from a baseline without emitting elapsed time", () => {
  const clock = new ElapsedClock();
  expect(clock.consume(10)).toBe(0);
  expect(clock.consume(10.5)).toBe(0);
  expect(clock.consume(11)).toBe(1);
  expect(clock.consume(12.1)).toBe(1);
});

test("the frame clock carries sub-millisecond fractions across frames", () => {
  const clock = new ElapsedClock(0);
  let emitted = 0;
  for (const timestamp of [0.3, 0.6, 1.1, 1.9, 2.4, 3.8]) emitted += clock.consume(timestamp);
  expect(emitted).toBe(3);
});

test("backwards or non-finite timestamps never produce negative elapsed time", () => {
  const clock = new ElapsedClock(100);
  expect(clock.consume(90)).toBe(0);
  expect(clock.consume(Number.NaN)).toBe(0);
  expect(clock.consume(Number.POSITIVE_INFINITY)).toBe(0);
  expect(clock.consume(101)).toBe(11);
});

test("reset discards the previous timestamp and any fractional carry", () => {
  const clock = new ElapsedClock(0);
  expect(clock.consume(0.9)).toBe(0);
  clock.reset();
  expect(clock.consume(1000)).toBe(0);
  expect(clock.consume(1000.9)).toBe(0);
  clock.reset(2000);
  expect(clock.consume(2500)).toBe(500);
});
