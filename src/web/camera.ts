export const CELL_WIDTH = 12;
export const CELL_HEIGHT = 20;
export const HUD_HEIGHT = 32;

const MARGIN_DIVISOR = 5;

export interface Camera {
  readonly x: number;
  readonly y: number;
}

export interface Viewport {
  readonly columns: number;
  readonly rows: number;
}

export interface Extent {
  readonly width: number;
  readonly height: number;
}

export function visibleCells(cssWidth: number, cssHeight: number): Viewport {
  const width = Number.isFinite(cssWidth) ? Math.max(0, cssWidth) : 0;
  const height = Number.isFinite(cssHeight) ? Math.max(0, cssHeight) : 0;
  return {
    columns: Math.max(1, Math.floor(width / CELL_WIDTH)),
    rows: Math.max(1, Math.floor(height / CELL_HEIGHT)),
  };
}

function followAxis(origin: number, cursor: number, visible: number, extent: number): number {
  const count = Math.max(1, Math.floor(visible));
  const maximum = Math.max(0, extent - count);
  const margin = Math.floor(count / MARGIN_DIVISOR);
  let next = origin;
  if (cursor < origin + margin) next = cursor - margin;
  else if (cursor >= origin + count - margin) next = cursor - (count - margin - 1);
  return Math.min(maximum, Math.max(0, next));
}

export function followCamera(
  origin: Camera,
  cursor: Camera,
  viewport: Viewport,
  world: Extent,
): Camera {
  return {
    x: followAxis(origin.x, cursor.x, viewport.columns, world.width),
    y: followAxis(origin.y, cursor.y, viewport.rows, world.height),
  };
}
