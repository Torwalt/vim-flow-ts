import { expect, test } from "bun:test";
import type { AxisApi, Direction, FindApi, Input, LineMotion, LinesApi, Mode, ModelApi, NavigationApi, View, WordMotion, WordsApi } from "./api";
import { appendCount, candidate, character, effective, findSelected, indentSelected, inside, normalized, printable, recognized, seedText, targetRow, valid, wordSelected } from "./helpers";

// Fixed planner-authored finite counterparts of the 50 original obligations.
// Register only completed groups in tests/core/navigation-contract.test.ts.
// No production module is imported here, so open future groups cannot execute.
export const texts = ["", " ".repeat(800), seedText,
  "a..b_9  x x".padEnd(39) + "!Z" + " ".repeat(758) + "q",
  "\u0000é😀A\t_9!".repeat(110), "a".repeat(900)];
const positions = [0, 1, 38, 39, 40, 79, 400, 799];
const counts = [0n, 1n, 2n, 40n, 800n, 9999n, 10n ** 30n];
const directions: Direction[] = ["left", "down", "up", "right"];
const wordMotions: WordMotion[] = ["forward", "backward", "end"];
const lineMotions: LineMotion[] = ["zero", "indent", "end", "first", "last"];
const check = (id: string, body: () => void) => test(id, body);
function modes(): Mode[] {
  return [{ $: "Normal", count: 0 }, { $: "Normal", count: 2 },
    { $: "FindRight", count: 2 }, { $: "FindLeft", count: 1 }, { $: "Go", count: 2 }];
}

export function registerModel<F, S>(a: ModelApi<F, S>): void {
  check("model.field_contents", () => { for (const text of texts) for (let p = 0; p < 800; p++) expect(a.at(a.field(text), BigInt(p))).toBe(normalized(text)[p]!); });
  check("model.field_printable", () => { for (const text of texts) { const f = a.field(text); for (let p = 0; p < 805; p++) expect(printable(a.at(f, BigInt(p)))).toBe(true); } });
  check("model.field_outside", () => { for (const text of texts) for (const p of [800n, 9999n, 10n ** 30n]) expect(a.at(a.field(text), p)).toBe(" "); });
  check("model.pack_view", () => { for (const text of texts) for (const position of positions) for (const mode of modes()) { const view = { field: a.field(text), position, mode }; expect(a.view(a.pack(view))).toEqual(view); } });
  check("model.initial_view", () => expect(a.view(a.initial())).toEqual({ field: a.field(seedText), position: 0, mode: { $: "Normal", count: 0 } }));
  check("model.initial_valid", () => expect(valid(a.view(a.initial()))).toBe(true));
  check("model.contents_length", () => { for (const text of texts) expect(a.contents(a.field(text)).length).toBe(800); });
  check("model.contents_at", () => { for (const text of texts) { const f = a.field(text); for (let p = 0; p < 800; p++) expect(a.contents(f)[p]).toBe(a.at(f, BigInt(p))); } });
  check("model.contents_printable", () => { for (const text of texts) expect(Array.from(a.contents(a.field(text))).every(printable)).toBe(true); });
}

export function registerAxis(a: AxisApi): void {
  const dest = (p: number, d: Direction, n: bigint) => {
    const row = Math.floor(p / 40), col = p % 40;
    const clamp = (x: bigint, max: bigint) => Number(x < 0n ? 0n : x > max ? max : x);
    return d === "left" ? row * 40 + clamp(BigInt(col) - n, 39n)
      : d === "right" ? row * 40 + clamp(BigInt(col) + n, 39n)
      : d === "up" ? clamp(BigInt(row) - n, 19n) * 40 + col
      : clamp(BigInt(row) + n, 19n) * 40 + col;
  };
  for (const d of directions) check(`axis.${d}`, () => { for (let p = 0; p < 800; p++) for (const n of counts) expect(a.axisMove(p, d, n)).toBe(dest(p, d, n)); });
  check("axis.bounded", () => { for (const p of positions) for (const d of directions) for (const n of counts) expect(inside(a.axisMove(p, d, n))).toBe(true); });
}

export function registerWords<F, S>(a: ModelApi<F, S> & WordsApi<F>): void {
  check("words.one", () => { for (const text of texts) { const f = a.field(text); for (const p of positions) for (const motion of wordMotions) for (const big of [false, true]) expect(wordSelected(normalized(text), p, motion, big, a.wordMove(f, p, motion, big, 1n))).toBe(true); } });
  check("words.zero", () => { for (const text of texts) for (const p of positions) for (const m of wordMotions) for (const b of [false, true]) expect(a.wordMove(a.field(text), p, m, b, 0n)).toBe(p); });
  check("words.counted", () => { for (const text of texts) { const f = a.field(text); for (const p of positions) for (const m of wordMotions) for (const b of [false, true]) for (const n of [0n, 1n, 3n]) expect(a.wordMove(f, p, m, b, 2n + n)).toBe(a.wordMove(f, a.wordMove(f, p, m, b, 1n), m, b, 1n + n)); } });
  check("words.bounded", () => { for (const text of texts) for (const p of positions) for (const m of wordMotions) for (const b of [false, true]) for (const n of [0n, 1n, 3n]) expect(inside(a.wordMove(a.field(text), p, m, b, n))).toBe(true); });
}

export function registerLines<F, S>(a: ModelApi<F, S> & LinesApi<F>): void {
  check("lines.zero_column", () => { for (const text of texts) for (const p of positions) for (const n of counts) expect(a.lineMove(a.field(text), p, "zero", n)).toBe(p - p % 40); });
  check("lines.row_end", () => { for (const text of texts) for (const p of positions) for (const n of counts) expect(a.lineMove(a.field(text), p, "end", n)).toBe(targetRow(p, "end", n) * 40 + 39); });
  for (const [id, motion] of [["first_nonblank", "indent"], ["first_row", "first"], ["last_row", "last"]] as const) {
    check(`lines.${id}`, () => { for (const text of texts) for (const p of positions) for (const n of counts) expect(indentSelected(normalized(text), targetRow(p, motion, n), a.lineMove(a.field(text), p, motion, n))).toBe(true); });
  }
  check("lines.bounded", () => { for (const text of texts) for (const p of positions) for (const m of lineMotions) for (const n of counts) expect(inside(a.lineMove(a.field(text), p, m, n))).toBe(true); });
}

export function registerFind<F, S>(a: ModelApi<F, S> & FindApi<F>): void {
  check("find.zero", () => { for (const text of texts) for (const p of positions) for (const right of [true, false]) expect(a.findMove(a.field(text), p, "x", right, 0n)).toBe(p); });
  check("find.exact", () => { for (const text of texts) { const f = a.field(text); for (const p of positions) for (const right of [true, false]) for (const target of [" ", "a", "x", "!", "Z"]) for (const n of [1n, 2n, 4n, 41n, 10n ** 30n]) expect(findSelected(normalized(text), p, target, right, n, a.findMove(f, p, target, right, n))).toBe(true); } });
  check("find.bounded", () => { for (const text of texts) for (const p of positions) for (const right of [true, false]) for (const n of counts) expect(inside(a.findMove(a.field(text), p, "x", right, n))).toBe(true); });
}

export function registerInput<F, S>(a: NavigationApi<F, S>): void {
  const snapshots: View<F>[] = texts.slice(0, 3).flatMap(text => [0, 39, 799].flatMap(position => modes().map(mode => ({ field: a.field(text), position, mode }))));
  const events: Input[] = ["h", "w", "0", "g", "f", "7", "x", "é", "\n"].map(c => character(c));
  events.push({ $: "Escape", blocked: false }, { $: "Other" }, character("j", true));
  const observed = (v: View<F>, input: Input) => a.view(a.step(a.pack(v), input));
  const normal = (field: F, position: number): View<F> => ({ field, position, mode: { $: "Normal", count: 0 } });
  const fromNormal = (body: (v: View<F>, n: number) => void) => { for (const text of texts.slice(0, 3)) for (const p of positions) for (const n of [0, 2]) body({ field: a.field(text), position: p, mode: { $: "Normal", count: n } }, n); };
  check("input.respects_view", () => { for (const v of snapshots) for (const e of events) { const s = a.pack(v); expect(a.view(a.step(s, e))).toEqual(a.view(a.step(a.pack(a.view(s)), e))); } });
  check("input.preserves_field", () => { for (const v of snapshots) for (const e of events) { const s = a.pack(v); const before = a.view(s); const text = a.contents(before.field); const position = before.position; const mode = { ...before.mode }; expect(a.view(a.step(s, e)).field).toEqual(before.field); expect(a.contents(a.view(s).field)).toBe(text); expect(a.view(s).position).toBe(position); expect(a.view(s).mode).toEqual(mode); } });
  check("input.preserves_validity", () => { for (const v of snapshots) for (const e of events) expect(valid(observed(v, e))).toBe(true); });
  check("input.other", () => { for (const v of snapshots) expect(observed(v, { $: "Other" })).toEqual(v); });
  check("input.blocked_character", () => { for (const v of snapshots) for (const c of ["g", "j", "9", " ", "é"]) expect(observed(v, character(c, true))).toEqual(v); });
  check("input.blocked_escape", () => { for (const v of snapshots) expect(observed(v, { $: "Escape", blocked: true })).toEqual(v); });
  check("input.escape", () => { for (const v of snapshots) expect(observed(v, { $: "Escape", blocked: false })).toEqual(normal(v.field, v.position)); });
  check("input.nonprintable", () => { for (const v of snapshots) for (const c of ["\n", "\u0000", "\u007f", "é", "😀"]) expect(observed(v, character(c))).toEqual(v); });
  check("input.axis", () => fromNormal((v, n) => { for (const [key, d] of [["h", "left"], ["j", "down"], ["k", "up"], ["l", "right"]] as const) expect(observed(v, character(key))).toEqual(normal(v.field, a.axisMove(v.position, d, effective(n)))); }));
  check("input.words", () => fromNormal((v, n) => { for (const [key, m, big] of [["w", "forward", false], ["b", "backward", false], ["e", "end", false], ["W", "forward", true], ["B", "backward", true], ["E", "end", true]] as const) expect(observed(v, character(key))).toEqual(normal(v.field, a.wordMove(v.field, v.position, m, big, effective(n)))); }));
  check("input.zero_column", () => fromNormal((v, n) => { if (n === 0) expect(observed(v, character("0"))).toEqual(normal(v.field, a.lineMove(v.field, v.position, "zero", 0n))); }));
  check("input.first_nonblank", () => fromNormal((v, n) => expect(observed(v, character("^"))).toEqual(normal(v.field, a.lineMove(v.field, v.position, "indent", BigInt(n))))));
  check("input.row_end", () => fromNormal((v, n) => expect(observed(v, character("$"))).toEqual(normal(v.field, a.lineMove(v.field, v.position, "end", BigInt(n))))));
  check("input.last_row", () => fromNormal((v, n) => expect(observed(v, character("G"))).toEqual(normal(v.field, a.lineMove(v.field, v.position, "last", BigInt(n))))));
  check("input.find_right_prefix", () => fromNormal((v, n) => expect(observed(v, character("f"))).toEqual({ ...v, mode: { $: "FindRight", count: Math.max(1, n) } })));
  check("input.find_left_prefix", () => fromNormal((v, n) => expect(observed(v, character("F"))).toEqual({ ...v, mode: { $: "FindLeft", count: Math.max(1, n) } })));
  check("input.find_target", () => { for (const v of snapshots) if (v.mode.$ === "FindRight" || v.mode.$ === "FindLeft") for (const c of [" ", "4", "f", "W", "x"]) expect(observed(v, character(c))).toEqual(normal(v.field, a.findMove(v.field, v.position, c, v.mode.$ === "FindRight", BigInt(v.mode.count)))); });
  check("input.go_prefix", () => fromNormal((v, n) => expect(observed(v, character("g"))).toEqual({ ...v, mode: { $: "Go", count: n } })));
  check("input.go_complete", () => { for (const v of snapshots) if (v.mode.$ === "Go") expect(observed(v, character("g"))).toEqual(normal(v.field, a.lineMove(v.field, v.position, "first", BigInt(v.mode.count)))); });
  check("input.go_invalid", () => { for (const v of snapshots) if (v.mode.$ === "Go") for (const c of ["j", "2", "G", " "]) expect(observed(v, character(c))).toEqual(normal(v.field, v.position)); });
  check("input.nonzero_digit", () => { for (const n of [0, 2, 999, 9999]) for (const c of "123456789") { const v = { field: a.field(seedText), position: 0, mode: { $: "Normal", count: n } } as const; expect(observed(v, character(c))).toEqual({ ...v, mode: { $: "Normal", count: appendCount(n, Number(c)) } }); } });
  check("input.zero_digit", () => { for (const n of [1, 2, 999, 9999]) { const v = { field: a.field(seedText), position: 0, mode: { $: "Normal", count: n } } as const; expect(observed(v, character("0"))).toEqual({ ...v, mode: { $: "Normal", count: appendCount(n, 0) } }); } });
  check("input.unsupported", () => fromNormal((v) => { for (const c of "xHJ:?") { expect(recognized(c)).toBe(false); expect(observed(v, character(c))).toEqual(normal(v.field, v.position)); } }));
}

// Keep candidate independently accessible for additional examples without
// exposing any implementation. Production reuse of helpers is allowed.
export { candidate };

export function registerAll<F, S>(a: NavigationApi<F, S>): void {
  registerModel(a);
  registerAxis(a);
  registerWords(a);
  registerLines(a);
  registerFind(a);
  registerInput(a);
}
