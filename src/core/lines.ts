import type { LinesApi } from "../../spec/navigation/api";
import { columns, targetRow } from "../../spec/navigation/helpers";
import type { Field } from "./model";

function firstNonBlank(text: Field, target: number): number {
  const start = target * columns;
  for (let offset = 0; offset < columns; offset++) {
    if (text[start + offset] !== " ") return start + offset;
  }
  return start;
}

export const lines: LinesApi<Field> = {
  lineMove(field, position, motion, count) {
    const target = targetRow(position, motion, count);
    if (motion === "zero") return target * columns;
    if (motion === "end") return target * columns + columns - 1;
    return firstNonBlank(field, target);
  },
};
