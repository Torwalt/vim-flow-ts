export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Segment {
  readonly from: Point;
  readonly to: Point;
}

export function cellCenter(
  column: number,
  row: number,
  cellWidth: number,
  cellHeight: number,
): Point {
  return {
    x: column * cellWidth + cellWidth / 2,
    y: row * cellHeight + cellHeight / 2,
  };
}

export function clipSegment(from: Point, to: Point, width: number, height: number): Segment | null {
  if (!(width > 0) || !(height > 0)) return null;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let t0 = 0;
  let t1 = 1;
  const edges: ReadonlyArray<readonly [number, number]> = [
    [-dx, from.x],
    [dx, width - from.x],
    [-dy, from.y],
    [dy, height - from.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const ratio = q / p;
    if (p < 0) {
      if (ratio > t1) return null;
      if (ratio > t0) t0 = ratio;
    } else {
      if (ratio < t0) return null;
      if (ratio < t1) t1 = ratio;
    }
  }
  return {
    from: { x: from.x + t0 * dx, y: from.y + t0 * dy },
    to: { x: from.x + t1 * dx, y: from.y + t1 * dy },
  };
}

export function arrowHead(from: Point, to: Point, size: number): readonly [Point, Point] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0 || size <= 0) return [to, to];
  const unitX = dx / length;
  const unitY = dy / length;
  const baseX = to.x - unitX * size;
  const baseY = to.y - unitY * size;
  const wing = size * 0.55;
  return [
    { x: baseX - unitY * wing, y: baseY + unitX * wing },
    { x: baseX + unitY * wing, y: baseY - unitX * wing },
  ];
}
