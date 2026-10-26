export type Cell = { readonly $: "Floor" } | { readonly $: "Wall" };

export function columns(): number { return 40; }
export function rows(): number { return 20; }
export function cell(column: number, row: number): Cell {
  return { $: column === 0 || column === 39 || row === 0 || row === 19 ? "Wall" : "Floor" };
}
export function glyph(value: Cell): string { return value.$ === "Wall" ? "#" : "."; }

export default { columns, rows, cell, glyph };
