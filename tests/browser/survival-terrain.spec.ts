import type { Page } from "@playwright/test";
import { expect, test } from "./test";

const backgroundRgb = [17, 23, 20];
const groundRgb = [22, 36, 26];
const grassRgb = [51, 69, 47];
const treeRgb = [111, 158, 90];
const rockRgb = [154, 160, 160];
const waterRgb = [77, 126, 168];
const gutterCurrentRgb = [34, 49, 38];
const cursorRgb = [245, 196, 81];

type State = {
  x: number;
  y: number;
  position: number;
  cameraX: number;
  cameraY: number;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  dpr: number;
  gutterWidth: number;
  gutter: string;
  rules: string;
};

async function open(page: Page, rules = "survival"): Promise<void> {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto(`/?clock=manual&rules=${rules}`);
  await expect(page.locator("#world")).toHaveAttribute("data-ready", "true");
  await page.locator("#world").click({ position: { x: 8, y: 8 } });
}

async function state(page: Page): Promise<State> {
  return page.locator("#world").evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const read = (name: string): number => Number(canvas.dataset[name] ?? "0");
    return {
      x: read("cursorX"),
      y: read("cursorY"),
      position: read("position"),
      cameraX: read("cameraX"),
      cameraY: read("cameraY"),
      columns: read("columns"),
      rows: read("rows"),
      cellWidth: read("cellWidth"),
      cellHeight: read("cellHeight"),
      dpr: read("dpr"),
      gutterWidth: read("gutterWidth"),
      gutter: canvas.dataset.gutter ?? "",
      rules: canvas.dataset.rules ?? "",
    };
  });
}

async function regionCounts(
  page: Page,
  cssLeft: number,
  cssTop: number,
  cssWidth: number,
  cssHeight: number,
  colors: readonly (readonly number[])[],
): Promise<Record<string, number>> {
  return page.locator("#world").evaluate((element, input) => {
    const canvas = element as HTMLCanvasElement;
    const ratio = Number(canvas.dataset.dpr ?? "1");
    const left = Math.floor(input.cssLeft * ratio);
    const top = Math.floor(input.cssTop * ratio);
    const width = Math.max(0, Math.min(Math.ceil(input.cssWidth * ratio), canvas.width - left));
    const height = Math.max(0, Math.min(Math.ceil(input.cssHeight * ratio), canvas.height - top));
    const counts: Record<string, number> = {};
    for (const color of input.colors) counts[color] = 0;
    if (width === 0 || height === 0) return counts;
    const { data } = canvas.getContext("2d")!.getImageData(left, top, width, height);
    for (let offset = 0; offset < data.length; offset += 4) {
      const rgb = `${data[offset]},${data[offset + 1]},${data[offset + 2]}`;
      if (rgb in counts) counts[rgb]!++;
    }
    return counts;
  }, {
    cssLeft,
    cssTop,
    cssWidth,
    cssHeight,
    colors: colors.map(color => color.join(",")),
  });
}

async function cellCounts(
  page: Page,
  column: number,
  row: number,
  colors: readonly (readonly number[])[],
): Promise<Record<string, number>> {
  const current = await state(page);
  return regionCounts(
    page,
    current.gutterWidth + column * current.cellWidth,
    row * current.cellHeight,
    current.cellWidth,
    current.cellHeight,
    colors,
  );
}

async function regionNearCount(
  page: Page,
  cssLeft: number,
  cssTop: number,
  cssWidth: number,
  cssHeight: number,
  target: readonly number[],
  tolerance: number,
): Promise<number> {
  return page.locator("#world").evaluate((element, input) => {
    const canvas = element as HTMLCanvasElement;
    const ratio = Number(canvas.dataset.dpr ?? "1");
    const left = Math.floor(input.cssLeft * ratio);
    const top = Math.floor(input.cssTop * ratio);
    const width = Math.max(0, Math.min(Math.ceil(input.cssWidth * ratio), canvas.width - left));
    const height = Math.max(0, Math.min(Math.ceil(input.cssHeight * ratio), canvas.height - top));
    if (width === 0 || height === 0) return 0;
    const { data } = canvas.getContext("2d")!.getImageData(left, top, width, height);
    let count = 0;
    for (let offset = 0; offset < data.length; offset += 4) {
      if (
        Math.abs(data[offset]! - input.target[0]!) <= input.tolerance
        && Math.abs(data[offset + 1]! - input.target[1]!) <= input.tolerance
        && Math.abs(data[offset + 2]! - input.target[2]!) <= input.tolerance
      ) count++;
    }
    return count;
  }, {
    cssLeft,
    cssTop,
    cssWidth,
    cssHeight,
    target: [...target],
    tolerance,
  });
}

async function cellNear(
  page: Page,
  column: number,
  row: number,
  target: readonly number[],
  tolerance = 16,
): Promise<number> {
  const current = await state(page);
  return regionNearCount(
    page,
    current.gutterWidth + column * current.cellWidth,
    row * current.cellHeight,
    current.cellWidth,
    current.cellHeight,
    target,
    tolerance,
  );
}

async function gutterBandCounts(
  page: Page,
  row: number,
  colors: readonly (readonly number[])[],
): Promise<Record<string, number>> {
  const current = await state(page);
  return regionCounts(page, 0, row * current.cellHeight, current.gutterWidth, current.cellHeight, colors);
}

async function documentMetrics(page: Page): Promise<{ width: number; height: number; scrollWidth: number; scrollHeight: number }> {
  return page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));
}

test("survival draws faint grass, terrain tints and a highlighted four-cell gutter", async ({ page }) => {
  await open(page);
  const current = await state(page);
  expect(current.rules).toBe("survival");
  expect(current.gutterWidth).toBe(48);
  expect({ columns: current.columns, rows: current.rows }).toEqual({ columns: 62, rows: 28 });
  expect({ cameraX: current.cameraX, cameraY: current.cameraY }).toEqual({ cameraX: 0, cameraY: 0 });

  const labels = current.gutter.split(",");
  expect(labels).toHaveLength(current.rows);
  expect(labels.slice(0, 13)).toEqual(["10", "9", "8", "7", "6", "5", "4", "3", "2", "1", "11", "1", "2"]);

  const grass = await cellCounts(page, 13, 11, [groundRgb, backgroundRgb]);
  expect(grass[groundRgb.join(",")]).toBeGreaterThan(0);
  expect(await cellNear(page, 13, 11, grassRgb)).toBeGreaterThan(0);

  const cursor = await cellCounts(page, 13, 10, [cursorRgb]);
  expect(cursor[cursorRgb.join(",")]).toBeGreaterThan(0);
  expect(await cellNear(page, 13, 10, grassRgb)).toBe(0);

  const currentBand = await gutterBandCounts(page, 10, [gutterCurrentRgb]);
  expect(currentBand[gutterCurrentRgb.join(",")]).toBeGreaterThan(0);
  const otherBand = await gutterBandCounts(page, 0, [gutterCurrentRgb]);
  expect(otherBand[gutterCurrentRgb.join(",")]).toBe(0);
});

test("survival gutter numbers follow seven-row and long camera jumps", async ({ page }) => {
  await open(page);
  await page.keyboard.press("7");
  await page.keyboard.press("j");
  let current = await state(page);
  expect({ x: current.x, y: current.y }).toEqual({ x: 13, y: 17 });
  let labels = current.gutter.split(",");
  expect(labels[17]).toBe("18");
  expect(labels[16]).toBe("1");
  expect(labels[18]).toBe("1");
  expect(labels[15]).toBe("2");
  expect(labels[0]).toBe("17");

  await page.keyboard.press("G");
  await page.keyboard.press("$");
  current = await state(page);
  expect({ x: current.x, y: current.y }).toEqual({ x: 239, y: 159 });
  expect({ cameraX: current.cameraX, cameraY: current.cameraY }).toEqual({ cameraX: 178, cameraY: 132 });
  expect(current.position).toBe(159 * 240 + 239);
  labels = current.gutter.split(",");
  expect(labels[0]).toBe("27");
  expect(labels[27]).toBe("160");
});

test("survival gutter survives resize and clamps a tiny world viewport", async ({ page }) => {
  await open(page);
  await page.keyboard.press("G");
  await page.keyboard.press("$");
  await page.setViewportSize({ width: 1000, height: 700 });
  await expect(async () => {
    const resized = await state(page);
    expect({ cameraX: resized.cameraX, cameraY: resized.cameraY }).toEqual({ cameraX: 161, cameraY: 127 });
    expect({ columns: resized.columns, rows: resized.rows }).toEqual({ columns: 79, rows: 33 });
  }).toPass();
  const resized = await state(page);
  const resizedLabels = resized.gutter.split(",");
  expect(resizedLabels[0]).toBe("32");
  expect(resizedLabels[32]).toBe("160");

  await page.setViewportSize({ width: 40, height: 60 });
  await expect(async () => {
    const tiny = await state(page);
    expect({ columns: tiny.columns, rows: tiny.rows }).toEqual({ columns: 1, rows: 1 });
    expect(tiny.gutterWidth).toBe(48);
    expect(tiny.gutter).toBe("160");
  }).toPass();
  const currentBand = await gutterBandCounts(page, 0, [gutterCurrentRgb]);
  expect(currentBand[gutterCurrentRgb.join(",")]).toBeGreaterThan(0);
  const metrics = await documentMetrics(page);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.height);
});

test("survival colors trees green, rocks gray and the lake blue", async ({ page }) => {
  await open(page);
  await page.evaluate(() => window.__vimFlowTest!.load({
    rules: "survival",
    cursor: { x: 80, y: 101 },
  }));
  let current = await state(page);
  expect(await cellNear(page, 80 - current.cameraX, 100 - current.cameraY, treeRgb)).toBeGreaterThan(0);
  expect(await cellNear(page, 80 - current.cameraX, 104 - current.cameraY, rockRgb, 20)).toBeGreaterThan(0);

  await page.evaluate(() => window.__vimFlowTest!.load({
    rules: "survival",
    cursor: { x: 20, y: 59 },
  }));
  current = await state(page);
  expect(await cellNear(page, 20 - current.cameraX, 60 - current.cameraY, waterRgb, 24)).toBeGreaterThan(0);
});

test("the historical default keeps its old viewport without gutter or grass", async ({ page }) => {
  await open(page, "first-playable");
  const current = await state(page);
  expect(current.rules).toBe("first-playable");
  expect(current.gutterWidth).toBe(0);
  expect(current.gutter).toBe("");
  expect({ columns: current.columns, rows: current.rows }).toEqual({ columns: 66, rows: 28 });
  const blank = await cellCounts(page, 13, 11, [grassRgb, groundRgb]);
  expect(blank[grassRgb.join(",")]).toBe(0);
  expect(blank[groundRgb.join(",")]).toBe(0);
});
