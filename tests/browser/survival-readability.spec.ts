import type { Page } from "@playwright/test";
import { CURSOR_MAX_HP } from "../../src/core/game";
import { expect, test } from "./test";

const longWellName = "Very-Long_Well_Name1";
const longRingName = "Second-Long-Ring-01";
const viewports = [
  { width: 600, height: 600 },
  { width: 800, height: 600 },
  { width: 1000, height: 700 },
  { width: 1280, height: 720 },
];

type Viewport = { readonly width: number; readonly height: number };

type BoxMetrics = {
  readonly display: string;
  readonly visibility: string;
  readonly opacity: string;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly scrollWidth: number;
  readonly scrollHeight: number;
  readonly clientWidth: number;
  readonly clientHeight: number;
};

async function open(page: Page, viewport: Viewport): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto("/?clock=manual&rules=survival");
  await expect(page.locator("#world")).toHaveAttribute("data-ready", "true");
  await page.locator("#world").click({ position: { x: 8, y: 8 } });
}

async function key(page: Page, value: string): Promise<void> {
  await page.keyboard.press(value);
}

async function typeKeys(page: Page, value: string): Promise<void> {
  for (const character of Array.from(value)) await page.keyboard.press(character);
}

async function expectReadable(page: Page, selector: string, viewport: Viewport): Promise<void> {
  const metrics = await page.locator(selector).evaluate((element): BoxMetrics => {
    const node = element as HTMLElement;
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return {
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      scrollWidth: node.scrollWidth,
      scrollHeight: node.scrollHeight,
      clientWidth: node.clientWidth,
      clientHeight: node.clientHeight,
    };
  });
  expect(metrics.display).not.toBe("none");
  expect(metrics.visibility).not.toBe("hidden");
  expect(Number(metrics.opacity)).toBeGreaterThan(0);
  expect(metrics.left).toBeGreaterThanOrEqual(0);
  expect(metrics.top).toBeGreaterThanOrEqual(0);
  expect(metrics.right).toBeLessThanOrEqual(viewport.width + 0.5);
  expect(metrics.bottom).toBeLessThanOrEqual(viewport.height + 0.5);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
}

async function expectNoDocumentScroll(page: Page, viewport: Viewport): Promise<void> {
  const metrics = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  expect(metrics.width).toBe(viewport.width);
  expect(metrics.height).toBe(viewport.height);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.height);
}

test.describe("survival prompts and status", () => {
  for (const viewport of viewports) {
    test(`stay readable with prompts, long names and a staged source at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await open(page, viewport);

      await expect(page.locator("#survival-status-hp")).toContainText(`HP ${CURSOR_MAX_HP}/${CURSOR_MAX_HP}`);
      await expect(page.locator("#survival-status-wave")).toContainText("wave 0 · next 30.0s");
      await expect(page.locator("#survival-status-kills")).toContainText("kills 0");
      await expect(page.locator("#survival-status-pop")).toContainText("allies 0 · enemies 0");
      await expect(page.locator("#survival-status-rally")).toContainText("rally 13,10");
      await expect(page.locator("#survival-status-clock")).toContainText("0.0s · running");
      await expect(page.locator("#survival-status-legend")).toContainText("ally _ cyan");
      await expect(page.locator("#survival-status-hint")).toContainText("i rally Enter");
      await expectReadable(page, "#survival-overlay", viewport);
      await expectReadable(page, "#survival-status", viewport);
      await expectNoDocumentScroll(page, viewport);

      await key(page, "p");
      await expect(page.locator("#survival-status-clock")).toContainText("paused");
      await expectReadable(page, "#survival-status", viewport);
      await key(page, "p");
      await expect(page.locator("#survival-status-clock")).toContainText("running");

      await key(page, "i");
      await typeKeys(page, "mana");
      await expect(page.locator("#survival-prompt-title")).toContainText("INSERT");
      await expect(page.locator("#survival-prompt-text")).toContainText("mana well");
      await expect(page.locator("#survival-prompt-text")).toContainText("Tab complete");
      await expect(page.locator("#survival-prompt-text")).toContainText("Enter commit");
      await expect(page.locator("#survival-prompt-text")).toContainText("Esc cancel");
      await expectReadable(page, "#survival-prompt", viewport);
      await expectReadable(page, "#survival-overlay", viewport);
      await key(page, "Escape");
      await expect(page.locator("#survival-prompt")).toBeHidden();

      await key(page, "i");
      await typeKeys(page, "nope");
      await key(page, "Enter");
      await expect(page.locator("#survival-notice")).toContainText("Unknown command");
      await expectReadable(page, "#survival-prompt", viewport);
      await expectReadable(page, "#survival-overlay", viewport);

      await key(page, "i");
      await typeKeys(page, "mana well");
      await key(page, "Enter");
      await typeKeys(page, longWellName);
      await expect(page.locator("#survival-prompt-title")).toContainText("NAME b001");
      await expect(page.locator("#survival-prompt-text")).toContainText(`name ${longWellName}`);
      await expect(page.locator("#survival-prompt-text")).toContainText("Enter save");
      await expect(page.locator("#survival-prompt-text")).toContainText("Esc default");
      await expectReadable(page, "#survival-prompt", viewport);
      await expectReadable(page, "#survival-overlay", viewport);
      await key(page, "Enter");
      await expect(page.locator("#survival-prompt-title")).toContainText(longWellName);
      await expectReadable(page, "#survival-prompt", viewport);

      for (let step = 0; step < 12; step++) await key(page, "l");
      await key(page, "i");
      await typeKeys(page, "summoning ring");
      await key(page, "Enter");
      await typeKeys(page, longRingName);
      await key(page, "Enter");

      for (let step = 0; step < 12; step++) await key(page, "h");
      await key(page, "i");
      await typeKeys(page, "connect");
      await key(page, "Enter");
      await expect(page.locator("#survival-status-source")).toContainText("b001");
      await expectReadable(page, "#survival-status", viewport);

      for (let step = 0; step < 12; step++) await key(page, "l");
      await expect(page.locator("#survival-status-source")).toContainText("b001");
      await key(page, "i");
      await expect(page.locator("#survival-prompt-text")).toContainText("connect");
      await expect(page.locator("#survival-prompt-text")).toContainText("rally");
      await expectReadable(page, "#survival-prompt", viewport);
      await key(page, "Escape");
      await expect(page.locator("#survival-status-source")).toContainText("b001");

      await page.evaluate(spec => window.__vimFlowTest!.load(spec), {
        rules: "survival",
        buildings: [{ id: "b001", kind: "ring", center: { x: 37, y: 10 }, produced: 1 }],
        troops: [{ faction: "ally", ring: "b001", serial: 1, x: 14, y: 10 }],
      });
      await expect(page.locator("#survival-status-hp")).toContainText("near ally b001#1");
      await expectReadable(page, "#survival-status", viewport);
      await expectReadable(page, "#survival-overlay", viewport);
      await expectNoDocumentScroll(page, viewport);
    });
  }
});
