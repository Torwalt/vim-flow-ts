import type { Page } from "@playwright/test";
import { expect, test } from "./test";

const backgroundRgb = [17, 23, 20];
const cursorRgb = [245, 196, 81];
const fieldRgb = [217, 221, 203];

type State = {
  x: number;
  y: number;
  position: number;
  mode: string;
  count: number;
  cameraX: number;
  cameraY: number;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  dpr: number;
  siteAtCursor: string;
};

async function open(page: Page): Promise<void> {
  await page.goto("/?clock=manual&rules=first-playable");
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
      mode: canvas.dataset.mode ?? "",
      count: read("count"),
      cameraX: read("cameraX"),
      cameraY: read("cameraY"),
      columns: read("columns"),
      rows: read("rows"),
      cellWidth: read("cellWidth"),
      cellHeight: read("cellHeight"),
      dpr: read("dpr"),
      siteAtCursor: canvas.dataset.siteAtCursor ?? "",
    };
  });
}

async function cellColors(
  page: Page,
  column: number,
  row: number,
): Promise<{ background: number; cursor: number; field: number }> {
  return page.locator("#world").evaluate((element, input) => {
    const canvas = element as HTMLCanvasElement;
    const ratio = Number(canvas.dataset.dpr ?? "1");
    const width = Number(canvas.dataset.cellWidth ?? "12") * ratio;
    const height = Number(canvas.dataset.cellHeight ?? "20") * ratio;
    const left = Math.floor(input.column * width);
    const top = Math.floor(input.row * height);
    const { data } = canvas.getContext("2d")!.getImageData(left, top, Math.ceil(width), Math.ceil(height));
    const counts = { background: 0, cursor: 0, field: 0 };
    for (let offset = 0; offset < data.length; offset += 4) {
      const rgb = `${data[offset]},${data[offset + 1]},${data[offset + 2]}`;
      if (rgb === input.background) counts.background++;
      else if (rgb === input.cursor) counts.cursor++;
      else if (rgb === input.field) counts.field++;
    }
    return counts;
  }, { column, row, background: backgroundRgb.join(","), cursor: cursorRgb.join(","), field: fieldRgb.join(",") });
}

async function documentMetrics(page: Page): Promise<{ width: number; height: number; scrollWidth: number; scrollHeight: number }> {
  return page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));
}

test("fills several window sizes with whole cells and no document scroll", async ({ page }) => {
  await open(page);
  for (const viewport of [{ width: 800, height: 600 }, { width: 400, height: 300 }, { width: 1200, height: 900 }]) {
    await page.setViewportSize(viewport);
    await expect(page.locator("#world")).toHaveAttribute("data-ready", "true");
    const current = await state(page);
    const canvas = await page.locator("#world").boundingBox();
    if (!canvas) throw new Error("The canvas has no layout box.");
    expect(canvas.width).toBeCloseTo(viewport.width, 0);
    expect(canvas.height).toBeCloseTo(viewport.height - 32, 0);
    expect(current.columns).toBe(Math.max(1, Math.floor(canvas.width / current.cellWidth)));
    expect(current.rows).toBe(Math.max(1, Math.floor(canvas.height / current.cellHeight)));
    expect({ cameraX: current.cameraX, cameraY: current.cameraY }).toEqual({ cameraX: 0, cameraY: 0 });
    expect({ x: current.x, y: current.y, mode: current.mode }).toEqual({ x: 13, y: 10, mode: "Normal" });
    const metrics = await documentMetrics(page);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.height);
  }
});

test("draws the real cursor and site glyphs at their screen cells", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await open(page);
  const current = await state(page);
  const cursor = await cellColors(page, current.x - current.cameraX, current.y - current.cameraY);
  expect(cursor.cursor).toBeGreaterThan(0);
  const site = await cellColors(page, 8 - current.cameraX, 8 - current.cameraY);
  expect(site.field).toBeGreaterThan(0);
  expect(site.cursor).toBe(0);
});

test("long jumps pan to the bottom-right edge and clamp inside the world", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await open(page);
  await page.keyboard.press("G");
  await page.keyboard.press("$");
  const current = await state(page);
  expect({ x: current.x, y: current.y }).toEqual({ x: 239, y: 159 });
  expect({ cameraX: current.cameraX, cameraY: current.cameraY }).toEqual({ cameraX: 174, cameraY: 132 });
  expect(current.columns).toBe(66);
  expect(current.rows).toBe(28);
  const cursor = await cellColors(page, current.x - current.cameraX, current.y - current.cameraY);
  expect(cursor.cursor).toBeGreaterThan(0);
  expect(current.siteAtCursor).toBe("");
  const metrics = await documentMetrics(page);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.height);
});

test("resize after an off-fixture long jump keeps core state and refollows", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await open(page);
  await page.keyboard.press("G");
  await page.keyboard.press("$");
  const before = await state(page);
  await page.setViewportSize({ width: 1000, height: 700 });
  await expect(async () => {
    const resized = await state(page);
    expect({ cameraX: resized.cameraX, cameraY: resized.cameraY }).toEqual({ cameraX: 157, cameraY: 127 });
  }).toPass();
  const after = await state(page);
  expect({ x: after.x, y: after.y, position: after.position, mode: after.mode, count: after.count })
    .toEqual({ x: before.x, y: before.y, position: before.position, mode: before.mode, count: before.count });
  expect(after.siteAtCursor).toBe(before.siteAtCursor);
  expect(after.columns).toBe(83);
  expect(after.rows).toBe(33);
  const cursor = await cellColors(page, after.x - after.cameraX, after.y - after.cameraY);
  expect(cursor.cursor).toBeGreaterThan(0);
  const metrics = await documentMetrics(page);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.height);
});

test("a viewport larger than the world keeps camera zero and shows the borders", async ({ page }) => {
  await page.setViewportSize({ width: 2880, height: 3232 });
  await open(page);
  const initial = await state(page);
  expect({ cameraX: initial.cameraX, cameraY: initial.cameraY }).toEqual({ cameraX: 0, cameraY: 0 });
  expect(initial.columns).toBe(240);
  expect(initial.rows).toBe(160);
  await page.keyboard.press("G");
  await page.keyboard.press("$");
  const current = await state(page);
  expect({ x: current.x, y: current.y }).toEqual({ x: 239, y: 159 });
  expect({ cameraX: current.cameraX, cameraY: current.cameraY }).toEqual({ cameraX: 0, cameraY: 0 });
  const border = await cellColors(page, 0, 0);
  expect(border.field).toBeGreaterThan(0);
  const cursor = await cellColors(page, current.x, current.y);
  expect(cursor.cursor).toBeGreaterThan(0);
});

test("a very small window still shows at least one clipped cell", async ({ page }) => {
  await page.setViewportSize({ width: 40, height: 60 });
  await open(page);
  const current = await state(page);
  expect(current.columns).toBeGreaterThanOrEqual(1);
  expect(current.rows).toBeGreaterThanOrEqual(1);
  expect(current.columns).toBe(3);
  expect(current.rows).toBe(1);
  const cursor = await cellColors(page, current.x - current.cameraX, current.y - current.cameraY);
  expect(cursor.cursor).toBeGreaterThan(0);
  const metrics = await documentMetrics(page);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.height);
});

test.describe("device pixel ratio", () => {
  test.use({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 2 });

  test("backs the canvas at the device ratio and keeps CSS cell coordinates", async ({ page }) => {
    await open(page);
    const current = await state(page);
    const canvas = await page.locator("#world").boundingBox();
    if (!canvas) throw new Error("The canvas has no layout box.");
    const backing = await page.locator("#world").evaluate((element) => {
      const value = element as HTMLCanvasElement;
      return { width: value.width, height: value.height };
    });
    expect(current.dpr).toBe(2);
    expect(backing.width).toBe(Math.round(canvas.width * 2));
    expect(backing.height).toBe(Math.round(canvas.height * 2));
    expect(current.cellWidth).toBe(12);
    expect(current.cellHeight).toBe(20);
    const cursor = await cellColors(page, current.x - current.cameraX, current.y - current.cameraY);
    expect(cursor.cursor).toBeGreaterThan(0);
    const site = await cellColors(page, 8 - current.cameraX, 8 - current.cameraY);
    expect(site.field).toBeGreaterThan(0);
  });
});
