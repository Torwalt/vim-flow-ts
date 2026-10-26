import { expect, test } from "bun:test";
import type { Field, Input, Mode, View } from "../../src/core/navigation";
import { input, model } from "../../src/core/navigation";

const field = model.field(
  "abc.def ghi".padEnd(40) +
    "  qux  a-b_c".padEnd(40) +
    "a1 b2 c3 d4".padEnd(40) +
    "xyx 0 f x".padEnd(40) +
    " ".repeat(40),
);

const normal = (count = 0): Mode => ({ $: "Normal", count });
const at = (position: number, mode: Mode = normal()): View<Field> => ({ field, position, mode });
const key = (value: string, blocked = false): Input => ({ $: "Character", value, blocked });
const escape = (blocked = false): Input => ({ $: "Escape", blocked });

const send = (view: View<Field>, ...events: Input[]): View<Field> => {
  let state = model.pack(view);
  for (const event of events) state = input.step(state, event);
  return model.view(state);
};

test("counted motions saturate at 9999, move and clear the count", () => {
  expect(send(at(0), key("1"), key("0"), key("j"))).toEqual({ field, position: 400, mode: normal() });

  let view = at(0);
  for (const count of [9, 99, 999, 9999, 9999]) {
    view = send(view, key("9"));
    expect(view.mode).toEqual({ $: "Normal", count });
    expect(view.position).toBe(0);
  }
  expect(send(view, key("l"))).toEqual({ field, position: 39, mode: normal() });
});

test("zero disambiguates column motion from extending a pending count", () => {
  expect(send(at(10), key("0"))).toEqual({ field, position: 0, mode: normal() });

  const two = send(at(30), key("2"));
  expect(two.mode).toEqual({ $: "Normal", count: 2 });
  const twenty = send(two, key("0"));
  expect(twenty).toEqual({ field, position: 30, mode: { $: "Normal", count: 20 } });
  expect(send(twenty, key("h"))).toEqual({ field, position: 10, mode: normal() });

  expect(send(at(0), key("9"), key("9"), key("9"), key("9"), key("0"), key("l")))
    .toEqual({ field, position: 39, mode: normal() });
});

test("axis keys use the default or counted distance and clear the count", () => {
  expect(send(at(100), key("l"))).toEqual({ field, position: 101, mode: normal() });
  expect(send(at(100), key("2"), key("h"))).toEqual({ field, position: 98, mode: normal() });
  expect(send(at(0), key("k"))).toEqual({ field, position: 0, mode: normal() });
  expect(send(at(0), key("2"), key("j"))).toEqual({ field, position: 80, mode: normal() });
  expect(send(at(19), key("l"))).toEqual({ field, position: 20, mode: normal() });
  expect(send(at(799), key("l"))).toEqual({ field, position: 799, mode: normal() });
});

test("word keys distinguish case and count repeated single steps", () => {
  expect(send(at(0), key("w"))).toEqual({ field, position: 3, mode: normal() });
  expect(send(at(0), key("W"))).toEqual({ field, position: 8, mode: normal() });
  expect(send(at(0), key("2"), key("w"))).toEqual({ field, position: 4, mode: normal() });
  expect(send(at(0), key("2"), key("W"))).toEqual({ field, position: 42, mode: normal() });
  expect(send(at(0), key("2"), key("e"))).toEqual({ field, position: 3, mode: normal() });
  expect(send(at(0), key("2"), key("E"))).toEqual({ field, position: 10, mode: normal() });
  expect(send(at(8), key("b"))).toEqual({ field, position: 4, mode: normal() });
  expect(send(at(8), key("B"))).toEqual({ field, position: 0, mode: normal() });
});

test("line keys use their default or counted row and clear the count", () => {
  expect(send(at(100), key("0"))).toEqual({ field, position: 80, mode: normal() });
  expect(send(at(100), key("2"), key("^"))).toEqual({ field, position: 80, mode: normal() });
  expect(send(at(100), key("$"))).toEqual({ field, position: 119, mode: normal() });
  expect(send(at(100), key("2"), key("$"))).toEqual({ field, position: 159, mode: normal() });
  expect(send(at(100), key("G"))).toEqual({ field, position: 760, mode: normal() });
  expect(send(at(100), key("2"), key("G"))).toEqual({ field, position: 42, mode: normal() });
  expect(send(at(100), key("3"), key("G"))).toEqual({ field, position: 80, mode: normal() });
});

test("find consumes the next printable literally and preserves the cursor on failure", () => {
  expect(send(at(0), key("f"))).toEqual({ field, position: 0, mode: { $: "FindRight", count: 1 } });
  expect(send(at(120), key("2"), key("f"))).toEqual({ field, position: 120, mode: { $: "FindRight", count: 2 } });
  expect(send(at(120), key("F"))).toEqual({ field, position: 120, mode: { $: "FindLeft", count: 1 } });
  expect(send(at(0), key("f"), key("."))).toEqual({ field, position: 3, mode: normal() });
  expect(send(at(0), key("F"), key("."))).toEqual({ field, position: 0, mode: normal() });
  expect(send(at(10), key("F"), key("."))).toEqual({ field, position: 3, mode: normal() });
  expect(send(at(0), key("f"), key(" "))).toEqual({ field, position: 7, mode: normal() });
  expect(send(at(0), key("f"), key("f"))).toEqual({ field, position: 6, mode: normal() });
  expect(send(at(0), key("f"), key("g"))).toEqual({ field, position: 8, mode: normal() });
  expect(send(at(0), key("f"), key("2"))).toEqual({ field, position: 0, mode: normal() });
  expect(send(at(80), key("f"), key("2"))).toEqual({ field, position: 84, mode: normal() });
  expect(send(at(120), key("f"), key("0"))).toEqual({ field, position: 124, mode: normal() });
  expect(send(at(120), key("1"), key("f"), key("x"))).toEqual({ field, position: 122, mode: normal() });
  expect(send(at(120), key("2"), key("f"), key("x"))).toEqual({ field, position: 128, mode: normal() });
  expect(send(at(120), key("3"), key("f"), key("x"))).toEqual({ field, position: 120, mode: normal() });
  expect(send(at(120), key("4"), key("f"), key("x"))).toEqual({ field, position: 120, mode: normal() });
  expect(send(at(128), key("2"), key("F"), key("x"))).toEqual({ field, position: 120, mode: normal() });
  expect(send(at(128), key("3"), key("F"), key(" "))).toEqual({ field, position: 123, mode: normal() });
});

test("g completes, cancels or consumes without reprocessing", () => {
  expect(send(at(300), key("g"), key("g"))).toEqual({ field, position: 0, mode: normal() });
  expect(send(at(300), key("2"), key("g"), key("g"))).toEqual({ field, position: 42, mode: normal() });
  const go = send(at(100), key("2"), key("g"));
  expect(go).toEqual({ field, position: 100, mode: { $: "Go", count: 2 } });
  for (const value of ["x", "2", "0", "G", " "]) {
    expect(send(go, key(value))).toEqual({ field, position: 100, mode: normal() });
  }
});

test("Escape, blocked modifiers, other and nonprintable preserve or reset grammar only", () => {
  const count = at(10, normal(2));
  const findRight = at(10, { $: "FindRight", count: 2 });
  const findLeft = at(10, { $: "FindLeft", count: 2 });
  const go = at(10, { $: "Go", count: 2 });

  for (const pending of [count, findRight, findLeft, go]) {
    expect(send(pending, escape())).toEqual({ field, position: 10, mode: normal() });
    expect(send(pending, escape(true))).toEqual(pending);
    expect(send(pending, { $: "Other" })).toEqual(pending);
  }
  expect(send(count, key("j", true))).toEqual(count);
  expect(send(findRight, key("x", true))).toEqual(findRight);
  expect(send(go, key("g", true))).toEqual(go);

  for (const value of ["\n", "\t", "\u0000", "\u007f", "é", "😀"]) {
    expect(send(count, key(value))).toEqual(count);
    expect(send(findRight, key(value))).toEqual(findRight);
    expect(send(go, key(value))).toEqual(go);
  }
});

test("unsupported printable input clears a pending count without moving", () => {
  for (const value of ["x", "H", "J", "K", "L", ":", "?"]) {
    expect(send(at(100, normal(2)), key(value)))
      .toEqual({ field, position: 100, mode: normal() });
  }
  expect(send(at(100), key("x"))).toEqual({ field, position: 100, mode: normal() });
});
