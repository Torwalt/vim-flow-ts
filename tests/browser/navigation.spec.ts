import type { Page } from "@playwright/test";
import { expect, test } from "./test";

const cursorRgb = [245, 196, 81];
const columns = 40;

type Observation = { position: number; mode: string; count: number; row: number; column: number };
type Cell = { row: number; column: number };

async function open(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("#world")).toHaveAttribute("data-ready", "true");
  await page.locator("#world").click({ position: { x: 8, y: 8 } });
}

async function observation(page: Page): Promise<Observation> {
  return page.locator("#world").evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    return {
      position: Number(canvas.dataset.position),
      mode: canvas.dataset.mode ?? "",
      count: Number(canvas.dataset.count),
      row: Number(canvas.dataset.row),
      column: Number(canvas.dataset.column),
    };
  });
}

async function cursorCell(page: Page): Promise<Cell> {
  return page.locator("#world").evaluate((element, rgb) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext("2d")!;
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (let offset = 0; offset < data.length; offset += 4) {
      if (data[offset] !== rgb[0] || data[offset + 1] !== rgb[1] || data[offset + 2] !== rgb[2]) continue;
      const pixel = offset / 4;
      const x = pixel % canvas.width;
      const y = Math.floor(pixel / canvas.width);
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
    if (!Number.isFinite(left)) throw new Error("No cursor pixels were drawn.");
    const cellWidth = canvas.width / 40;
    const cellHeight = canvas.height / 20;
    return {
      column: Math.floor((left + right + 1) / 2 / cellWidth),
      row: Math.floor((top + bottom + 1) / 2 / cellHeight),
    };
  }, cursorRgb);
}

async function expectView(page: Page, position: number, mode: string, count: number): Promise<void> {
  const state = await observation(page);
  expect(state).toEqual({
    position,
    mode,
    count,
    row: Math.floor(position / columns),
    column: position % columns,
  });
  expect(await cursorCell(page)).toEqual({ row: Math.floor(position / columns), column: position % columns });
}

test("draws the seeded field and cursor at the initial position", async ({ page }) => {
  await open(page);
  await expectView(page, 0, "Normal", 0);

  const colors = await page.locator("#world").evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
    const distinct = new Set<string>();
    for (let offset = 0; offset < data.length; offset += 4) {
      distinct.add(`${data[offset]},${data[offset + 1]},${data[offset + 2]}`);
    }
    return distinct.size;
  });
  expect(colors).toBeGreaterThan(2);
});

test("5j moves five rows down and redraws the cursor", async ({ page }) => {
  await open(page);
  await page.keyboard.press("5");
  await page.keyboard.press("j");
  await expectView(page, 200, "Normal", 0);
});

test("Shift+w selects the next WORD start", async ({ page }) => {
  await open(page);
  await page.keyboard.press("Shift+KeyW");
  await expectView(page, 6, "Normal", 0);
});

test("2fx counts literal hits on the current row and preserves a miss", async ({ page }) => {
  await open(page);
  await page.keyboard.press("2");
  await page.keyboard.press("f");
  await page.keyboard.press("x");
  await expectView(page, 0, "Normal", 0);

  await page.keyboard.press("j");
  await expectView(page, 40, "Normal", 0);
  await page.keyboard.press("2");
  await page.keyboard.press("f");
  await page.keyboard.press("x");
  await expectView(page, 71, "Normal", 0);
});

test("F observes FindLeft and completes a literal backward target", async ({ page }) => {
  await open(page);
  await page.keyboard.press("F");
  await expectView(page, 0, "FindLeft", 1);
  await page.keyboard.press("Escape");

  await page.keyboard.press("$");
  await expectView(page, 39, "Normal", 0);
  await page.keyboard.press("F");
  await page.keyboard.press(" ");
  await expectView(page, 38, "Normal", 0);
});

test("gg returns to the first row and 3G jumps to the third", async ({ page }) => {
  await open(page);
  for (let step = 0; step < 5; step++) await page.keyboard.press("j");
  await expectView(page, 200, "Normal", 0);
  await page.keyboard.press("g");
  await page.keyboard.press("g");
  await expectView(page, 0, "Normal", 0);
  await page.keyboard.press("3");
  await page.keyboard.press("G");
  await expectView(page, 80, "Normal", 0);
});

test("Escape clears counts and prefixes without moving", async ({ page }) => {
  await open(page);
  await page.keyboard.press("2");
  await page.keyboard.press("f");
  await expectView(page, 0, "FindRight", 2);
  await page.keyboard.press("Escape");
  await expectView(page, 0, "Normal", 0);

  await page.keyboard.press("2");
  await page.keyboard.press("g");
  await expectView(page, 0, "Go", 2);
  await page.keyboard.press("Escape");
  await expectView(page, 0, "Normal", 0);
});

test("blocked modifier chords leave a pending count unchanged", async ({ page }) => {
  await open(page);
  await page.keyboard.press("2");
  await page.keyboard.down("Control");
  await page.keyboard.press("j");
  await page.keyboard.up("Control");
  await expectView(page, 0, "Normal", 2);

  for (const modifier of ["altKey", "metaKey"] as const) {
    await page.locator("#world").evaluate((element, key) => {
      element.dispatchEvent(new KeyboardEvent("keydown", { key: "j", bubbles: true, cancelable: true, [key]: true }));
    }, modifier);
    await expectView(page, 0, "Normal", 2);
  }

  await page.keyboard.press("j");
  await expectView(page, 80, "Normal", 0);
});

test("blur cancels a pending prefix and keeps the cursor", async ({ page }) => {
  await open(page);
  await page.keyboard.press("2");
  await page.keyboard.press("g");
  await expectView(page, 0, "Go", 2);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expectView(page, 0, "Normal", 0);
});

test("composed keydowns are ignored until the logical character commits", async ({ page }) => {
  await open(page);
  await page.keyboard.press("2");
  await page.locator("#world").evaluate((element) => {
    element.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "j", bubbles: true, isComposing: true }));
    element.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "j" }));
  });
  await expectView(page, 0, "Normal", 2);
  await page.keyboard.press("j");
  await expectView(page, 80, "Normal", 0);
});
