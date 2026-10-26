import { expect, test } from "bun:test";
import type { WordMotion } from "../../src/core/navigation";
import { model, words } from "../../src/core/navigation";

const motions: WordMotion[] = ["forward", "backward", "end"];
const writings = [false, true];

test("small words advance to start and end run boundaries", () => {
  const field = model.field("one two three");
  const forward = [4, 8, 799, 799, 799, 799];
  const backward = [8, 4, 0, 0, 0, 0];
  const end = [2, 6, 12, 799, 799, 799];
  for (let n = 1; n <= forward.length; n++) {
    const count = BigInt(n);
    expect(words.wordMove(field, 0, "forward", false, count)).toBe(forward[n - 1]!);
    expect(words.wordMove(field, 12, "backward", false, count)).toBe(backward[n - 1]!);
    expect(words.wordMove(field, 0, "end", false, count)).toBe(end[n - 1]!);
  }
});

test("punctuation is its own small-word run and a single WORD", () => {
  const field = model.field("foo.bar!! baz");
  const starts = [3, 4, 7, 10, 799, 799];
  const ends = [2, 3, 6, 8, 12, 799];
  const backStarts = [10, 7, 4, 3, 0, 0];
  const bigStarts = [10, 799];
  const bigEnds = [8, 12, 799];
  const bigBackStarts = [10, 0, 0];
  for (let n = 1; n <= starts.length; n++) {
    const count = BigInt(n);
    expect(words.wordMove(field, 0, "forward", false, count)).toBe(starts[n - 1]!);
    expect(words.wordMove(field, 0, "end", false, count)).toBe(ends[n - 1]!);
    expect(words.wordMove(field, 12, "backward", false, count)).toBe(backStarts[n - 1]!);
  }
  for (let n = 1; n <= bigStarts.length; n++) {
    const count = BigInt(n);
    expect(words.wordMove(field, 0, "forward", true, count)).toBe(bigStarts[n - 1]!);
    expect(words.wordMove(field, 12, "backward", true, count)).toBe(bigBackStarts[n - 1]!);
  }
  for (let n = 1; n <= bigEnds.length; n++) {
    expect(words.wordMove(field, 0, "end", true, BigInt(n))).toBe(bigEnds[n - 1]!);
  }
});

test("row boundaries split runs even when the text is one continuous run", () => {
  const field = model.field("a".repeat(80));
  expect(words.wordMove(field, 0, "forward", false, 1n)).toBe(40);
  expect(words.wordMove(field, 0, "forward", false, 2n)).toBe(799);
  expect(words.wordMove(field, 0, "forward", true, 1n)).toBe(40);
  expect(words.wordMove(field, 0, "end", false, 1n)).toBe(39);
  expect(words.wordMove(field, 0, "end", false, 2n)).toBe(79);
  expect(words.wordMove(field, 0, "end", true, 2n)).toBe(79);
  expect(words.wordMove(field, 79, "backward", false, 1n)).toBe(40);
  expect(words.wordMove(field, 79, "backward", false, 2n)).toBe(0);
  expect(words.wordMove(field, 79, "backward", true, 2n)).toBe(0);
});

test("all-space, singleton and zero-count fields use the edge fallbacks", () => {
  const blank = model.field(" ");
  for (const position of [0, 39, 400, 799]) {
    for (const big of writings) {
      expect(words.wordMove(blank, position, "forward", big, 1n)).toBe(799);
      expect(words.wordMove(blank, position, "end", big, 1n)).toBe(799);
      expect(words.wordMove(blank, position, "backward", big, 1n)).toBe(0);
      for (const motion of motions) {
        expect(words.wordMove(blank, position, motion, big, 0n)).toBe(position);
      }
    }
  }

  const singletons = model.field("a b c d");
  const starts = [2, 4, 6, 799];
  const back = [4, 2, 0, 0];
  for (let n = 1; n <= starts.length; n++) {
    expect(words.wordMove(singletons, 0, "forward", false, BigInt(n))).toBe(starts[n - 1]!);
    expect(words.wordMove(singletons, 0, "end", true, BigInt(n))).toBe(starts[n - 1]!);
    expect(words.wordMove(singletons, 6, "backward", true, BigInt(n))).toBe(back[n - 1]!);
  }
});

test("a count repeats the actual single step without changing a fallback", () => {
  const fields = ["one two three", "foo.bar!! baz", "a b c d", ""].map(model.field);
  for (const field of fields) {
    for (const position of [0, 3, 6, 12, 39, 40, 400, 799]) {
      for (const motion of motions) {
        for (const big of writings) {
          let repeated = position;
          for (let n = 1; n <= 6; n++) {
            repeated = words.wordMove(field, repeated, motion, big, 1n);
            expect(words.wordMove(field, position, motion, big, BigInt(n))).toBe(repeated);
          }
        }
      }
    }
  }
});

test("huge counts terminate at the same boundary as smaller overflowing counts", () => {
  const huge = [BigInt(Number.MAX_SAFE_INTEGER) + 1n, 2n ** 64n, 10n ** 30n];
  const wordsField = model.field("one two three");
  const split = model.field("a".repeat(80));
  const blank = model.field(" ");
  for (const count of huge) {
    expect(words.wordMove(wordsField, 0, "forward", false, count)).toBe(799);
    expect(words.wordMove(wordsField, 0, "end", false, count)).toBe(799);
    expect(words.wordMove(wordsField, 12, "backward", false, count)).toBe(0);
    expect(words.wordMove(split, 0, "forward", true, count)).toBe(799);
    expect(words.wordMove(split, 0, "end", false, count)).toBe(799);
    expect(words.wordMove(split, 79, "backward", true, count)).toBe(0);
    expect(words.wordMove(blank, 400, "forward", false, count)).toBe(799);
    expect(words.wordMove(blank, 400, "end", true, count)).toBe(799);
    expect(words.wordMove(blank, 400, "backward", false, count)).toBe(0);
  }
});
