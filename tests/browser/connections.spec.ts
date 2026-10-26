import type { Page } from "@playwright/test";
import { expect, test } from "./test";

const linkRgb = [93, 140, 158];
const linkSelectedRgb = [143, 211, 192];
const sourceRgb = [217, 160, 91];

type ConnectionState = {
  x: number;
  y: number;
  mode: string;
  pendingSource: string;
  commandBuffer: string;
  insertSite: string;
  links: string;
  linkCount: number;
  sourceHighlight: string;
  buildingCount: number;
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

async function state(page: Page): Promise<ConnectionState> {
  return page.locator("#world").evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const read = (name: string): number => Number(canvas.dataset[name] ?? "0");
    return {
      x: read("cursorX"),
      y: read("cursorY"),
      mode: canvas.dataset.mode ?? "",
      pendingSource: canvas.dataset.pendingSource ?? "",
      commandBuffer: canvas.dataset.commandBuffer ?? "",
      insertSite: canvas.dataset.insertSite ?? "",
      links: canvas.dataset.links ?? "",
      linkCount: read("linkCount"),
      sourceHighlight: canvas.dataset.sourceHighlight ?? "",
      buildingCount: read("buildingCount"),
      siteAtCursor: canvas.dataset.siteAtCursor ?? "",
      cameraX: read("cameraX"),
      cameraY: read("cameraY"),
      cellWidth: read("cellWidth"),
      cellHeight: read("cellHeight"),
      dpr: read("dpr"),
    };
  });
}

async function typeKeys(page: Page, value: string): Promise<void> {
  for (const character of Array.from(value)) await page.keyboard.press(character);
}

async function countInRect(page: Page, rgb: number[], left: number, top: number, right: number, bottom: number): Promise<number> {
  return page.locator("#world").evaluate((element, input) => {
    const canvas = element as HTMLCanvasElement;
    const ratio = Number(canvas.dataset.dpr ?? "1");
    const x = Math.max(0, Math.floor(input.left * ratio));
    const y = Math.max(0, Math.floor(input.top * ratio));
    const width = Math.max(1, Math.ceil((input.right - input.left) * ratio));
    const height = Math.max(1, Math.ceil((input.bottom - input.top) * ratio));
    const { data } = canvas.getContext("2d")!.getImageData(x, y, width, height);
    let count = 0;
    for (let offset = 0; offset < data.length; offset += 4) {
      if (data[offset] === input.rgb[0] && data[offset + 1] === input.rgb[1] && data[offset + 2] === input.rgb[2]) count++;
    }
    return count;
  }, { rgb, left, top, right, bottom });
}

async function countColor(page: Page, rgb: number[]): Promise<number> {
  const box = await page.locator("#world").boundingBox();
  if (!box) throw new Error("The canvas has no layout box.");
  return countInRect(page, rgb, 0, 0, box.width, box.height);
}

async function build(page: Page, site: "well" | "ring"): Promise<void> {
  await page.keyboard.press(" ");
  await page.keyboard.press("f");
  await page.keyboard.press(site === "well" ? "w" : "r");
  await page.keyboard.press("Enter");
}

async function stageWell(page: Page): Promise<void> {
  await page.keyboard.press("i");
  await typeKeys(page, "connect");
  await page.keyboard.press("Escape");
}

test("the requested sequence stages, retries and links a well to a ring with a visible directed arrow", async ({ page }) => {
  await open(page);
  await build(page, "well");
  let current = await state(page);
  expect(current.buildingCount).toBe(1);

  await page.keyboard.press("i");
  current = await state(page);
  expect({ mode: current.mode, insert: current.insertSite, draft: current.commandBuffer, source: current.pendingSource })
    .toEqual({ mode: "Insert", insert: "a01", draft: "", source: "" });
  await typeKeys(page, "connect");
  current = await state(page);
  expect({ mode: current.mode, draft: current.commandBuffer }).toEqual({ mode: "Insert", draft: "connect" });
  expect((await state(page)).links).toBe("");
  await page.keyboard.press("Escape");
  current = await state(page);
  expect({ mode: current.mode, draft: current.commandBuffer, source: current.pendingSource, links: current.linkCount })
    .toEqual({ mode: "Normal", draft: "", source: "a01", links: 0 });
  expect(current.sourceHighlight).toBe("a01");
  await expect(page.locator("#hud-source")).toContainText("a01");
  expect(await countColor(page, sourceRgb)).toBeGreaterThan(0);

  await page.keyboard.press("2");
  await page.keyboard.press("4");
  await page.keyboard.press("l");
  expect((await state(page)).x).toBe(37);
  expect((await state(page)).pendingSource).toBe("a01");
  await build(page, "ring");
  current = await state(page);
  expect({ buildings: current.buildingCount, source: current.pendingSource }).toEqual({ buildings: 2, source: "a01" });

  await page.keyboard.press("i");
  await typeKeys(page, "connect");
  await page.keyboard.press("Escape");
  current = await state(page);
  expect({ mode: current.mode, source: current.pendingSource, links: current.linkCount })
    .toEqual({ mode: "Normal", source: "a01", links: 0 });

  await page.keyboard.press("i");
  await typeKeys(page, "connect");
  await page.keyboard.press("Enter");
  current = await state(page);
  expect({ mode: current.mode, source: current.pendingSource, draft: current.commandBuffer })
    .toEqual({ mode: "Normal", source: "", draft: "" });
  expect(current.links).toBe("a01>a02");
  expect(current.linkCount).toBe(1);
  expect(current.sourceHighlight).toBe("");

  await page.keyboard.press("5");
  await page.keyboard.press("j");
  current = await state(page);
  expect({ x: current.x, y: current.y, site: current.siteAtCursor }).toEqual({ x: 37, y: 15, site: "" });
  expect(await countInRect(page, linkRgb, 250, 200, 300, 220)).toBeGreaterThan(0);
  expect(await countInRect(page, linkRgb, 430, 199, 452, 208)).toBeGreaterThan(0);
  expect(await countInRect(page, linkRgb, 150, 199, 180, 208)).toBe(0);
  expect(await countInRect(page, linkRgb, 430, 212, 452, 220)).toBeGreaterThan(0);
});

test("Normal Escape cancels, navigation prefixes and menus retain, and blur drops an insert draft", async ({ page }) => {
  await open(page);
  await build(page, "well");
  await stageWell(page);
  expect((await state(page)).pendingSource).toBe("a01");

  await page.keyboard.press("f");
  expect((await state(page)).mode).toBe("FindRight");
  await page.keyboard.press("Escape");
  let current = await state(page);
  expect({ mode: current.mode, source: current.pendingSource }).toEqual({ mode: "Normal", source: "a01" });

  await page.keyboard.press("g");
  expect((await state(page)).mode).toBe("Go");
  await page.keyboard.press("Escape");
  current = await state(page);
  expect({ mode: current.mode, source: current.pendingSource }).toEqual({ mode: "Normal", source: "a01" });

  await page.keyboard.press(" ");
  expect((await state(page)).mode).toBe("Leader");
  await page.keyboard.press("Escape");
  current = await state(page);
  expect({ mode: current.mode, source: current.pendingSource }).toEqual({ mode: "Normal", source: "a01" });

  await page.keyboard.press(" ");
  await page.keyboard.press("f");
  expect((await state(page)).mode).toBe("Build");
  await page.keyboard.press("Escape");
  current = await state(page);
  expect({ mode: current.mode, source: current.pendingSource }).toEqual({ mode: "Normal", source: "a01" });
  expect(current.links).toBe("");

  await page.keyboard.press("i");
  await typeKeys(page, "con");
  expect((await state(page)).commandBuffer).toBe("con");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  current = await state(page);
  expect({ mode: current.mode, source: current.pendingSource, draft: current.commandBuffer, links: current.linkCount })
    .toEqual({ mode: "Normal", source: "", draft: "", links: 0 });

  await stageWell(page);
  expect((await state(page)).pendingSource).toBe("a01");
  await page.keyboard.press("Escape");
  current = await state(page);
  expect({ source: current.pendingSource, highlight: current.sourceHighlight }).toEqual({ source: "", highlight: "" });
  await expect(page.locator("#hud-source")).toContainText("—");
});

test("incident links use the selected highlight while an off-screen link stays clipped", async ({ page }) => {
  await open(page);
  await build(page, "well");
  await stageWell(page);
  await page.keyboard.press("2");
  await page.keyboard.press("4");
  await page.keyboard.press("l");
  await build(page, "ring");
  await page.keyboard.press("i");
  await typeKeys(page, "connect");
  await page.keyboard.press("Enter");
  expect((await state(page)).siteAtCursor).toBe("a02");
  expect(await countColor(page, linkSelectedRgb)).toBeGreaterThan(0);
  expect(await countColor(page, linkRgb)).toBe(0);

  await page.keyboard.press("Escape");
  await page.keyboard.press("G");
  await page.keyboard.press("$");
  let current = await state(page);
  expect({ x: current.x, y: current.y, cameraX: current.cameraX, cameraY: current.cameraY })
    .toEqual({ x: 239, y: 159, cameraX: 174, cameraY: 132 });
  expect(current.links).toBe("a01>a02");
  expect(await countColor(page, linkRgb)).toBe(0);
  expect(await countColor(page, linkSelectedRgb)).toBe(0);
  await expect(page.locator("#hud-source")).toContainText("—");
});
