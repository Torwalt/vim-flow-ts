import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "./test";

type BrowserEvent =
  | { readonly type: "key"; readonly key: string }
  | { readonly type: "elapsed"; readonly ms: number };

type BrowserCase = {
  readonly id: string;
  readonly requires: readonly string[];
  readonly setup: Record<string, unknown>;
  readonly events: readonly BrowserEvent[];
  readonly expect: Record<string, unknown>;
};

const root = resolve(process.cwd());
const cases = JSON.parse(readFileSync(resolve(root, "spec/first-playable/browser.json"), "utf8")) as BrowserCase[];
const completeLoop = cases.find(example => example.id === "browser.complete-loop");
if (!completeLoop) throw new Error("browser.complete-loop is missing from the shared corpus");

const backgroundRgb = [17, 23, 20];
const fieldRgb = [217, 221, 203];
const cursorRgb = [245, 196, 81];
const impRgb = [245, 196, 81];
const linkSelectedRgb = [143, 211, 192];

async function open(page: Page, live = false): Promise<void> {
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto(live ? "/?rules=first-playable" : "/?clock=manual&rules=first-playable");
  await expect(page.locator("#world")).toHaveAttribute("data-ready", "true");
  await page.locator("#world").click({ position: { x: 8, y: 8 } });
}

function partial(actual: unknown, expected: unknown, path = "observation"): void {
  if (Array.isArray(expected)) {
    expect(actual).toEqual(expected);
    return;
  }
  if (typeof expected === "object" && expected !== null) {
    if (typeof actual !== "object" || actual === null) throw new Error(`${path} must be an object`);
    const record = actual as Record<string, unknown>;
    for (const [key, value] of Object.entries(expected)) partial(record[key], value, `${path}.${key}`);
    return;
  }
  expect(actual).toBe(expected);
}

async function observe(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => window.__vimFlowTest!.observe()) as Promise<unknown> as Promise<Record<string, unknown>>;
}

async function elapsed(page: Page, milliseconds: number): Promise<void> {
  await page.evaluate((ms) => window.__vimFlowTest!.advance(ms), milliseconds);
}

async function applyEvents(page: Page, events: readonly BrowserEvent[]): Promise<void> {
  for (const event of events) {
    if (event.type === "key") {
      await page.keyboard.press(event.key === " " ? "Space" : event.key);
    } else if (event.type === "elapsed") {
      await elapsed(page, event.ms);
    } else {
      throw new Error(`Unsupported browser event ${(event as { type: string }).type}`);
    }
  }
}

async function load(page: Page, spec: unknown): Promise<void> {
  await page.evaluate((scenario) => window.__vimFlowTest!.load(scenario), spec);
}

async function setVisible(page: Page, visible: boolean): Promise<void> {
  await page.evaluate((show) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => show ? "visible" : "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, visible);
}

async function cellCounts(page: Page, column: number, row: number): Promise<Record<string, number>> {
  return page.locator("#world").evaluate((element, input) => {
    const canvas = element as HTMLCanvasElement;
    const ratio = Number(canvas.dataset.dpr ?? "1");
    const width = Number(canvas.dataset.cellWidth ?? "12") * ratio;
    const height = Number(canvas.dataset.cellHeight ?? "20") * ratio;
    const left = Math.floor(input.column * width);
    const top = Math.floor(input.row * height);
    const { data } = canvas.getContext("2d")!.getImageData(left, top, Math.ceil(width), Math.ceil(height));
    const counts: Record<string, number> = { background: 0, field: 0, cursor: 0, imp: 0, link: 0 };
    for (let offset = 0; offset < data.length; offset += 4) {
      const rgb = `${data[offset]},${data[offset + 1]},${data[offset + 2]}`;
      if (rgb === input.background) counts.background!++;
      else if (rgb === input.field) counts.field!++;
      else if (rgb === input.cursor) counts.cursor!++;
      else if (rgb === input.imp) counts.imp!++;
      else if (rgb === input.link) counts.link!++;
    }
    return counts;
  }, {
    column,
    row,
    background: backgroundRgb.join(","),
    field: fieldRgb.join(","),
    cursor: cursorRgb.join(","),
    imp: impRgb.join(","),
    link: linkSelectedRgb.join(","),
  });
}

async function countColor(page: Page, rgb: readonly number[]): Promise<number> {
  return page.locator("#world").evaluate((element, value) => {
    const canvas = element as HTMLCanvasElement;
    const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
    let count = 0;
    for (let offset = 0; offset < data.length; offset += 4) {
      if (data[offset] === value[0] && data[offset + 1] === value[1] && data[offset + 2] === value[2]) count++;
    }
    return count;
  }, [...rgb]);
}

async function canvasData(page: Page): Promise<Record<string, string>> {
  return page.locator("#world").evaluate((element) => Object.fromEntries(
    Object.entries((element as HTMLCanvasElement).dataset).map(([key, value]) => [key, value ?? ""]),
  ));
}

test("browser.complete-loop builds, links, advances the manual clock and draws five imps", async ({ page }) => {
  await open(page);
  await applyEvents(page, completeLoop.events);
  partial(await observe(page), completeLoop.expect);

  const observation = await observe(page);
  expect(observation.imps).toEqual([
    { ring: "a02", slot: 1, x: 33, y: 14 },
    { ring: "a02", slot: 2, x: 35, y: 14 },
    { ring: "a02", slot: 3, x: 37, y: 14 },
    { ring: "a02", slot: 4, x: 39, y: 14 },
    { ring: "a02", slot: 5, x: 41, y: 14 },
  ]);
  expect(observation.impCount).toBe(5);
  expect(observation.elapsedTicks).toBe(400);
  expect(observation.remainderMs).toBe(0);

  const data = await canvasData(page);
  expect({ x: data.cursorX, y: data.cursorY, mode: data.mode, pending: data.pendingSource })
    .toEqual({ x: "37", y: "10", mode: "Normal", pending: "" });
  const cameraX = Number(data.cameraX);
  const cameraY = Number(data.cameraY);

  const cursor = await cellCounts(page, 37 - cameraX, 10 - cameraY);
  expect(cursor.cursor! + cursor.imp!).toBeGreaterThan(0);
  for (const x of [33, 35, 37, 39, 41]) {
    const imp = await cellCounts(page, x - cameraX, 14 - cameraY);
    expect(imp.imp! + imp.cursor!).toBeGreaterThan(0);
    expect(imp.field).toBe(0);
  }
  const beyond = await cellCounts(page, 43 - cameraX, 14 - cameraY);
  expect(beyond.imp! + beyond.cursor!).toBe(0);
  expect(beyond.field).toBe(0);
  expect(beyond.background).toBeGreaterThan(0);
  expect(await countColor(page, linkSelectedRgb)).toBeGreaterThan(0);

  await expect(page.locator("#hud-clock")).toContainText("40.0s · running");
  await expect(page.locator("#hud-resources")).toContainText("1000q");
  await expect(page.locator("#hud-resources")).toContainText("5/5");
  await expect(page.locator("#hud-resources")).toContainText("a01");
});

test("manual pause and hidden suspension stop the browser clock without catch-up", async ({ page }) => {
  await open(page);
  const setup = {
    buildings: [
      { site: "a01", kind: "well", mana: 0, link: "a02" },
      { site: "a02", kind: "ring", mana: 0, produced: 0 },
    ],
  };

  await load(page, setup);
  await elapsed(page, 5000);
  let observation = await observe(page);
  expect(observation.elapsedTicks).toBe(50);
  expect(observation.sites).toEqual({
    a01: { kind: "well", mana: 0, link: "a02" },
    a02: { kind: "ring", mana: 0, produced: 1 },
    a03: { kind: "empty" },
    a04: { kind: "empty" },
    b01: { kind: "empty" },
    b02: { kind: "empty" },
    z01: { kind: "empty" },
    z02: { kind: "empty" },
  });

  await load(page, setup);
  await page.keyboard.press("p");
  await elapsed(page, 10000);
  observation = await observe(page);
  expect(observation.manualPaused).toBe(true);
  expect(observation.elapsedTicks).toBe(0);
  expect(observation.impCount).toBe(0);

  await page.keyboard.press("p");
  await elapsed(page, 5000);
  observation = await observe(page);
  expect(observation.manualPaused).toBe(false);
  expect(observation.elapsedTicks).toBe(50);
  expect(observation.impCount).toBe(1);

  await load(page, setup);
  await setVisible(page, false);
  await elapsed(page, 60000);
  observation = await observe(page);
  expect(observation.suspended).toBe(true);
  expect(observation.elapsedTicks).toBe(0);
  expect(observation.impCount).toBe(0);
  expect((await canvasData(page)).suspended).toBe("true");

  await setVisible(page, true);
  await elapsed(page, 5000);
  observation = await observe(page);
  expect(observation.suspended).toBe(false);
  expect(observation.elapsedTicks).toBe(50);
  expect(observation.impCount).toBe(1);
});

test("live animation frames forward monotonic time into the production core", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page, true);
  await page.waitForFunction(() => Number(document.querySelector<HTMLCanvasElement>("#world")?.dataset.elapsedTicks ?? "0") > 0);
  const first = Number((await canvasData(page)).elapsedTicks);
  await page.waitForFunction((seen) => Number(document.querySelector<HTMLCanvasElement>("#world")?.dataset.elapsedTicks ?? "0") > seen, first);
  expect(Number((await canvasData(page)).elapsedTicks)).toBeGreaterThan(first);
  await expect(page.locator("#hud-clock")).not.toContainText("0.0s");
  expect(errors).toEqual([]);
});

test("visible time advances while Insert and Build remain usable", async ({ page }) => {
  await open(page);
  await load(page, {
    buildings: [
      { site: "a01", kind: "well", mana: 0, link: "a02" },
      { site: "a02", kind: "ring", mana: 0, produced: 0 },
    ],
  });

  await page.keyboard.press("i");
  for (const key of ["c", "o", "n"]) await page.keyboard.press(key);
  await elapsed(page, 5000);
  let observation = await observe(page);
  expect(observation.mode).toBe("Insert");
  expect(observation.commandBuffer).toBe("con");
  expect(observation.impCount).toBe(1);
  await expect(page.locator("#hud-draft")).toContainText("con");
  await expect(page.locator("#hud-clock")).toContainText("5.0s · running");

  await page.keyboard.press("Escape");
  await page.keyboard.press(" ");
  await page.keyboard.press("f");
  await elapsed(page, 5000);
  observation = await observe(page);
  expect(observation.mode).toBe("Build");
  expect(observation.impCount).toBe(2);
  await expect(page.locator("#hud-clock")).toContainText("10.0s · running");
});

test("blur cancels every modal interaction without changing the built world", async ({ page }) => {
  await open(page);
  await page.keyboard.press(" ");
  await page.keyboard.press("f");
  await page.keyboard.press("Enter");
  expect((await canvasData(page)).buildingCount).toBe("1");

  const blur = async (): Promise<void> => {
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  };
  const normal = async (): Promise<void> => {
    const data = await canvasData(page);
    expect({
      mode: data.mode,
      source: data.pendingSource,
      draft: data.commandBuffer,
      buildings: data.buildingCount,
    }).toEqual({ mode: "Normal", source: "", draft: "", buildings: "1" });
  };

  await page.keyboard.press("i");
  for (const key of ["c", "o", "n", "n", "e", "c", "t"]) await page.keyboard.press(key);
  await page.keyboard.press("Escape");
  expect((await canvasData(page)).pendingSource).toBe("a01");
  await page.keyboard.press(" ");
  await blur();
  await normal();

  await page.keyboard.press(" ");
  await page.keyboard.press("f");
  await blur();
  await normal();

  await page.keyboard.press("i");
  for (const key of ["c", "o", "n"]) await page.keyboard.press(key);
  await blur();
  await normal();

  await page.keyboard.press("f");
  await blur();
  await normal();

  await page.keyboard.press("g");
  await blur();
  await normal();
});
