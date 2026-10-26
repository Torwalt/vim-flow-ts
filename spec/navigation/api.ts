// Planner-authored observable contracts. F and S remain executor-owned types.
export type Mode =
  | { readonly $: "Normal"; readonly count: number }
  | { readonly $: "FindRight"; readonly count: number }
  | { readonly $: "FindLeft"; readonly count: number }
  | { readonly $: "Go"; readonly count: number };
export type View<F> = { readonly field: F; readonly position: number; readonly mode: Mode };
export type Input =
  | { readonly $: "Character"; readonly value: string; readonly blocked: boolean }
  | { readonly $: "Escape"; readonly blocked: boolean }
  | { readonly $: "Other" };
export type Direction = "left" | "down" | "up" | "right";
export type WordMotion = "forward" | "backward" | "end";
export type LineMotion = "zero" | "indent" | "end" | "first" | "last";

export interface ModelApi<F, S> {
  field(text: string): F;
  at(field: F, position: bigint): string;
  contents(field: F): string;
  pack(view: View<F>): S;
  view(state: S): View<F>;
  initial(): S;
}
// bigint preserves the original unbounded natural count domain. It does not
// prescribe storage; convert only after clamping. Observed positions fit number.
export interface AxisApi {
  axisMove(position: number, direction: Direction, count: bigint): number;
}
export interface WordsApi<F> {
  wordMove(field: F, position: number, motion: WordMotion, big: boolean, count: bigint): number;
}
export interface LinesApi<F> {
  lineMove(field: F, position: number, motion: LineMotion, count: bigint): number;
}
export interface FindApi<F> {
  findMove(field: F, position: number, target: string, right: boolean, count: bigint): number;
}
export interface InputApi<S> { step(state: S, input: Input): S; }
export type NavigationApi<F, S> = ModelApi<F, S> & AxisApi & WordsApi<F> & LinesApi<F> & FindApi<F> & InputApi<S>;
