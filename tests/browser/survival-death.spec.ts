import type { Page } from "@playwright/test";
import { expect, test } from "./test";

async function open(page: Page): Promise<void> {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/?clock=manual");
  await expect(page.locator("#world")).toHaveAttribute("data-ready", "true");
  await page.locator("#world").click({ position: { x: 8, y: 8 } });
}

async function observe(page: Page) {
  return page.evaluate(() => window.__vimFlowTest!.observe());
}

async function typeKeys(page: Page, value: string): Promise<void> {
  for (const character of Array.from(value)) await page.keyboard.press(character);
}

test("real Enter restarts after input death without clock catch-up", async ({ page }) => {
  await open(page);
  await page.evaluate(spec => window.__vimFlowTest!.load(spec), {
    rules: "survival",
    cursor: { x: 50, y: 50 },
    cursorHp: 1,
    remainderMs: 60,
    buildings: [{ id: "b001", kind: "well", center: { x: 13, y: 10 } }],
    pendingSource: "b001",
    troops: [{ faction: "enemy", id: "e1", x: 51, y: 50 }],
  });

  await page.keyboard.press("l");
  let current = await observe(page);
  expect({
    gameOver: current.gameOver,
    cursorHp: current.cursorHp,
    cursor: current.cursor,
    mode: current.mode,
    pendingSource: current.pendingSource,
    remainderMs: current.remainderMs,
  }).toEqual({
    gameOver: true,
    cursorHp: 0,
    cursor: { x: 50, y: 50 },
    mode: "Normal",
    pendingSource: null,
    remainderMs: 0,
  });
  await expect(page.locator("#hud-notice")).toContainText("Game over");
  await expect(page.locator("#hud-clock")).toContainText("game over");

  await page.evaluate(() => window.__vimFlowTest!.advance(10_000));
  current = await observe(page);
  expect({ ticks: current.elapsedTicks, remainder: current.remainderMs }).toEqual({ ticks: 0, remainder: 0 });

  await page.keyboard.press("l");
  expect((await observe(page)).cursorHp).toBe(0);
  await page.keyboard.press("Enter");
  current = await observe(page);
  expect({
    gameOver: current.gameOver,
    cursorHp: current.cursorHp,
    cursor: current.cursor,
    ticks: current.elapsedTicks,
    remainder: current.remainderMs,
    troops: current.troops.length,
  }).toEqual({
    gameOver: false,
    cursorHp: 10,
    cursor: { x: 13, y: 10 },
    ticks: 0,
    remainder: 0,
    troops: 0,
  });

  await page.evaluate(() => window.__vimFlowTest!.advance(99));
  current = await observe(page);
  expect({ ticks: current.elapsedTicks, remainder: current.remainderMs }).toEqual({ ticks: 0, remainder: 99 });
  await page.evaluate(() => window.__vimFlowTest!.advance(1));
  current = await observe(page);
  expect({ ticks: current.elapsedTicks, remainder: current.remainderMs }).toEqual({ ticks: 1, remainder: 0 });
});

test("typing keeps time running, and a lethal tick cancels the draft", async ({ page }) => {
  await open(page);
  await page.evaluate(spec => window.__vimFlowTest!.load(spec), {
    rules: "survival",
    cursor: { x: 50, y: 50 },
    cursorHp: 1,
    troops: [{ faction: "enemy", id: "e1", x: 51, y: 50 }],
  });

  await page.keyboard.press("i");
  await typeKeys(page, "mana");
  let current = await observe(page);
  expect({ mode: current.mode, draft: current.commandBuffer }).toEqual({ mode: "Insert", draft: "mana" });

  await page.evaluate(() => window.__vimFlowTest!.advance(100));
  current = await observe(page);
  expect({
    gameOver: current.gameOver,
    mode: current.mode,
    draft: current.commandBuffer,
    ticks: current.elapsedTicks,
    remainder: current.remainderMs,
  }).toEqual({ gameOver: true, mode: "Normal", draft: "", ticks: 1, remainder: 0 });

  await page.evaluate(() => window.__vimFlowTest!.advance(5_000));
  current = await observe(page);
  expect({ ticks: current.elapsedTicks, remainder: current.remainderMs }).toEqual({ ticks: 1, remainder: 0 });
});
