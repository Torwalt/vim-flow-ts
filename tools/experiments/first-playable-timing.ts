import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { arch, hostname, platform, release } from "node:os";
import { dirname, resolve, sep } from "node:path";

type Command = {
  readonly family: string;
  readonly command: string;
  readonly count: number | null;
  readonly prelude: readonly string[];
  readonly keys: readonly string[];
};

type Sample = { readonly elapsedMs: number; readonly position: number; readonly mode: string };
type Result = Command & {
  readonly finalPosition: number;
  readonly finalMode: string;
  readonly samplesMs: number[];
  readonly medianMs: number;
  readonly maxMs: number;
};

const runs = 5;
const warmups = 3;
const seedStart = 0;
const findStart = 240;
const artifact = resolve(process.argv[2] ?? "artifacts/first-playable-timing-baseline.json");
const root = resolve("dist");

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

function median(values: number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)]!;
}

function version(command: string, args: string[]): string {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

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
    await page.goto(server.url.toString());
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
        throw new Error(`Unstable timing observation for ${command.command}.`);
      }
      const times = samples.map((sample) => sample.elapsedMs);
      results.push({
        ...command,
        finalPosition: samples[0]!.position,
        finalMode: samples[0]!.mode,
        samplesMs: times.map((time) => Number(time.toFixed(3))),
        medianMs: Number(median(times).toFixed(3)),
        maxMs: Number(Math.max(...times).toFixed(3)),
      });
    }

    const environment = {
      measuredAt: new Date().toISOString(),
      machine: `${hostname()} ${platform()} ${release()} ${arch()}`,
      bun: Bun.version,
      chromium: browser.version(),
      typescript: version("tsc", ["--version"]),
      harness: "opencode",
      model: process.env.OPENCODE_MODEL ?? "deepseek/deepseek-flash",
      provider: process.env.OPENCODE_PROVIDER ?? "deepseek",
      effort: "high",
    };
    const report = {
      kind: "first-playable navigation baseline",
      method: {
        target: "production bundle through Bun.serve",
        dispatch: "sequential synthetic keydown events on the focused canvas",
        measured: "event mapping, core step, status update and canvas redraw",
        warmups,
        runs,
        seedStart,
        findStart,
      },
      environment,
      results,
    };

    await mkdir(dirname(artifact), { recursive: true });
    await writeFile(artifact, `${JSON.stringify(report, null, 2)}\n`);

    console.log(`Baseline timing probe: ${results.length} commands, ${warmups} warmups, ${runs} runs`);
    console.log("family  command  count   final / median ms (max ms)");
    for (const result of results) {
      const count = result.count === null ? "default" : String(result.count);
      console.log(`${result.family.padEnd(7)} ${result.command.padEnd(7)} ${count.padEnd(7)} ${result.finalPosition} / ${result.medianMs.toFixed(2)} (${result.maxMs.toFixed(2)})`);
    }
    console.log(`Artifact: ${artifact}`);
  } finally {
    await browser.close();
  }
} finally {
  server.stop(true);
}
