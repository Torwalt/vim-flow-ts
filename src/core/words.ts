import type { WordMotion, WordsApi } from "../../spec/navigation/api";
import { candidate, size } from "../../spec/navigation/helpers";
import type { Field } from "./model";

const firstCell = 0;
const lastCell = size - 1;

function nearest(text: Field, position: number, motion: WordMotion, big: boolean): number {
  if (motion === "backward") {
    for (let q = position - 1; q >= firstCell; q--) {
      if (candidate(text, position, motion, big, q)) return q;
    }
    return firstCell;
  }
  for (let q = position + 1; q < size; q++) {
    if (candidate(text, position, motion, big, q)) return q;
  }
  return lastCell;
}

export const words: WordsApi<Field> = {
  wordMove(field, position, motion, big, count) {
    let destination = position;
    for (let remaining = count; remaining > 0n; remaining--) {
      const next = nearest(field, destination, motion, big);
      if (next === destination) return next;
      destination = next;
    }
    return destination;
  },
};
