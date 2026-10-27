import type { Page } from "@playwright/test";
import { WELL_GENERATION } from "../../src/core/game";
import { expect, test } from "./test";

const rallyRgb = [227, 169, 79];

type SurvivalState = {
  x: number;
  y: number;
  mode: string;
  insertSite: string;
  insertCell: string;
  nameTarget: string;
  candidates: string;
  commandBuffer: string;
  pendingSource: string;
  links: string;
  linkCount: number;
  buildingCount: number;
  siteAtCursor: string;
  notice: string;
  rally: string;
  cameraX: number;
  cameraY: number;
  gutterWidth: number;
  cellWidth: number;
  cellHeight: number;
  dpr: number;
  elapsedTicks: number;
};

async function open(page: Page): Promise<void> {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/?clock=manual&rules=survival");
  await expect(page.locator("#world")).toHaveAttribute("data-ready", "true");
  await page.locator("#world").click({ position: { x: 8, y: 8 } });
}

async function state(page: Page): Promise<SurvivalState> {
  return page.locator("#world").evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const read = (name: string): number => Number(canvas.dataset[name] ?? "0");
    return {
      x: read("cursorX"),
      y: read("cursorY"),
      mode: canvas.dataset.mode ?? "",
      insertSite: canvas.dataset.insertSite ?? "",
      insertCell: canvas.dataset.insertCell ?? "",
      nameTarget: canvas.dataset.nameTarget ?? "",
      candidates: canvas.dataset.candidates ?? "",
      commandBuffer: canvas.dataset.commandBuffer ?? "",
      pendingSource: canvas.dataset.pendingSource ?? "",
      links: canvas.dataset.links ?? "",
      linkCount: read("linkCount"),
      buildingCount: read("buildingCount"),
      siteAtCursor: canvas.dataset.siteAtCursor ?? "",
      notice: canvas.dataset.notice ?? "",
      rally: canvas.dataset.rally ?? "",
      cameraX: read("cameraX"),
      cameraY: read("cameraY"),
      gutterWidth: read("gutterWidth"),
      cellWidth: read("cellWidth"),
      cellHeight: read("cellHeight"),
      dpr: read("dpr"),
      elapsedTicks: read("elapsedTicks"),
    };
  });
}

async function typeKeys(page: Page, value: string): Promise<void> {
  for (const character of Array.from(value)) await page.keyboard.press(character);
}

async function key(page: Page, value: string): Promise<void> {
  await page.keyboard.press(value);
}

async function construct(page: Page, command: string, name: string): Promise<void> {
  await key(page, "i");
  await typeKeys(page, command);
  await key(page, "Enter");
  await typeKeys(page, name);
  await key(page, "Enter");
}

async function countInRect(
  page: Page,
  rgb: number[],
  left: number,
  top: number,
  right: number,
  bottom: number,
): Promise<number> {
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

test("survival Insert shows candidates, completes with Tab and names a built well while time runs", async ({ page }) => {
  await open(page);
  await key(page, "i");
  let current = await state(page);
  expect({
    mode: current.mode,
    insertSite: current.insertSite,
    insertCell: current.insertCell,
    candidates: current.candidates,
    buildings: current.buildingCount,
    cursor: { x: current.x, y: current.y },
  }).toEqual({
    mode: "Insert",
    insertSite: "",
    insertCell: "13,10",
    candidates: "mana well,summoning ring,rally",
    buildings: 0,
    cursor: { x: 13, y: 10 },
  });
  await expect(page.locator("#hud-site")).toContainText("INSERT ground");
  await expect(page.locator("#hud-resources")).toContainText("mana well");
  await expect(page.locator("#hud-resources")).toContainText("summoning ring");
  await expect(page.locator("#hud-resources")).toContainText("rally");

  await typeKeys(page, "mana");
  await page.evaluate(() => window.__vimFlowTest!.advance(500));
  current = await state(page);
  expect({ draft: current.commandBuffer, ticks: current.elapsedTicks }).toEqual({ draft: "mana", ticks: 5 });
  expect(current.candidates).toBe("mana well");

  await key(page, "Tab");
  current = await state(page);
  expect({ mode: current.mode, draft: current.commandBuffer, buildings: current.buildingCount })
    .toEqual({ mode: "Insert", draft: "mana well", buildings: 0 });

  await key(page, "Enter");
  current = await state(page);
  expect({ mode: current.mode, target: current.nameTarget, buildings: current.buildingCount })
    .toEqual({ mode: "Name", target: "b001", buildings: 1 });
  await expect(page.locator("#hud-site")).toContainText("NAME b001");
  await expect(page.locator("#hud-resources")).toContainText("name _");

  await typeKeys(page, "Foo");
  await page.evaluate(() => window.__vimFlowTest!.advance(200));
  current = await state(page);
  expect({ mode: current.mode, draft: current.commandBuffer, ticks: current.elapsedTicks })
    .toEqual({ mode: "Name", draft: "Foo", ticks: 7 });
  await expect(page.locator("#hud-resources")).toContainText("name Foo");

  await key(page, "Enter");
  current = await state(page);
  expect({
    mode: current.mode,
    draft: current.commandBuffer,
    target: current.nameTarget,
    buildings: current.buildingCount,
    site: current.siteAtCursor,
    cursor: { x: current.x, y: current.y },
  }).toEqual({
    mode: "Normal",
    draft: "",
    target: "",
    buildings: 1,
    site: "b001",
    cursor: { x: 13, y: 10 },
  });
  await expect(page.locator("#hud-site")).toContainText("Foo");
  const snapshot = await page.evaluate(() => window.__vimFlowTest!.snapshot());
  expect(snapshot.buildings).toEqual([
    { id: "b001", kind: "well", center: { x: 13, y: 10 }, mana: WELL_GENERATION * 2, link: null, name: "Foo" },
  ]);
});

test("survival typed connect stages, cancels, links and relinks a second ring", async ({ page }) => {
  await open(page);
  await construct(page, "mana well", "Foo");
  await key(page, "2");
  await key(page, "4");
  await key(page, "l");
  await construct(page, "summoning ring", "Guard");
  await key(page, "2");
  await key(page, "4");
  await key(page, "l");
  await construct(page, "summoning ring", "Far");

  await key(page, "4");
  await key(page, "8");
  await key(page, "h");
  await key(page, "i");
  await typeKeys(page, "connect");
  await key(page, "Escape");
  let current = await state(page);
  expect({ mode: current.mode, source: current.pendingSource, draft: current.commandBuffer })
    .toEqual({ mode: "Normal", source: "", draft: "" });

  await key(page, "i");
  await typeKeys(page, "connect");
  await key(page, "Enter");
  current = await state(page);
  expect({ mode: current.mode, source: current.pendingSource, links: current.linkCount })
    .toEqual({ mode: "Normal", source: "b001", links: 0 });
  await expect(page.locator("#hud-source")).toContainText("b001");

  await key(page, "2");
  await key(page, "4");
  await key(page, "l");
  await key(page, "i");
  await typeKeys(page, "con");
  await key(page, "Escape");
  current = await state(page);
  expect({ mode: current.mode, source: current.pendingSource, links: current.linkCount })
    .toEqual({ mode: "Normal", source: "b001", links: 0 });

  await key(page, "i");
  await typeKeys(page, "connect");
  await key(page, "Enter");
  current = await state(page);
  expect({ mode: current.mode, source: current.pendingSource, links: current.links })
    .toEqual({ mode: "Normal", source: "", links: "b001>b002" });

  await key(page, "2");
  await key(page, "4");
  await key(page, "h");
  await key(page, "i");
  await typeKeys(page, "connect");
  await key(page, "Enter");
  await key(page, "4");
  await key(page, "8");
  await key(page, "l");
  await key(page, "i");
  await typeKeys(page, "connect");
  await key(page, "Enter");
  current = await state(page);
  expect({ source: current.pendingSource, links: current.links }).toEqual({ source: "", links: "b001>b003" });
  expect(current.buildingCount).toBe(3);
});

test("survival rally sets coordinates and a visible marker while invalid commands preserve it", async ({ page }) => {
  await open(page);
  await key(page, "3");
  await key(page, "7");
  await key(page, "l");
  await key(page, "4");
  await key(page, "0");
  await key(page, "j");
  let current = await state(page);
  expect({ x: current.x, y: current.y }).toEqual({ x: 50, y: 50 });

  await key(page, "i");
  await typeKeys(page, "rally");
  await key(page, "Enter");
  current = await state(page);
  expect({ mode: current.mode, rally: current.rally, buildings: current.buildingCount })
    .toEqual({ mode: "Normal", rally: "50,50", buildings: 0 });
  await expect(page.locator("#hud-rally")).toContainText("50,50");
  await expect(page.locator("#hud-site")).toContainText("no site");
  const marker = await countInRect(
    page,
    rallyRgb,
    current.gutterWidth + current.cellWidth * (50 - current.cameraX),
    current.cellHeight * (50 - current.cameraY),
    current.gutterWidth + current.cellWidth * (51 - current.cameraX),
    current.cellHeight * (51 - current.cameraY),
  );
  expect(marker).toBeGreaterThan(0);

  await key(page, "i");
  await typeKeys(page, "nope");
  await key(page, "Enter");
  current = await state(page);
  expect({ rally: current.rally, notice: current.notice }).toMatchObject({ rally: "50,50" });
  expect(current.notice).toContain("Unknown command");

  await key(page, "G");
  await key(page, "$");
  await key(page, "3");
  await key(page, "9");
  await key(page, "h");
  await key(page, "2");
  await key(page, "3");
  await key(page, "k");
  await key(page, "i");
  await typeKeys(page, "rally");
  await key(page, "Enter");
  current = await state(page);
  expect({ x: current.x, y: current.y, rally: current.rally }).toEqual({ x: 200, y: 136, rally: "50,50" });
  expect(current.notice).toContain("enemy gate");

  await key(page, "i");
  await typeKeys(page, "rally");
  await key(page, "Escape");
  expect((await state(page)).rally).toBe("50,50");
});

test("survival blur cancels a staged draft and Escape keeps a default building name", async ({ page }) => {
  await open(page);
  await construct(page, "mana well", "");
  let current = await state(page);
  expect(current.siteAtCursor).toBe("b001");
  await expect(page.locator("#hud-site")).toContainText("Well b001");

  await key(page, "i");
  await typeKeys(page, "connect");
  await key(page, "Enter");
  expect((await state(page)).pendingSource).toBe("b001");
  await key(page, "i");
  await typeKeys(page, "con");
  expect((await state(page)).commandBuffer).toBe("con");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  current = await state(page);
  expect({
    mode: current.mode,
    source: current.pendingSource,
    draft: current.commandBuffer,
    insertCell: current.insertCell,
  }).toEqual({ mode: "Normal", source: "", draft: "", insertCell: "" });

  await key(page, "2");
  await key(page, "4");
  await key(page, "l");
  await key(page, "i");
  await typeKeys(page, "summoning ring");
  await key(page, "Enter");
  await typeKeys(page, "Temp");
  await key(page, "Escape");
  current = await state(page);
  expect({ mode: current.mode, buildings: current.buildingCount }).toEqual({ mode: "Normal", buildings: 2 });
  await expect(page.locator("#hud-site")).toContainText("Ring b002");
});
