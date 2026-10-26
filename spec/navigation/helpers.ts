import type { Input, LineMotion, Mode, View, WordMotion } from "./api";

// Specification assistance translated from the original handoff, not the
// executor's completed solution. These predicates never select a destination.
export const columns = 40;
export const rows = 20;
export const size = 800;
export const seedText =
  'alpha beta  foo_bar ++ 42 "quote"       ' +
  "  scout.move(x);  wall## gate  x x      " +
  "                                        " +
  "ore_7  unit-2  { north south }  x  END  ";

export function printable(c: string): boolean {
  const points = Array.from(c);
  const code = points.length === 1 ? points[0]!.codePointAt(0)! : -1;
  return code >= 32 && code <= 126;
}
export function normalized(text: string): string {
  return Array.from(text).slice(0, size).map(c => printable(c) ? c : " ").join("").padEnd(size, " ");
}
export function inside(p: number): boolean { return Number.isInteger(p) && p >= 0 && p < size; }
export function row(p: number): number { return Math.floor(p / columns); }
export function column(p: number): number { return p % columns; }
export function index(r: number, c: number): number { return r * columns + c; }
export function effective(n: number): bigint { return BigInt(Math.max(1, n)); }
export function modeValid(m: Mode): boolean {
  return Number.isInteger(m.count) && m.count >= (m.$ === "FindRight" || m.$ === "FindLeft" ? 1 : 0) && m.count <= 9999;
}
export function valid<F>(v: View<F>): boolean { return inside(v.position) && modeValid(v.mode); }
export function recognized(c: string): boolean { return c.length === 1 && "hjklwbeWBE0^$fFgG123456789".includes(c); }
export function appendCount(n: number, digit: number): number { return Math.min(9999, n * 10 + digit); }
export function character(value: string, blocked = false): Input {
  return Array.from(value).length === 1 ? { $: "Character", value, blocked } : { $: "Other" };
}
export function classify(c: string, big: boolean): number {
  return c === " " ? 0 : big ? 1 : /^[A-Za-z0-9_]$/.test(c) ? 2 : 1;
}
export function candidate(text: string, p: number, motion: WordMotion, big: boolean, q: number): boolean {
  if (!inside(q) || text[q] === " ") return false;
  if (motion === "backward" ? q >= p : q <= p) return false;
  return motion === "end"
    ? column(q) === 39 || classify(text[q]!, big) !== classify(text[q + 1]!, big)
    : column(q) === 0 || classify(text[q]!, big) !== classify(text[q - 1]!, big);
}
export function wordSelected(text: string, p: number, motion: WordMotion, big: boolean, out: number): boolean {
  const fallback = motion === "backward" ? 0 : 799;
  if (!inside(out) || !(candidate(text, p, motion, big, out) || out === fallback)) return false;
  for (let q = 0; q < size; q++) {
    if (candidate(text, p, motion, big, q) &&
      !(candidate(text, p, motion, big, out) && (motion === "backward" ? out >= q : out <= q))) return false;
  }
  return true;
}
export function targetRow(p: number, motion: LineMotion, n: bigint): number {
  const clamp = (x: bigint) => Number(x < 0n ? 0n : x > 19n ? 19n : x);
  if (motion === "zero" || motion === "indent") return row(p);
  if (motion === "end") return clamp(BigInt(row(p)) + (n > 0n ? n : 1n) - 1n);
  return clamp(motion === "last" && n === 0n ? 19n : n - 1n);
}
export function indentSelected(text: string, r: number, out: number): boolean {
  if (!inside(out) || row(out) !== r || (text[out] === " " && column(out) !== 0)) return false;
  for (let q = r * 40; q < r * 40 + 40; q++) {
    if (text[q] !== " " && (text[out] === " " || out > q)) return false;
  }
  return true;
}
export function hit(text: string, p: number, q: number, target: string, right: boolean): boolean {
  return inside(q) && row(p) === row(q) && (right ? q > p : q < p) && text[q] === target;
}
export function findSelected(text: string, p: number, target: string, right: boolean, n: bigint, out: number): boolean {
  let total = 0n, interval = 0n;
  for (let q = row(p) * 40; q < row(p) * 40 + 40; q++) {
    if (hit(text, p, q, target, right)) { total++; if (right ? q <= out : q >= out) interval++; }
  }
  return n > total ? out === p : hit(text, p, out, target, right) && interval === n;
}
