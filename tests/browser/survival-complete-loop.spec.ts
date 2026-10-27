import type { Page } from "@playwright/test";
import { CURSOR_MAX_HP } from "../../src/core/game";
import { expect, test } from "./test";

const allyRgb = [90, 210, 196];
const enemyRgb = [228, 122, 82];
const cursorRgb = [245, 196, 81];
const grassRgb = [51, 69, 47];
const gutterCurrentRgb = [34, 49, 38];
const healthBackRgb = [49, 59, 52];
const finderPanelRgb = [18, 27, 21];
const rallyRgb = [227, 169, 79];
const gateRgb = [217, 221, 203];
const gameOverPanelRgb = [42, 23, 22];

type CanvasState = {
  x: number;
  y: number;
  cameraX: number;
  cameraY: number;
  gutterWidth: number;
  cellWidth: number;
  cellHeight: number;
  dpr: number;
};

async function open(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto("/?clock=manual");
  await expect(page.locator("#world")).toHaveAttribute("data-ready", "true");
  await page.locator("#world").click({ position: { x: 8, y: 8 } });
}

async function state(page: Page): Promise<CanvasState> {
  return page.locator("#world").evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const read = (name: string): number => Number(canvas.dataset[name] ?? "0");
    return {
      x: read("cursorX"),
      y: read("cursorY"),
      cameraX: read("cameraX"),
      cameraY: read("cameraY"),
      gutterWidth: read("gutterWidth"),
      cellWidth: read("cellWidth"),
      cellHeight: read("cellHeight"),
      dpr: read("dpr"),
    };
  });
}

async function observe(page: Page) {
  return page.evaluate(() => window.__vimFlowTest!.observe());
}

async function key(page: Page, value: string): Promise<void> {
  await page.keyboard.press(value);
}

async function typeKeys(page: Page, value: string): Promise<void> {
  for (const character of Array.from(value)) await page.keyboard.press(character);
}

async function advance(page: Page, ticks: number): Promise<void> {
  await page.evaluate(ms => window.__vimFlowTest!.advance(ms), ticks * 100);
}

async function rectCounts(
  page: Page,
  cssLeft: number,
  cssTop: number,
  cssWidth: number,
  cssHeight: number,
  colors: readonly (readonly number[])[],
): Promise<Record<string, number>> {
  return page.locator("#world").evaluate((element, input) => {
    const canvas = element as HTMLCanvasElement;
    const ratio = Number(canvas.dataset.dpr ?? "1");
    const left = Math.max(0, Math.floor(input.cssLeft * ratio));
    const top = Math.max(0, Math.floor(input.cssTop * ratio));
    const width = Math.max(0, Math.min(Math.ceil(input.cssWidth * ratio), canvas.width - left));
    const height = Math.max(0, Math.min(Math.ceil(input.cssHeight * ratio), canvas.height - top));
    const counts: Record<string, number> = {};
    for (const color of input.colors) counts[color] = 0;
    if (width === 0 || height === 0) return counts;
    const { data } = canvas.getContext("2d")!.getImageData(left, top, width, height);
    for (let offset = 0; offset < data.length; offset += 4) {
      const rgb = `${data[offset]},${data[offset + 1]},${data[offset + 2]}`;
      if (rgb in counts) counts[rgb]!++;
    }
    return counts;
  }, { cssLeft, cssTop, cssWidth, cssHeight, colors: colors.map(color => color.join(",")) });
}

async function cellCounts(
  page: Page,
  x: number,
  y: number,
  colors: readonly (readonly number[])[],
): Promise<Record<string, number>> {
  const current = await state(page);
  return rectCounts(
    page,
    current.gutterWidth + (x - current.cameraX) * current.cellWidth,
    (y - current.cameraY) * current.cellHeight,
    current.cellWidth,
    current.cellHeight,
    colors,
  );
}

async function rectNearCount(
  page: Page,
  cssLeft: number,
  cssTop: number,
  cssWidth: number,
  cssHeight: number,
  target: readonly number[],
  tolerance: number,
): Promise<number> {
  return page.locator("#world").evaluate((element, input) => {
    const canvas = element as HTMLCanvasElement;
    const ratio = Number(canvas.dataset.dpr ?? "1");
    const left = Math.max(0, Math.floor(input.cssLeft * ratio));
    const top = Math.max(0, Math.floor(input.cssTop * ratio));
    const width = Math.max(0, Math.min(Math.ceil(input.cssWidth * ratio), canvas.width - left));
    const height = Math.max(0, Math.min(Math.ceil(input.cssHeight * ratio), canvas.height - top));
    if (width === 0 || height === 0) return 0;
    const { data } = canvas.getContext("2d")!.getImageData(left, top, width, height);
    let count = 0;
    for (let offset = 0; offset < data.length; offset += 4) {
      if (
        Math.abs(data[offset]! - input.target[0]!) <= input.tolerance
        && Math.abs(data[offset + 1]! - input.target[1]!) <= input.tolerance
        && Math.abs(data[offset + 2]! - input.target[2]!) <= input.tolerance
      ) count++;
    }
    return count;
  }, { cssLeft, cssTop, cssWidth, cssHeight, target: [...target], tolerance });
}

async function cellNear(
  page: Page,
  x: number,
  y: number,
  target: readonly number[],
  tolerance = 16,
): Promise<number> {
  const current = await state(page);
  return rectNearCount(
    page,
    current.gutterWidth + (x - current.cameraX) * current.cellWidth,
    (y - current.cameraY) * current.cellHeight,
    current.cellWidth,
    current.cellHeight,
    target,
    tolerance,
  );
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

async function finder(page: Page, query: string): Promise<void> {
  await key(page, " ");
  await key(page, "f");
  await typeKeys(page, query);
}

test("a real-key survival loop builds, links, rallies, fights, dies and restarts", async ({ page }) => {
  await open(page);
  const initial = await state(page);
  expect(initial.gutterWidth).toBe(48);
  expect(await cellNear(page, 13, 11, grassRgb)).toBeGreaterThan(0);
  const gutter = await rectCounts(
    page,
    0,
    10 * initial.cellHeight,
    initial.gutterWidth,
    initial.cellHeight,
    [gutterCurrentRgb],
  );
  expect(gutter[gutterCurrentRgb.join(",")]).toBeGreaterThan(0);

  await key(page, "i");
  await typeKeys(page, "mana well");
  await key(page, "Enter");
  await typeKeys(page, "Foo");
  await key(page, "Enter");

  await finder(page, "spawn");
  const panel = await rectCounts(
    page,
    (await state(page)).gutterWidth,
    0,
    (await state(page)).gutterWidth + 460,
    160,
    [finderPanelRgb],
  );
  expect(panel[finderPanelRgb.join(",")]).toBeGreaterThan(0);
  await key(page, "Enter");
  await typeKeys(page, "14h");
  await key(page, "i");
  await typeKeys(page, "summoning ring");
  await key(page, "Enter");
  await typeKeys(page, "Guard");
  await key(page, "Enter");

  await finder(page, "foo");
  await key(page, "Enter");
  await key(page, "i");
  await typeKeys(page, "connect");
  await key(page, "Enter");
  await finder(page, "guard");
  await key(page, "Enter");
  await key(page, "i");
  await typeKeys(page, "connect");
  await key(page, "Enter");

  await finder(page, "spawn");
  await key(page, "Enter");
  await typeKeys(page, "4h");
  await key(page, "i");
  await typeKeys(page, "rally");
  await key(page, "Enter");
  let observation = await observe(page);
  expect({
    buildings: observation.buildings.map(building => [building.id, building.name]),
    links: observation.links,
    rally: observation.rally,
    cursor: observation.cursor,
  }).toEqual({
    buildings: [["b001", "Foo"], ["b002", "Guard"]],
    links: [{ source: "b001", target: "b002", from: { x: 13, y: 10 }, to: { x: 186, y: 136 } }],
    rally: { x: 196, y: 136 },
    cursor: { x: 196, y: 136 },
  });
  await expect(page.locator("#hud-hp")).toContainText(`HP ${CURSOR_MAX_HP}/${CURSOR_MAX_HP}`);
  await expect(page.locator("#hud-rally")).toContainText("196,136");
  await expect(page.locator("#hud-pop")).toContainText("allies 0 · enemies 0");

  await typeKeys(page, "5h");
  const nearGate = await state(page);
  expect({ x: nearGate.x, y: nearGate.y }).toEqual({ x: 191, y: 136 });
  expect((await cellCounts(page, 196, 136, [rallyRgb]))[rallyRgb.join(",")]).toBeGreaterThan(0);
  expect(await cellNear(page, 200, 136, gateRgb)).toBeGreaterThan(0);

  await advance(page, 50);
  observation = await observe(page);
  const firstAlly = observation.troops.find(troop => troop.faction === "ally");
  expect(firstAlly).toMatchObject({ id: "b002#1", x: 182, y: 139 });
  if (!firstAlly) throw new Error("expected the first ally");
  expect((await cellCounts(page, firstAlly.x, firstAlly.y, [allyRgb]))[allyRgb.join(",")]).toBeGreaterThan(0);
  await advance(page, 5);
  observation = await observe(page);
  const movedAlly = observation.troops.find(troop => troop.id === "b002#1");
  expect(movedAlly).toMatchObject({ x: 182, y: 138 });
  if (!movedAlly) throw new Error("expected the moved ally");
  expect((await cellCounts(page, firstAlly.x, firstAlly.y, [allyRgb]))[allyRgb.join(",")]).toBe(0);
  expect((await cellCounts(page, movedAlly.x, movedAlly.y, [allyRgb]))[allyRgb.join(",")]).toBeGreaterThan(0);

  await finder(page, "foo");
  await key(page, "Enter");
  await advance(page, 495);
  observation = await observe(page);
  expect({ wave: observation.wave, hp: observation.cursorHp, gameOver: observation.gameOver })
    .toEqual({ wave: 2, hp: CURSOR_MAX_HP, gameOver: false });
  expect(observation.troops.filter(troop => troop.faction === "ally")).toHaveLength(5);
  expect(observation.troops.filter(troop => troop.faction === "enemy").length).toBeGreaterThan(0);

  await finder(page, "spawn");
  await key(page, "Enter");
  await typeKeys(page, "4h");
  await advance(page, 100);
  observation = await observe(page);
  expect({
    gameOver: observation.gameOver,
    cursor: observation.cursor,
    wave: observation.wave,
  }).toEqual({ gameOver: false, cursor: { x: 196, y: 136 }, wave: 2 });
  expect(observation.cursorHp).toBeGreaterThan(0);
  expect(observation.cursorHp).toBeLessThan(CURSOR_MAX_HP);
  expect(observation.kills).toBeGreaterThan(0);

  const distance = (troop: { x: number; y: number }): number =>
    Math.abs(troop.x - observation.cursor.x) + Math.abs(troop.y - observation.cursor.y);
  const nearest = (troop: { x: number; y: number; id: string }, other: { x: number; y: number; id: string }): number =>
    distance(troop) - distance(other) || (troop.id < other.id ? -1 : 1);
  const damagedAlly = observation.troops
    .filter(troop => troop.faction === "ally" && troop.hp < 4)
    .sort(nearest)[0];
  const enemy = observation.troops.filter(troop => troop.faction === "enemy").sort(nearest)[0];
  expect(damagedAlly).toBeDefined();
  expect(enemy).toBeDefined();
  if (!damagedAlly || !enemy) throw new Error("expected injured troops in the gate fight");
  expect((await cellCounts(page, damagedAlly.x, damagedAlly.y, [allyRgb, healthBackRgb]))[allyRgb.join(",")])
    .toBeGreaterThan(0);
  expect((await cellCounts(page, damagedAlly.x, damagedAlly.y, [healthBackRgb]))[healthBackRgb.join(",")])
    .toBeGreaterThan(0);
  expect((await cellCounts(page, enemy.x, enemy.y, [enemyRgb]))[enemyRgb.join(",")]).toBeGreaterThan(0);

  await advance(page, 200);
  observation = await observe(page);
  expect(observation.gameOver).toBe(true);
  expect(observation.cursorHp).toBe(0);
  await expect(page.locator("#hud-clock")).toContainText("game over");
  await expect(page.locator("#hud-notice")).toContainText("Enter restart");
  await expect(page.locator("#hud-hp")).toContainText("HP 0/10");
  expect(await countColor(page, gameOverPanelRgb)).toBeGreaterThan(0);
  expect(await countColor(page, enemyRgb)).toBeGreaterThan(0);

  const deadTicks = observation.elapsedTicks;
  await advance(page, 1_000);
  observation = await observe(page);
  expect(observation.elapsedTicks).toBe(deadTicks);
  expect(observation.gameOver).toBe(true);

  await key(page, "Enter");
  observation = await observe(page);
  expect({
    gameOver: observation.gameOver,
    cursorHp: observation.cursorHp,
    cursor: observation.cursor,
    buildings: observation.buildingCount,
    troops: observation.troops.length,
    ticks: observation.elapsedTicks,
  }).toEqual({
    gameOver: false,
    cursorHp: CURSOR_MAX_HP,
    cursor: { x: 13, y: 10 },
    buildings: 0,
    troops: 0,
    ticks: 0,
  });
  await expect(page.locator("#hud-clock")).toContainText("0.0s · running");
  await expect(page.locator("#hud-pop")).toContainText("allies 0 · enemies 0");
  expect(await countColor(page, cursorRgb)).toBeGreaterThan(0);
});
