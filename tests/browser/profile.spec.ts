import type { Page } from "@playwright/test";
import { expect, test } from "./test";

async function open(page: Page, rules: string): Promise<void> {
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto(`/?clock=manual&rules=${rules}`);
  await expect(page.locator("#world")).toHaveAttribute("data-ready", "true");
}

test("the browser defaults to survival when no rules are selected", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto("/?clock=manual");
  const canvas = page.locator("#world");
  await expect(canvas).toHaveAttribute("data-ready", "true");
  await expect(canvas).toHaveAttribute("data-rules", "survival");
  await expect(canvas).toHaveAttribute("data-site-at-cursor", "");
  const observation = await page.evaluate(() => window.__vimFlowTest!.observe());
  expect(observation.siteCount).toBe(0);
});

test("the historical profile remains selectable and keeps its fixed sites", async ({ page }) => {
  await open(page, "first-playable");
  const canvas = page.locator("#world");
  await expect(canvas).toHaveAttribute("data-rules", "first-playable");
  await expect(canvas).toHaveAttribute("data-site-at-cursor", "a01");
  await expect(canvas).toHaveAttribute("data-building-count", "0");
  const observation = await page.evaluate(() => window.__vimFlowTest!.observe());
  expect(observation.siteCount).toBe(8);
  expect(observation.cursor).toEqual({ x: 13, y: 10 });
});

test("the survival profile constructs a world without fixed sites", async ({ page }) => {
  await open(page, "survival");
  const canvas = page.locator("#world");
  await expect(canvas).toHaveAttribute("data-rules", "survival");
  await expect(canvas).toHaveAttribute("data-site-at-cursor", "");
  await expect(canvas).toHaveAttribute("data-building-count", "0");
  const observation = await page.evaluate(() => window.__vimFlowTest!.observe());
  expect(observation.siteCount).toBe(0);
  expect(observation.sites).toEqual({});
  expect(observation.cursor).toEqual({ x: 13, y: 10 });
});
