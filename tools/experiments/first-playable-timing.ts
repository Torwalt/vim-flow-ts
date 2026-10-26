import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { arch, hostname, platform, release } from "node:os";
import { dirname, resolve, sep } from "node:path";
import { TICK_MS, WORLD_WIDTH, game, type SiteId, type World } from "../../src/core/game";

type Command = {
  readonly family: string;
  readonly command: string;
  readonly count: number | null;
  readonly prelude: readonly string[];
  readonly keys: readonly string[];
};

type Sample = { readonly elapsedMs: number; readonly position: number; readonly mode: string };
type Result = Command & {
  readonly field: string;
  readonly finalPosition: number;
  readonly finalX: number;
  readonly finalY: number;
  readonly finalMode: string;
  readonly samplesMs: number[];
  readonly medianMs: number;
  readonly maxMs: number;
};

type Field = { readonly name: string; readonly setup: unknown };

type ElapsedResult = {
  readonly elapsedMs: number;
  readonly ticks: number;
  readonly samplesMs: number[];
  readonly medianMs: number;
  readonly maxMs: number;
  readonly final: {
    readonly elapsedTicks: number;
    readonly remainderMs: number;
    readonly impCount: number;
  };
};

type CoreStressReport =
  | {
      readonly kind: "direct-core";
      readonly environment: Record<string, string>;
      readonly commands: Result[];
      readonly elapsed: ElapsedResult[];
    }
  | { readonly kind: "timeout"; readonly timeoutMs: number }
  | { readonly kind: "failed"; readonly message: string; readonly stderr: string };

const runs = 5;
const warmups = 3;
const seedStart = 0;
const findStart = 240;
const stressTimeoutMs = 20_000;
const artifact = resolve(process.argv[2] ?? "artifacts/first-playable-timing.json");
const root = resolve("dist");

const siteBuildings = [
  { site: "a01", kind: "well", mana: 0, link: "a02" },
  { site: "a02", kind: "ring", mana: 0, produced: 5 },
  { site: "a03", kind: "well", mana: 0, link: "a04" },
  { site: "a04", kind: "ring", mana: 0, produced: 3 },
  { site: "b01", kind: "well", mana: 0, link: "b02" },
  { site: "b02", kind: "ring", mana: 0, produced: 1 },
  { site: "z01", kind: "well", mana: 0, link: "z02" },
  { site: "z02", kind: "ring", mana: 0, produced: 5 },
] as const;

const fields: readonly Field[] = [
  { name: "eight-sites", setup: { buildings: siteBuildings } },
  { name: "all-space", setup: { navigationOnly: true } },
];

function counted(family: string, command: string, prelude: string[], suffix: (count: number) => string[]): Command[] {
  return [1, 99, 9999].map((count) => ({ family, command, count, prelude, keys: [...suffix(count)] }));
}

const commands: Command[] = [
  ...["w", "b", "e", "W", "B", "E"].flatMap((key) => counted("words", key, [], (count) => [...String(count), key])),
  ...["h", "j", "k", "l"].flatMap((key) => counted("axis", key, [], (count) => [...String(count), key])),
  ...["^", "$", "G"].flatMap((key) => counted("lines", key, [], (count) => [...String(count), key])),
  ...counted("lines", "gg", [], (count) => [...String(count), "g", "g"]),
  { family: "lines", command: "0", count: null, prelude: [], keys: ["0"] },
  ...["f", "F"].flatMap((key) => counted("find", key, ["j"], (count) => [...String(count), key, "x"])),
];

const elapsedProbes = [TICK_MS * 6_000, TICK_MS * 60_000] as const;

function median(values: number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)]!;
}

function version(command: string, args: string[]): string {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function environment(): Record<string, string> {
  return {
    measuredAt: new Date().toISOString(),
    machine: `${hostname()} ${platform()} ${release()} ${arch()}`,
    bun: Bun.version,
    typescript: version("tsc", ["--version"]),
    harness: "opencode",
    model: process.env.OPENCODE_MODEL ?? "deepseek/deepseek-flash",
    provider: process.env.OPENCODE_PROVIDER ?? "deepseek",
    effort: "high",
  };
}

function key(world: World, value: string): World {
  return game.dispatch(world, { type: "key", key: value });
}

function type(world: World, keys: readonly string[]): World {
  let next = world;
  for (const value of keys) next = key(next, value);
  return next;
}

function position(world: World): number {
  const cursor = game.observe(world).cursor;
  return cursor.y * WORLD_WIDTH + cursor.x;
}

function resultFor(field: string, command: Command, finalPosition: number, finalMode: string, samplesMs: number[]): Result {
  return {
    ...command,
    field,
    finalPosition,
    finalX: finalPosition % WORLD_WIDTH,
    finalY: Math.floor(finalPosition / WORLD_WIDTH),
    finalMode,
    samplesMs: samplesMs.map((time) => Number(time.toFixed(3))),
    medianMs: Number(median(samplesMs).toFixed(3)),
    maxMs: Number(Math.max(...samplesMs).toFixed(3)),
  };
}

async function coreStressChild(): Promise<void> {
  const stressCommands: Result[] = [];
  for (const field of fields) {
    let start = game.scenario(field.setup);
    start = type(start, ["Escape", "g", "g"]);
    for (const command of commands) {
      for (let index = 0; index < warmups; index++) {
        let state = type(start, command.prelude);
        type(state, command.keys);
      }
      const samples: number[] = [];
      let final = start;
      for (let index = 0; index < runs; index++) {
        let state = type(start, command.prelude);
        const started = performance.now();
        state = type(state, command.keys);
        samples.push(performance.now() - started);
        final = state;
      }
      const observation = game.observe(final);
      stressCommands.push(resultFor(field.name, command, position(final), observation.mode, samples));
    }
  }

  const elapsed: ElapsedResult[] = [];
  const economySetup = {
    buildings: siteBuildings.map((building, index) => ({
      ...building,
      site: building.site as SiteId,
      ...(building.kind === "well" && index % 2 === 0 ? { link: siteBuildings[index + 1]!.site as SiteId } : {}),
    })),
  };
  for (const milliseconds of elapsedProbes) {
    for (let index = 0; index < warmups; index++) game.advance(game.scenario(economySetup), milliseconds);
    const samples: number[] = [];
    let final = game.scenario(economySetup);
    for (let index = 0; index < runs; index++) {
      const started = performance.now();
      final = game.advance(game.scenario(economySetup), milliseconds);
      samples.push(performance.now() - started);
    }
    const observation = game.observe(final);
    elapsed.push({
      elapsedMs: milliseconds,
      ticks: Math.floor(milliseconds / TICK_MS),
      samplesMs: samples.map((time) => Number(time.toFixed(3))),
      medianMs: Number(median(samples).toFixed(3)),
      maxMs: Number(Math.max(...samples).toFixed(3)),
      final: {
        elapsedTicks: observation.elapsedTicks,
        remainderMs: observation.remainderMs,
        impCount: observation.impCount,
      },
    });
  }

  const report: CoreStressReport = {
    kind: "direct-core",
    environment: environment(),
    commands: stressCommands,
    elapsed,
  };
  console.log(JSON.stringify(report));
}

function runCoreStress(): CoreStressReport {
  const result = spawnSync(process.execPath, [import.meta.path, "--core-stress"], {
    encoding: "utf8",
    timeout: stressTimeoutMs,
  });
  if (result.error) {
    if ((result.error as { code?: string }).code === "ETIMEDOUT") {
      return { kind: "timeout", timeoutMs: stressTimeoutMs };
    }
    return { kind: "failed", message: result.error.message, stderr: result.stderr ?? "" };
  }
  if (result.status !== 0) {
    return { kind: "failed", message: `Direct-core stress exited with ${result.status}`, stderr: result.stderr ?? "" };
  }
  try {
    return JSON.parse(result.stdout) as CoreStressReport;
  } catch {
    return { kind: "failed", message: "Direct-core stress produced invalid JSON", stderr: result.stdout };
  }
}

async function main(): Promise<void> {
  if (!(await Bun.file(resolve(root, "index.html")).exists())) {
    throw new Error("The production bundle is missing. Run `just build` before the timing probe.");
  }

  const server = Bun.serve({
    hostname: "localhost",
    port: 0,
    async fetch(request) {
      const pathname = decodeURIComponent(new URL(request.url).pathname);
      const path = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
      if (!path.startsWith(root + sep)) return new Response("Not found", { status: 404 });
      const file = Bun.file(path);
      return (await file.exists()) ? new Response(file) : new Response("Not found", { status: 404 });
    },
  });

  try {
    const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    });
    try {
      const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
      await page.goto(new URL("/?clock=manual", server.url).toString());
      await page.waitForFunction(() => document.querySelector("#world")?.getAttribute("data-ready") === "true");
      await page.locator("#world").click({ position: { x: 8, y: 8 } });

      const dispatch = async (keys: readonly string[]): Promise<Sample> => {
        return page.evaluate((values) => {
          const canvas = document.querySelector<HTMLCanvasElement>("#world");
          if (!canvas) throw new Error("The timing canvas is missing.");
          const started = performance.now();
          for (const key of values) {
            canvas.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
          }
          const elapsedMs = performance.now() - started;
          return {
            elapsedMs,
            position: Number(canvas.dataset.position),
            mode: canvas.dataset.mode ?? "",
          };
        }, [...keys]);
      };

      const reset = async (prelude: readonly string[]): Promise<void> => {
        await dispatch(["Escape", "g", "g", ...prelude]);
        const position = await page.locator("#world").evaluate((element) => Number((element as HTMLCanvasElement).dataset.position));
        const expected = prelude.length === 0 ? seedStart : findStart;
        if (position !== expected) throw new Error(`Timing reset reached ${position}, expected ${expected}.`);
      };

      const results: Result[] = [];
      const fieldsReport: Array<{ name: string; final: unknown }> = [];
      for (const field of fields) {
        await page.evaluate((setup) => window.__vimFlowTest!.load(setup), field.setup);
        for (const command of commands) {
          for (let index = 0; index < warmups; index++) {
            await reset(command.prelude);
            await dispatch(command.keys);
          }
          const samples: Sample[] = [];
          for (let index = 0; index < runs; index++) {
            await reset(command.prelude);
            samples.push(await dispatch(command.keys));
          }
          const positions = new Set(samples.map((sample) => sample.position));
          const modes = new Set(samples.map((sample) => sample.mode));
          if (positions.size !== 1 || modes.size !== 1) {
            throw new Error(`Unstable timing observation for ${field.name} ${command.command}.`);
          }
          const sample = samples[0]!;
          results.push(resultFor(field.name, command, sample.position, sample.mode, samples.map((value) => value.elapsedMs)));
        }
        const final = await page.evaluate(() => window.__vimFlowTest!.snapshot());
        fieldsReport.push({ name: field.name, final });
      }

      const coreStress = runCoreStress();
      if (coreStress.kind === "direct-core") {
        const direct = new Map(coreStress.commands.map((result) => [
          `${result.field}:${result.family}:${result.command}:${result.count ?? "default"}`,
          result,
        ]));
        for (const result of results) {
          const reference = direct.get(`${result.field}:${result.family}:${result.command}:${result.count ?? "default"}`);
          if (!reference) throw new Error(`Direct-core stress did not measure ${result.field} ${result.command}.`);
          if (reference.finalPosition !== result.finalPosition || reference.finalMode !== result.finalMode) {
            throw new Error(`Browser dispatch disagrees with the direct core for ${result.field} ${result.command}.`);
          }
        }
      }
      const report = {
        kind: "first-playable navigation dispatch",
        method: {
          target: "production bundle through Bun.serve with the manual test clock",
          dispatch: "sequential synthetic keydown events on the focused canvas",
          measured: "event mapping, core step, status update and canvas redraw",
          "direct-core-stress": `bounded child process, ${stressTimeoutMs} ms timeout`,
          warmups,
          runs,
          seedStart,
          findStart,
          fields: fields.map((field) => field.name),
          elapsedProbes: elapsedProbes.map((milliseconds) => ({ milliseconds, ticks: Math.floor(milliseconds / TICK_MS) })),
        },
        environment: { ...environment(), chromium: browser.version() },
        results,
        fields: fieldsReport,
        coreStress,
      };

      await mkdir(dirname(artifact), { recursive: true });
      await writeFile(artifact, `${JSON.stringify(report, null, 2)}\n`);

      console.log(`First-playable timing probe: ${fields.length} fields, ${results.length} commands, ${warmups} warmups, ${runs} runs`);
      console.log("field  family  command  count   final / median ms (max ms)");
      for (const result of results) {
        const count = result.count === null ? "default" : String(result.count);
        console.log(`${result.field.padEnd(6)} ${result.family.padEnd(7)} ${result.command.padEnd(7)} ${count.padEnd(7)} ${result.finalPosition} (${result.finalX},${result.finalY}) / ${result.medianMs.toFixed(2)} (${result.maxMs.toFixed(2)})`);
      }
      if (coreStress.kind === "direct-core") {
        console.log(`Direct-core stress: ${coreStress.commands.length} commands, ${coreStress.elapsed.length} elapsed probes`);
        for (const probe of coreStress.elapsed) {
          console.log(`  ${probe.ticks} ticks / median ${probe.medianMs.toFixed(2)} ms (max ${probe.maxMs.toFixed(2)}), ${probe.final.impCount} imps`);
        }
      } else if (coreStress.kind === "timeout") {
        console.log(`Direct-core stress timeout: ${coreStress.timeoutMs} ms bound`);
      } else {
        console.log(`Direct-core stress failed: ${coreStress.message}`);
      }
      console.log(`Artifact: ${artifact}`);
    } finally {
      await browser.close();
    }
  } finally {
    server.stop(true);
  }
}

if (process.argv.includes("--core-stress")) {
  await coreStressChild();
} else {
  await main();
}
