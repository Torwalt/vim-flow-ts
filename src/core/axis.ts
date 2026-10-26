import type { AxisApi } from "../../spec/navigation/api";
import { column, columns, index, row, rows } from "../../spec/navigation/helpers";

const lastColumn = BigInt(columns - 1);
const lastRow = BigInt(rows - 1);

function clamped(value: bigint, maximum: bigint): number {
  return Number(value < 0n ? 0n : value > maximum ? maximum : value);
}

export const axis: AxisApi = {
  axisMove(position, direction, count) {
    const atRow = row(position);
    const atColumn = column(position);
    switch (direction) {
      case "left":
        return index(atRow, clamped(BigInt(atColumn) - count, lastColumn));
      case "right":
        return index(atRow, clamped(BigInt(atColumn) + count, lastColumn));
      case "up":
        return index(clamped(BigInt(atRow) - count, lastRow), atColumn);
      case "down":
        return index(clamped(BigInt(atRow) + count, lastRow), atColumn);
    }
  },
};
