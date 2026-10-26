import type { InputApi, Mode } from "../../spec/navigation/api";
import { appendCount, effective, printable } from "../../spec/navigation/helpers";
import { axis } from "./axis";
import { find } from "./find";
import { lines } from "./lines";
import { model, type State } from "./model";
import { words } from "./words";

function normalMode(): Mode {
  return { $: "Normal", count: 0 };
}

function reset(state: State): State {
  return model.pack({ field: state.field, position: state.position, mode: normalMode() });
}

function complete(state: State, position: number): State {
  return model.pack({ field: state.field, position, mode: normalMode() });
}

function pending(state: State, mode: Mode): State {
  return model.pack({ field: state.field, position: state.position, mode });
}

function normalStep(state: State, value: string): State {
  const count = state.mode.count;
  if (value >= "1" && value <= "9") {
    return pending(state, { $: "Normal", count: appendCount(count, Number(value)) });
  }
  if (value === "0") {
    return count === 0
      ? complete(state, lines.lineMove(state.field, state.position, "zero", 0n))
      : pending(state, { $: "Normal", count: appendCount(count, 0) });
  }
  switch (value) {
    case "h":
      return complete(state, axis.axisMove(state.position, "left", effective(count)));
    case "j":
      return complete(state, axis.axisMove(state.position, "down", effective(count)));
    case "k":
      return complete(state, axis.axisMove(state.position, "up", effective(count)));
    case "l":
      return complete(state, axis.axisMove(state.position, "right", effective(count)));
    case "w":
      return complete(state, words.wordMove(state.field, state.position, "forward", false, effective(count)));
    case "b":
      return complete(state, words.wordMove(state.field, state.position, "backward", false, effective(count)));
    case "e":
      return complete(state, words.wordMove(state.field, state.position, "end", false, effective(count)));
    case "W":
      return complete(state, words.wordMove(state.field, state.position, "forward", true, effective(count)));
    case "B":
      return complete(state, words.wordMove(state.field, state.position, "backward", true, effective(count)));
    case "E":
      return complete(state, words.wordMove(state.field, state.position, "end", true, effective(count)));
    case "^":
      return complete(state, lines.lineMove(state.field, state.position, "indent", BigInt(count)));
    case "$":
      return complete(state, lines.lineMove(state.field, state.position, "end", BigInt(count)));
    case "G":
      return complete(state, lines.lineMove(state.field, state.position, "last", BigInt(count)));
    case "f":
      return pending(state, { $: "FindRight", count: Math.max(1, count) });
    case "F":
      return pending(state, { $: "FindLeft", count: Math.max(1, count) });
    case "g":
      return pending(state, { $: "Go", count });
    default:
      return reset(state);
  }
}

export const input: InputApi<State> = {
  step(state, event) {
    if (event.$ === "Other" || event.blocked) return state;
    if (event.$ === "Escape") return reset(state);
    const value = event.value;
    if (!printable(value)) return state;
    const mode = state.mode;
    if (mode.$ === "FindRight" || mode.$ === "FindLeft") {
      return complete(state, find.findMove(
        state.field,
        state.position,
        value,
        mode.$ === "FindRight",
        BigInt(mode.count),
      ));
    }
    if (mode.$ === "Go") {
      return value === "g"
        ? complete(state, lines.lineMove(state.field, state.position, "first", BigInt(mode.count)))
        : reset(state);
    }
    return normalStep(state, value);
  },
};
