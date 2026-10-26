import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../../src/core/game";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  followCamera,
  visibleCells,
  type Camera,
  type Viewport,
} from "../../src/web/camera";

type CameraCase = {
  id: string;
  requires: string[];
  setup: { camera: Camera; viewportCells: Viewport };
  events: Array<{ type: string; cursor?: Camera }>;
  expect: { camera: Camera };
};

const root = resolve(import.meta.dir, "../..");
const cases = JSON.parse(readFileSync(resolve(root, "spec/first-playable/browser.json"), "utf8")) as CameraCase[];
const coverage = JSON.parse(readFileSync(resolve(root, "spec/first-playable/coverage.json"), "utf8")) as {
  requirements: Record<string, { status: string; unit: string; exports?: string[]; tests?: string[]; cases?: string[] }>;
};

const cameraCases = cases.filter(example => example.requires.includes("V1"));
const world = { width: WORLD_WIDTH, height: WORLD_HEIGHT };

for (const example of cameraCases) {
  test(`browser.json ${example.id}`, () => {
    let camera = example.setup.camera;
    for (const event of example.events) {
      if (event.type !== "camera-follow" || !event.cursor) {
        throw new Error(`Unsupported camera event ${event.type}`);
      }
      camera = followCamera(camera, event.cursor, example.setup.viewportCells, world);
    }
    expect(camera).toEqual(example.expect.camera);
  });
}

test("coverage activates V1 camera cases and the complete browser loop", () => {
  expect(cameraCases.map(example => example.id).sort()).toEqual([
    "camera.bottom-right",
    "camera.follow-threshold",
    "camera.oversized",
  ]);
  expect(coverage.requirements.V1?.status).toBe("active");
  expect(coverage.requirements.V1?.unit).toBe("3.1");
  expect(coverage.requirements.V1?.cases?.slice().sort()).toEqual(cameraCases.map(example => example.id).sort());
  expect(coverage.requirements.V1?.tests).toContain("tests/core/first-playable-camera.test.ts");
  expect(coverage.requirements.V1?.tests).toContain("tests/browser/viewport.spec.ts");
  expect(coverage.requirements.V2?.status).toBe("active");
  expect(coverage.requirements.V2?.cases).toEqual(["browser.complete-loop"]);
});

test("visible cells use whole 12x20 cells and never fall below one", () => {
  expect(visibleCells(0, 0)).toEqual({ columns: 1, rows: 1 });
  expect(visibleCells(11, 19)).toEqual({ columns: 1, rows: 1 });
  expect(visibleCells(CELL_WIDTH, CELL_HEIGHT)).toEqual({ columns: 1, rows: 1 });
  expect(visibleCells(CELL_WIDTH * 2 - 1, CELL_HEIGHT * 2 - 1)).toEqual({ columns: 1, rows: 1 });
  expect(visibleCells(CELL_WIDTH * 2, CELL_HEIGHT * 2)).toEqual({ columns: 2, rows: 2 });
  expect(visibleCells(239, 159)).toEqual({ columns: 19, rows: 7 });
  expect(visibleCells(240, 160)).toEqual({ columns: 20, rows: 8 });
  expect(visibleCells(300, 200)).toEqual({ columns: 25, rows: 10 });
  expect(visibleCells(Number.NaN, Number.POSITIVE_INFINITY)).toEqual({ columns: 1, rows: 1 });
});

test("camera keeps the cursor inside the left and top margins", () => {
  const viewport = { columns: 80, rows: 30 };
  expect(followCamera({ x: 0, y: 0 }, { x: 0, y: 0 }, viewport, world)).toEqual({ x: 0, y: 0 });
  expect(followCamera({ x: 0, y: 0 }, { x: 15, y: 5 }, viewport, world)).toEqual({ x: 0, y: 0 });
  expect(followCamera({ x: 50, y: 50 }, { x: 65, y: 55 }, viewport, world)).toEqual({ x: 49, y: 49 });
  expect(followCamera({ x: 50, y: 50 }, { x: 66, y: 56 }, viewport, world)).toEqual({ x: 50, y: 50 });
});

test("camera follows at the far margin and clamps to both world edges", () => {
  const viewport = { columns: 80, rows: 30 };
  expect(followCamera({ x: 50, y: 50 }, { x: 113, y: 73 }, viewport, world)).toEqual({ x: 50, y: 50 });
  expect(followCamera({ x: 50, y: 50 }, { x: 114, y: 74 }, viewport, world)).toEqual({ x: 51, y: 51 });
  expect(followCamera({ x: 100, y: 100 }, { x: 0, y: 0 }, viewport, world)).toEqual({ x: 0, y: 0 });
  expect(followCamera({ x: 0, y: 0 }, { x: 239, y: 159 }, viewport, world)).toEqual({ x: 160, y: 130 });
  expect(followCamera({ x: 160, y: 130 }, { x: 0, y: 0 }, viewport, world)).toEqual({ x: 0, y: 0 });
});

test("an oversized viewport stays at origin on that axis", () => {
  expect(followCamera({ x: 160, y: 130 }, { x: 239, y: 159 }, { columns: 300, rows: 200 }, world))
    .toEqual({ x: 0, y: 0 });
  expect(followCamera({ x: 80, y: 70 }, { x: 0, y: 0 }, { columns: 240, rows: 160 }, world))
    .toEqual({ x: 0, y: 0 });
  expect(followCamera({ x: 0, y: 0 }, { x: 120, y: 80 }, { columns: 250, rows: 170 }, world))
    .toEqual({ x: 0, y: 0 });
});

test("camera applies the same rule after a resize without touching world size", () => {
  const afterLongJump = followCamera({ x: 0, y: 0 }, { x: 239, y: 159 }, { columns: 66, rows: 28 }, world);
  expect(afterLongJump).toEqual({ x: 174, y: 132 });
  expect(followCamera(afterLongJump, { x: 239, y: 159 }, { columns: 83, rows: 33 }, world))
    .toEqual({ x: 157, y: 127 });
  expect(followCamera(afterLongJump, { x: 239, y: 159 }, { columns: 250, rows: 170 }, world))
    .toEqual({ x: 0, y: 0 });
  expect(world).toEqual({ width: 240, height: 160 });
});
