import type { Page } from "@playwright/test";
import { expect, test } from "./test";

const backgroundRgb = [17, 23, 20];
const fieldRgb = [217, 221, 203];
const cursorRgb = [245, 196, 81];
const previewRgb = [143, 179, 199];

type ConstructionState = {
  x: number;
  y: number;
  mode: string;
  menuSelection: string;
  buildTarget: string;
  buildingCount: number;
  notice: string;
  siteAtCursor: string;
  cameraX: number;
  cameraY: number;
  cellWidth: number;
  cellHeight: number;
  dpr: number;
};

async function open(page: Page): Promise<void> {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/?clock=manual");
  await expect(page.locator("#world")).toHaveAttribute("data-ready", "true");
  await page.locator("#world").click({ position: { x: 8, y: 8 } });
}

async function state(page: Page): Promise<ConstructionState> {
  return page.locator("#world").evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const read = (name: string): number => Number(canvas.dataset[name] ?? "0");
    return {
      x: read("cursorX"),
      y: read("cursorY"),
      mode: canvas.dataset.mode ?? "",
      menuSelection: canvas.dataset.menuSelection ?? "",
      buildTarget: canvas.dataset.buildTarget ?? "",
      buildingCount: read("buildingCount"),
      notice: canvas.dataset.notice ?? "",
      siteAtCursor: canvas.dataset.siteAtCursor ?? "",
      cameraX: read("cameraX"),
      cameraY: read("cameraY"),
      cellWidth: read("cellWidth"),
      cellHeight: read("cellHeight"),
      dpr: read("dpr"),
    };
  });
}

async function cellColors(page: Page, column: number, row: number): Promise<Record<string, number>> {
  return page.locator("#world").evaluate((element, input) => {
    const canvas = element as HTMLCanvasElement;
    const ratio = Number(canvas.dataset.dpr ?? "1");
    const width = Number(canvas.dataset.cellWidth ?? "12") * ratio;
    const height = Number(canvas.dataset.cellHeight ?? "20") * ratio;
    const left = Math.floor(input.column * width);
    const top = Math.floor(input.row * height);
    const { data } = canvas.getContext("2d")!.getImageData(left, top, Math.ceil(width), Math.ceil(height));
    const counts: Record<string, number> = { background: 0, field: 0, cursor: 0, preview: 0 };
    for (let offset = 0; offset < data.length; offset += 4) {
      const rgb = `${data[offset]},${data[offset + 1]},${data[offset + 2]}`;
      if (rgb === input.background) counts.background!++;
      else if (rgb === input.field) counts.field!++;
      else if (rgb === input.cursor) counts.cursor!++;
      else if (rgb === input.preview) counts.preview!++;
    }
    return counts;
  }, {
    column,
    row,
    background: backgroundRgb.join(","),
    field: fieldRgb.join(","),
    cursor: cursorRgb.join(","),
    preview: previewRgb.join(","),
  });
}

async function worldCell(page: Page, x: number, y: number): Promise<Record<string, number>> {
  const current = await state(page);
  return cellColors(page, x - current.cameraX, y - current.cameraY);
}

test("the Build menu previews the core well silhouette and Enter commits the glyph change", async ({ page }) => {
  await open(page);
  await page.keyboard.press(" ");
  expect((await state(page)).mode).toBe("Leader");

  await page.keyboard.press("f");
  let current = await state(page);
  expect({ mode: current.mode, menu: current.menuSelection, target: current.buildTarget, buildings: current.buildingCount })
    .toEqual({ mode: "Build", menu: "well", target: "a01", buildings: 0 });
  expect(current.notice).toContain("WELL");
  await expect(page.locator("#hud-site")).toContainText("a01 WELL PREVIEW");
  const preview = await worldCell(page, 11, 12);
  expect(preview.preview).toBeGreaterThan(0);
  expect(preview.field).toBe(0);

  await page.keyboard.press("r");
  current = await state(page);
  expect(current.menuSelection).toBe("ring");
  expect(current.buildingCount).toBe(0);
  expect((await worldCell(page, 11, 12)).preview).toBeGreaterThan(0);

  await page.keyboard.press("Enter");
  current = await state(page);
  expect({ mode: current.mode, menu: current.menuSelection, target: current.buildTarget, buildings: current.buildingCount })
    .toEqual({ mode: "Normal", menu: "", target: "", buildings: 1 });
  expect(current.notice).toContain("RING");
  const built = await worldCell(page, 11, 12);
  expect(built.field).toBeGreaterThan(0);
  expect(built.preview).toBe(0);
});

test("a built well keeps its glyph after the cursor leaves and changing the menu never constructs", async ({ page }) => {
  await open(page);
  await page.keyboard.press(" ");
  await page.keyboard.press("f");
  await page.keyboard.press("w");
  await page.keyboard.press("Enter");
  let current = await state(page);
  expect(current.buildingCount).toBe(1);
  expect(current.notice).toContain("WELL");

  await page.keyboard.press("6");
  await page.keyboard.press("l");
  current = await state(page);
  expect({ x: current.x, y: current.y }).toEqual({ x: 19, y: 10 });
  const well = await worldCell(page, 11, 12);
  expect(well.field).toBeGreaterThan(0);
  expect(well.cursor).toBe(0);
});

test("an outside target reports an error and menu Escape cancels without construction", async ({ page }) => {
  await open(page);
  await page.keyboard.press("6");
  await page.keyboard.press("l");
  await page.keyboard.press(" ");
  await page.keyboard.press("f");
  let current = await state(page);
  expect({ mode: current.mode, buildings: current.buildingCount, target: current.buildTarget })
    .toEqual({ mode: "Normal", buildings: 0, target: "" });
  expect(current.notice).toContain("No site");
  await expect(page.locator("#hud-notice")).toContainText("No site");

  await page.keyboard.press("6");
  await page.keyboard.press("h");
  await page.keyboard.press(" ");
  await page.keyboard.press("f");
  await page.keyboard.press("r");
  current = await state(page);
  expect({ mode: current.mode, menu: current.menuSelection, target: current.buildTarget })
    .toEqual({ mode: "Build", menu: "ring", target: "a01" });
  await page.keyboard.press("Escape");
  current = await state(page);
  expect({ mode: current.mode, menu: current.menuSelection, target: current.buildTarget, buildings: current.buildingCount })
    .toEqual({ mode: "Normal", menu: "", target: "", buildings: 0 });
  const empty = await worldCell(page, 11, 12);
  expect(empty.preview).toBe(0);
  expect(empty.field).toBe(0);
});

test("confirming on an occupied site rejects the ring and keeps the well", async ({ page }) => {
  await open(page);
  await page.keyboard.press(" ");
  await page.keyboard.press("f");
  await page.keyboard.press("Enter");
  await page.keyboard.press(" ");
  await page.keyboard.press("f");
  await page.keyboard.press("r");
  await page.keyboard.press("Enter");
  const current = await state(page);
  expect({ mode: current.mode, buildings: current.buildingCount }).toEqual({ mode: "Normal", buildings: 1 });
  expect(current.notice).toContain("occupied");
  await expect(page.locator("#hud-notice")).toContainText("occupied");
});
