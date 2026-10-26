import type { FindApi } from "../../spec/navigation/api";
import { columns, hit, row } from "../../spec/navigation/helpers";
import type { Field } from "./model";

export const find: FindApi<Field> = {
  findMove(field, position, target, right, count) {
    if (count <= 0n) return position;
    const start = row(position) * columns;
    let rank = 0n;
    if (right) {
      for (let q = position + 1; q < start + columns; q++) {
        if (hit(field, position, q, target, true)) {
          rank += 1n;
          if (rank === count) return q;
        }
      }
    } else {
      for (let q = position - 1; q >= start; q--) {
        if (hit(field, position, q, target, false)) {
          rank += 1n;
          if (rank === count) return q;
        }
      }
    }
    return position;
  },
};
