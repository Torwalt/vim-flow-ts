import type { Direction, Input, LineMotion, Mode, WordMotion } from "../../spec/navigation/api";
import { appendCount, classify, effective, printable } from "../../spec/navigation/helpers";

export interface Layout {
  readonly columns: number;
  readonly rows: number;
}

export interface NavigationState {
  readonly position: number;
  readonly mode: Mode;
}

export interface Navigation {
  readonly layout: Layout;
  readonly size: number;
  field(text: string): string;
  at(field: string, position: number): string;
  inside(position: number): boolean;
  cursor(position: number): { readonly x: number; readonly y: number };
  position(cursor: { readonly x: number; readonly y: number }): number;
  axisMove(position: number, direction: Direction, count: bigint): number;
  wordMove(field: string, position: number, motion: WordMotion, big: boolean, count: bigint): number;
  lineMove(field: string, position: number, motion: LineMotion, count: bigint): number;
  findMove(field: string, position: number, target: string, right: boolean, count: bigint): number;
  step(field: string, position: number, mode: Mode, input: Input): NavigationState;
}

function normal(count = 0): Mode {
  return { $: "Normal", count };
}

export function createNavigation(layout: Layout): Navigation {
  const { columns, rows } = layout;
  const size = columns * rows;
  const firstCell = 0;
  const lastCell = size - 1;
  const lastColumn = BigInt(columns - 1);
  const lastRow = BigInt(rows - 1);

  function inside(position: number): boolean {
    return Number.isInteger(position) && position >= 0 && position < size;
  }

  function at(field: string, position: number): string {
    return inside(position) ? field[position] ?? " " : " ";
  }

  function field(text: string): string {
    return Array.from(text).slice(0, size).map(c => printable(c) ? c : " ").join("").padEnd(size, " ");
  }

  function rowOf(position: number): number {
    return Math.floor(position / columns);
  }

  function columnOf(position: number): number {
    return position % columns;
  }

  function index(row: number, column: number): number {
    return row * columns + column;
  }

  function cursor(position: number): { x: number; y: number } {
    return { x: columnOf(position), y: rowOf(position) };
  }

  function position(cell: { x: number; y: number }): number {
    return index(cell.y, cell.x);
  }

  function clamped(value: bigint, maximum: bigint): number {
    return Number(value < 0n ? 0n : value > maximum ? maximum : value);
  }

  function axisMove(atPosition: number, direction: Direction, count: bigint): number {
    const flatRow = rowOf(atPosition);
    const flatColumn = columnOf(atPosition);
    switch (direction) {
      case "left":
        return index(flatRow, clamped(BigInt(flatColumn) - count, lastColumn));
      case "right":
        return index(flatRow, clamped(BigInt(flatColumn) + count, lastColumn));
      case "up":
        return index(clamped(BigInt(flatRow) - count, lastRow), flatColumn);
      case "down":
        return index(clamped(BigInt(flatRow) + count, lastRow), flatColumn);
    }
  }

  function candidate(text: string, from: number, motion: WordMotion, big: boolean, q: number): boolean {
    if (!inside(q) || at(text, q) === " ") return false;
    if (motion === "backward" ? q >= from : q <= from) return false;
    const glyph = at(text, q);
    return motion === "end"
      ? columnOf(q) === columns - 1 || classify(glyph, big) !== classify(at(text, q + 1), big)
      : columnOf(q) === 0 || classify(glyph, big) !== classify(at(text, q - 1), big);
  }

  function nearest(text: string, from: number, motion: WordMotion, big: boolean): number {
    if (motion === "backward") {
      for (let q = from - 1; q >= firstCell; q--) if (candidate(text, from, motion, big, q)) return q;
      return firstCell;
    }
    for (let q = from + 1; q <= lastCell; q++) if (candidate(text, from, motion, big, q)) return q;
    return lastCell;
  }

  function wordMove(text: string, from: number, motion: WordMotion, big: boolean, count: bigint): number {
    let destination = from;
    for (let remaining = count; remaining > 0n; remaining--) {
      const next = nearest(text, destination, motion, big);
      if (next === destination) return next;
      destination = next;
    }
    return destination;
  }

  function targetRow(from: number, motion: LineMotion, count: bigint): number {
    if (motion === "zero" || motion === "indent") return rowOf(from);
    if (motion === "end") return clamped(BigInt(rowOf(from)) + (count > 0n ? count : 1n) - 1n, lastRow);
    return clamped(motion === "last" && count === 0n ? lastRow : count - 1n, lastRow);
  }

  function firstNonBlank(text: string, target: number): number {
    const start = target * columns;
    for (let offset = 0; offset < columns; offset++) {
      if (at(text, start + offset) !== " ") return start + offset;
    }
    return start;
  }

  function lineMove(text: string, from: number, motion: LineMotion, count: bigint): number {
    const target = targetRow(from, motion, count);
    if (motion === "zero") return target * columns;
    if (motion === "end") return target * columns + columns - 1;
    return firstNonBlank(text, target);
  }

  function findMove(
    text: string,
    from: number,
    target: string,
    right: boolean,
    count: bigint,
  ): number {
    if (count <= 0n) return from;
    const start = rowOf(from) * columns;
    let rank = 0n;
    if (right) {
      for (let q = from + 1; q < start + columns; q++) {
        if (at(text, q) === target) {
          rank += 1n;
          if (rank === count) return q;
        }
      }
    } else {
      for (let q = from - 1; q >= start; q--) {
        if (at(text, q) === target) {
          rank += 1n;
          if (rank === count) return q;
        }
      }
    }
    return from;
  }

  function complete(atPosition: number): NavigationState {
    return { position: atPosition, mode: normal() };
  }

  function pending(atPosition: number, mode: Mode): NavigationState {
    return { position: atPosition, mode };
  }

  function normalStep(text: string, atPosition: number, count: number, value: string): NavigationState {
    if (value >= "1" && value <= "9") {
      return pending(atPosition, normal(appendCount(count, Number(value))));
    }
    if (value === "0") {
      return count === 0
        ? complete(lineMove(text, atPosition, "zero", 0n))
        : pending(atPosition, normal(appendCount(count, 0)));
    }
    switch (value) {
      case "h":
        return complete(axisMove(atPosition, "left", effective(count)));
      case "j":
        return complete(axisMove(atPosition, "down", effective(count)));
      case "k":
        return complete(axisMove(atPosition, "up", effective(count)));
      case "l":
        return complete(axisMove(atPosition, "right", effective(count)));
      case "w":
        return complete(wordMove(text, atPosition, "forward", false, effective(count)));
      case "b":
        return complete(wordMove(text, atPosition, "backward", false, effective(count)));
      case "e":
        return complete(wordMove(text, atPosition, "end", false, effective(count)));
      case "W":
        return complete(wordMove(text, atPosition, "forward", true, effective(count)));
      case "B":
        return complete(wordMove(text, atPosition, "backward", true, effective(count)));
      case "E":
        return complete(wordMove(text, atPosition, "end", true, effective(count)));
      case "^":
        return complete(lineMove(text, atPosition, "indent", BigInt(count)));
      case "$":
        return complete(lineMove(text, atPosition, "end", BigInt(count)));
      case "G":
        return complete(lineMove(text, atPosition, "last", BigInt(count)));
      case "f":
        return pending(atPosition, { $: "FindRight", count: Math.max(1, count) });
      case "F":
        return pending(atPosition, { $: "FindLeft", count: Math.max(1, count) });
      case "g":
        return pending(atPosition, { $: "Go", count });
      default:
        return complete(atPosition);
    }
  }

  return {
    layout,
    size,
    field,
    at,
    inside,
    cursor,
    position,
    axisMove,
    wordMove,
    lineMove,
    findMove,
    step(text, atPosition, mode, input) {
      if (input.$ === "Other" || input.blocked) return { position: atPosition, mode };
      if (input.$ === "Escape") return complete(atPosition);
      const value = input.value;
      if (!printable(value)) return { position: atPosition, mode };
      if (mode.$ === "FindRight" || mode.$ === "FindLeft") {
        return complete(findMove(text, atPosition, value, mode.$ === "FindRight", BigInt(mode.count)));
      }
      if (mode.$ === "Go") {
        return value === "g"
          ? complete(lineMove(text, atPosition, "first", BigInt(mode.count)))
          : complete(atPosition);
      }
      return normalStep(text, atPosition, mode.count, value);
    },
  };
}
