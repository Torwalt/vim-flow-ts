import { expect, test } from "bun:test";
import { appendCount, candidate, classify, findSelected, indentSelected, normalized, printable, seedText, targetRow, wordSelected } from "../../spec/navigation/helpers";

// Planner preflight only: these do not claim an implementation exists.
test("specification fixture and Unicode sanitation", () => {
  expect(normalized(seedText).length).toBe(800);
  expect(normalized(seedText).slice(40, 80)).toBe("  scout.move(x);  wall## gate  x x      ");
  expect(normalized("😀a\t").slice(0, 3)).toBe(" a ");
  expect(normalized("a".repeat(801))).toBe("a".repeat(800));
  expect(printable("~")).toBe(true);
  expect(printable("é")).toBe(false);
});
test("specification distinguishes words and WORDs", () => {
  const text = normalized(seedText);
  expect(classify("_", false)).toBe(2);
  expect(classify(".", false)).toBe(1);
  expect(classify(".", true)).toBe(1);
  expect(candidate(text, 46, "forward", false, 47)).toBe(true);
  expect(candidate(text, 46, "forward", true, 47)).toBe(false);
  expect(wordSelected(text, 46, "forward", true, 58)).toBe(true);
  expect(candidate(text, 0, "forward", false, 0)).toBe(false);
});
test("specification find ranks and blank-row fallback", () => {
  const text = normalized(seedText);
  expect(findSelected(text, 0, "o", true, 2n, 14)).toBe(true);
  expect(findSelected(text, 0, "o", true, 4n, 0)).toBe(true);
  expect(findSelected(text, 0, "o", true, 4n, 28)).toBe(false);
  expect(indentSelected(text, 2, 80)).toBe(true);
  expect(indentSelected(text, 1, 42)).toBe(true);
  expect(targetRow(0, "last", 0n)).toBe(19);
  expect(targetRow(0, "end", 9999n)).toBe(19);
  expect(appendCount(9999, 9)).toBe(9999);
});
