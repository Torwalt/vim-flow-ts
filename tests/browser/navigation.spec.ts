import type { Page } from "@playwright/test";
import { expect, test } from "./test";

const cursorRgb = [245, 196, 81];
const backgroundRgb = [17, 23, 20];

type Observation = {
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
};
type Cell = { row: number; column: number };

async function open(page: Page): Promise<void> {
  await page.goto("/?clock=manual");
  await expect(page.locator("#world")).toHaveAttribute("data-ready", "true");
  await page.locator("#world").click({ position: { x: 8, y: 8 } });
}

async function observation(page: Page): Promise<Observation> {
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
    const ratio = Number(canvas.dataset.dpr ?? "1");
    const cellWidth = Number(canvas.dataset.cellWidth ?? "12") * ratio;
    const cellHeight = Number(canvas.dataset.cellHeight ?? "20") * ratio;
    return {
      column: Math.floor((left + right + 1) / 2 / cellWidth),
      row: Math.floor((top + bottom + 1) / 2 / cellHeight),
    };
  }, cursorRgb);
}

async function expectView(
  page: Page,
  x: number,
  y: number,
  mode: string,
  count: number,
): Promise<void> {
  const state = await observation(page);
  expect({ x: state.x, y: state.y, mode: state.mode, count: state.count }).toEqual({ x, y, mode, count });
  expect(state.position).toBe(y * 240 + x);
  expect(await cursorCell(page)).toEqual({ row: y - state.cameraY, column: x - state.cameraX });
}

test("draws the new world, its sites and the cursor at the initial position", async ({ page }) => {
  await open(page);
  await expectView(page, 13, 10, "Normal", 0);
  const state = await observation(page);
  expect(state.cameraX).toBe(0);
  expect(state.cameraY).toBe(0);
  expect(state.columns * state.cellWidth).toBeLessThanOrEqual(1280);
  expect(state.rows * state.cellHeight).toBeLessThanOrEqual(720);
  expect(await page.locator("#world").getAttribute("data-site-at-cursor")).toBe("a01");

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
  await expectView(page, 13, 15, "Normal", 0);
});

test("Shift+w selects the next WORD start across the larger world", async ({ page }) => {
  await open(page);
  await page.keyboard.press("Shift+KeyW");
  await expectView(page, 37, 10, "Normal", 0);
});

test("counted find hits only the current 240-cell row and preserves a miss", async ({ page }) => {
  await open(page);
  await page.keyboard.press("G");
  await expectView(page, 0, 159, "Normal", 0);
  await page.keyboard.press("2");
  await page.keyboard.press("f");
  await page.keyboard.press("#");
  await expectView(page, 2, 159, "Normal", 0);

  await page.keyboard.press("$");
  await expectView(page, 239, 159, "Normal", 0);
  await page.keyboard.press("2");
  await page.keyboard.press("F");
  await page.keyboard.press("#");
  await expectView(page, 237, 159, "Normal", 0);
});

test("a miss on an empty row keeps the cursor without leaving Normal", async ({ page }) => {
  await open(page);
  await page.keyboard.press("2");
  await page.keyboard.press("f");
  await page.keyboard.press("x");
  await expectView(page, 13, 10, "Normal", 0);
});

test("F observes FindLeft and completes a literal backward target", async ({ page }) => {
  await open(page);
  await page.keyboard.press("F");
  await expectView(page, 13, 10, "FindLeft", 1);
  await page.keyboard.press("Escape");
  await expectView(page, 13, 10, "Normal", 0);

  await page.keyboard.press("$");
  await expectView(page, 239, 10, "Normal", 0);
  await page.keyboard.press("F");
  await page.keyboard.press(" ");
  await expectView(page, 238, 10, "Normal", 0);
});

test("gg returns to the first row and 3G jumps to the third", async ({ page }) => {
  await open(page);
  for (let step = 0; step < 5; step++) await page.keyboard.press("j");
  await expectView(page, 13, 15, "Normal", 0);
  await page.keyboard.press("g");
  await page.keyboard.press("g");
  await expectView(page, 0, 0, "Normal", 0);
  await page.keyboard.press("3");
  await page.keyboard.press("G");
  await expectView(page, 0, 2, "Normal", 0);
});

test("Escape clears counts and prefixes without moving", async ({ page }) => {
  await open(page);
  await page.keyboard.press("2");
  await page.keyboard.press("f");
  await expectView(page, 13, 10, "FindRight", 2);
  await page.keyboard.press("Escape");
  await expectView(page, 13, 10, "Normal", 0);

  await page.keyboard.press("2");
  await page.keyboard.press("g");
  await expectView(page, 13, 10, "Go", 2);
  await page.keyboard.press("Escape");
  await expectView(page, 13, 10, "Normal", 0);
});

test("blocked modifier chords leave a pending count unchanged", async ({ page }) => {
  await open(page);
  await page.keyboard.press("2");
  await page.keyboard.down("Control");
  await page.keyboard.press("j");
  await page.keyboard.up("Control");
  await expectView(page, 13, 10, "Normal", 2);

  for (const modifier of ["altKey", "metaKey"] as const) {
    await page.locator("#world").evaluate((element, key) => {
      element.dispatchEvent(new KeyboardEvent("keydown", { key: "j", bubbles: true, cancelable: true, [key]: true }));
    }, modifier);
    await expectView(page, 13, 10, "Normal", 2);
  }

  await page.keyboard.press("j");
  await expectView(page, 13, 12, "Normal", 0);
});

test("blur cancels pending count, find and go prefixes without moving", async ({ page }) => {
  await open(page);
  await page.keyboard.press("2");
  await expectView(page, 13, 10, "Normal", 2);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expectView(page, 13, 10, "Normal", 0);

  await page.keyboard.press("2");
  await page.keyboard.press("f");
  await expectView(page, 13, 10, "FindRight", 2);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expectView(page, 13, 10, "Normal", 0);

  await page.keyboard.press("2");
  await page.keyboard.press("F");
  await expectView(page, 13, 10, "FindLeft", 2);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expectView(page, 13, 10, "Normal", 0);

  await page.keyboard.press("2");
  await page.keyboard.press("g");
  await expectView(page, 13, 10, "Go", 2);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expectView(page, 13, 10, "Normal", 0);
});

test("blocked modified keys and Other input leave a pending find unchanged", async ({ page }) => {
  await open(page);
  await page.keyboard.press("2");
  await page.keyboard.press("f");
  await expectView(page, 13, 10, "FindRight", 2);

  await page.keyboard.down("Control");
  await page.keyboard.press("Escape");
  await page.keyboard.up("Control");
  await expectView(page, 13, 10, "FindRight", 2);

  for (const key of ["Backspace", "Enter"]) {
    await page.locator("#world").evaluate((element, value) => {
      element.dispatchEvent(new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true, ctrlKey: true }));
    }, key);
    await expectView(page, 13, 10, "FindRight", 2);
  }

  await page.locator("#world").evaluate((element) => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", bubbles: true, cancelable: true }));
  });
  await expectView(page, 13, 10, "FindRight", 2);

  await page.keyboard.press("x");
  await expectView(page, 13, 10, "Normal", 0);
});

test("only the focused canvas captures game keys", async ({ page }) => {
  await open(page);
  await page.locator("#hud").click();
  await expect(page.locator("#world")).not.toBeFocused();
  await page.keyboard.press("l");
  await expectView(page, 13, 10, "Normal", 0);

  await page.locator("#world").click({ position: { x: 8, y: 8 } });
  await page.keyboard.press("l");
  await expectView(page, 14, 10, "Normal", 0);
});

test("composed keydowns are ignored until one logical character commits", async ({ page }) => {
  await open(page);
  await page.keyboard.press("2");
  await page.locator("#world").evaluate((element) => {
    element.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "j", bubbles: true, isComposing: true }));
    element.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "j" }));
  });
  await expectView(page, 13, 12, "Normal", 0);

  await page.keyboard.press("3");
  await page.locator("#world").evaluate((element) => {
    element.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    element.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "jk" }));
  });
  await expectView(page, 13, 12, "Normal", 3);
  await page.keyboard.press("Escape");
  await expectView(page, 13, 12, "Normal", 0);
});

test("the canvas responds without drawing the old 40x20 fixture", async ({ page }) => {
  await open(page);
  const background = await page.locator("#world").evaluate((element, rgb) => {
    const canvas = element as HTMLCanvasElement;
    const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
    let count = 0;
    for (let offset = 0; offset < data.length; offset += 4) {
      if (data[offset] === rgb[0] && data[offset + 1] === rgb[1] && data[offset + 2] === rgb[2]) count++;
    }
    return count;
  }, backgroundRgb);
  expect(background).toBeGreaterThan(0);
  expect(await page.locator("text=40 × 20").count()).toBe(0);
});
