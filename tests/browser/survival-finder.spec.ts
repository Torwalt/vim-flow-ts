import type { Page } from "@playwright/test";
import { expect, test } from "./test";

const finderPanelRgb = [18, 27, 21];
const finderSelectedRgb = [38, 58, 41];

type FinderState = {
  x: number;
  y: number;
  mode: string;
  count: number;
  notice: string;
  finderQuery: string;
  finderSelection: number;
  finderEntries: string;
  pendingSource: string;
  links: string;
  cameraX: number;
  cameraY: number;
  gutterWidth: number;
  cellWidth: number;
  cellHeight: number;
};

async function open(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto("/?clock=manual");
  await expect(page.locator("#world")).toHaveAttribute("data-ready", "true");
  await page.locator("#world").click({ position: { x: 8, y: 8 } });
}

async function state(page: Page): Promise<FinderState> {
  return page.locator("#world").evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const read = (name: string): number => Number(canvas.dataset[name] ?? "0");
    return {
      x: read("cursorX"),
      y: read("cursorY"),
      mode: canvas.dataset.mode ?? "",
      count: read("count"),
      notice: canvas.dataset.notice ?? "",
      finderQuery: canvas.dataset.finderQuery ?? "",
      finderSelection: read("finderSelection"),
      finderEntries: canvas.dataset.finderEntries ?? "",
      pendingSource: canvas.dataset.pendingSource ?? "",
      links: canvas.dataset.links ?? "",
      cameraX: read("cameraX"),
      cameraY: read("cameraY"),
      gutterWidth: read("gutterWidth"),
      cellWidth: read("cellWidth"),
      cellHeight: read("cellHeight"),
    };
  });
}

async function typeKeys(page: Page, value: string): Promise<void> {
  for (const character of Array.from(value)) await page.keyboard.press(character);
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

function scenario(pendingSource?: string) {
  return {
    rules: "survival",
    cursor: { x: 100, y: 100 },
    ...(pendingSource === undefined ? {} : { pendingSource }),
    buildings: [
      { id: "b001", kind: "well", center: { x: 13, y: 10 }, name: "Foo" },
      { id: "b002", kind: "ring", center: { x: 37, y: 10 }, name: "Foo" },
      { id: "b003", kind: "well", center: { x: 61, y: 10 }, name: "Bar" },
      { id: "b004", kind: "ring", center: { x: 85, y: 10 }, name: "Guard" },
    ],
  };
}

test("default survival Space f shows a sorted finder overlay and real keys jump to a duplicate building", async ({ page }) => {
  await open(page);
  await expect(page.locator("#world")).toHaveAttribute("data-rules", "survival");
  await page.evaluate(spec => window.__vimFlowTest!.load(spec), scenario());
  const start = await state(page);
  await page.keyboard.press(" ");
  await page.keyboard.press("f");

  let current = await state(page);
  expect({
    mode: current.mode,
    count: current.count,
    query: current.finderQuery,
    selection: current.finderSelection,
    entries: current.finderEntries,
    cursor: { x: current.x, y: current.y },
  }).toEqual({
    mode: "Finder",
    count: 0,
    query: "",
    selection: 0,
    entries: "Bar|mana well|b003;Enemy gate|spawn|gate;Foo|mana well|b001;Foo|summoning ring|b002;Guard|summoning ring|b004;Rally|rally|rally",
    cursor: { x: 100, y: 100 },
  });
  await expect(page.locator("#hud-site")).toContainText("FINDER Bar");
  await expect(page.locator("#hud-resources")).toContainText("Enter jump");
  const panel = await countInRect(page, finderPanelRgb, current.gutterWidth, 0, current.gutterWidth + 460, 160);
  expect(panel).toBeGreaterThan(0);
  const selected = await countInRect(page, finderSelectedRgb, current.gutterWidth, 0, current.gutterWidth + 460, 160);
  expect(selected).toBeGreaterThan(0);

  await typeKeys(page, "fo");
  current = await state(page);
  expect({ query: current.finderQuery, selection: current.finderSelection, entries: current.finderEntries }).toEqual({
    query: "fo",
    selection: 0,
    entries: "Foo|mana well|b001;Foo|summoning ring|b002",
  });
  await page.keyboard.press("ArrowDown");
  current = await state(page);
  expect({
    selection: current.finderSelection,
    cursor: { x: current.x, y: current.y },
    camera: { x: current.cameraX, y: current.cameraY },
  }).toEqual({
    selection: 1,
    cursor: { x: start.x, y: start.y },
    camera: { x: start.cameraX, y: start.cameraY },
  });

  await page.keyboard.press("Enter");
  current = await state(page);
  expect({
    mode: current.mode,
    query: current.finderQuery,
    entries: current.finderEntries,
    cursor: { x: current.x, y: current.y },
  }).toEqual({
    mode: "Normal",
    query: "",
    entries: "",
    cursor: { x: 37, y: 10 },
  });
});

test("finder matches subsequences, jumps to Rally and the gate, and reports no result without closing", async ({ page }) => {
  await open(page);
  await page.evaluate(spec => window.__vimFlowTest!.load(spec), scenario());
  await page.keyboard.press(" ");
  await page.keyboard.press("f");
  await typeKeys(page, "br");
  let current = await state(page);
  expect(current.finderEntries).toBe("Bar|mana well|b003");

  await page.keyboard.press("Escape");
  current = await state(page);
  expect({ mode: current.mode, cursor: { x: current.x, y: current.y } })
    .toEqual({ mode: "Normal", cursor: { x: 100, y: 100 } });

  await page.keyboard.press(" ");
  await page.keyboard.press("f");
  await typeKeys(page, "rally");
  await page.keyboard.press("Enter");
  current = await state(page);
  expect({ mode: current.mode, cursor: { x: current.x, y: current.y } })
    .toEqual({ mode: "Normal", cursor: { x: 13, y: 10 } });
  await expect(page.locator("#hud-rally")).toContainText("13,10");

  await page.keyboard.press(" ");
  await page.keyboard.press("f");
  await typeKeys(page, "spawn");
  await page.keyboard.press("Enter");
  current = await state(page);
  expect({ mode: current.mode, cursor: { x: current.x, y: current.y } })
    .toEqual({ mode: "Normal", cursor: { x: 200, y: 136 } });

  await page.keyboard.press(" ");
  await page.keyboard.press("f");
  await typeKeys(page, "zzz");
  await page.keyboard.press("Enter");
  current = await state(page);
  expect({ mode: current.mode, notice: current.notice, entries: current.finderEntries, cursor: { x: current.x, y: current.y } })
    .toEqual({ mode: "Finder", notice: "No finder result", entries: "", cursor: { x: 200, y: 136 } });
  await expect(page.locator("#hud-site")).toContainText("FINDER no result");
  await page.keyboard.press("Escape");
  expect((await state(page)).mode).toBe("Normal");
});

test("a staged well source survives a finder jump and types connect at the ring", async ({ page }) => {
  await open(page);
  await page.evaluate(spec => window.__vimFlowTest!.load(spec), scenario("b001"));
  await page.keyboard.press(" ");
  await page.keyboard.press("f");
  await typeKeys(page, "guard");
  await page.keyboard.press("Enter");
  let current = await state(page);
  expect({ mode: current.mode, source: current.pendingSource, cursor: { x: current.x, y: current.y } })
    .toEqual({ mode: "Normal", source: "b001", cursor: { x: 85, y: 10 } });
  await expect(page.locator("#hud-source")).toContainText("b001");

  await page.keyboard.press("i");
  await typeKeys(page, "connect");
  await page.keyboard.press("Enter");
  current = await state(page);
  expect({ mode: current.mode, source: current.pendingSource, links: current.links })
    .toEqual({ mode: "Normal", source: "", links: "b001>b004" });
  const snapshot = await page.evaluate(() => window.__vimFlowTest!.snapshot());
  expect(snapshot.buildings).toContainEqual({
    id: "b001", kind: "well", center: { x: 13, y: 10 }, mana: 0, link: "b004", name: "Foo",
  });
});

test("finder query ignores navigation bindings and blur clears a staged source", async ({ page }) => {
  await open(page);
  await page.evaluate(spec => window.__vimFlowTest!.load(spec), scenario("b001"));
  await page.keyboard.press("7");
  await page.keyboard.press(" ");
  await page.keyboard.press("f");
  await typeKeys(page, "fi");
  let current = await state(page);
  expect({ mode: current.mode, count: current.count, query: current.finderQuery, cursor: { x: current.x, y: current.y } })
    .toEqual({ mode: "Finder", count: 0, query: "fi", cursor: { x: 100, y: 100 } });
  expect(current.finderEntries).toBe("Foo|summoning ring|b002");

  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  current = await state(page);
  expect({ mode: current.mode, source: current.pendingSource, query: current.finderQuery })
    .toEqual({ mode: "Normal", source: "", query: "" });
});
