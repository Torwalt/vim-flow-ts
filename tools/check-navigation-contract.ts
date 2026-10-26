import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

type Manifest = { expectedIds: string[]; files: Record<string, string> };
const manifest = JSON.parse(readFileSync("spec/navigation/manifest.json", "utf8")) as Manifest;
if (manifest.expectedIds.length !== 50 || new Set(manifest.expectedIds).size !== 50) {
  throw new Error("The complete original obligation mapping must contain 50 distinct IDs.");
}
for (const [path, expected] of Object.entries(manifest.files)) {
  const actual = createHash("sha256").update(readFileSync(path)).digest("hex");
  if (actual !== expected) throw new Error(`Unrecorded contract revision: ${path}`);
}
console.log("Contract integrity: 50 mapped obligations; this is not an implementation pass.");
if (process.argv.includes("--complete")) {
  const path = "tests/core/navigation-contract.test.ts";
  if (!(await Bun.file(path).exists())) throw new Error("Navigation contract is pending: no implementation test assembly exists.");
  const result = Bun.spawnSync(["bun", "test", path], { stdout: "pipe", stderr: "pipe" });
  const output = Buffer.concat([result.stdout, result.stderr]).toString().replace(/\x1b\[[0-9;]*m/g, "");
  process.stdout.write(output);
  if (result.exitCode !== 0) throw new Error("Navigation contract tests failed.");
  const passed = Array.from(output.matchAll(/^\(pass\) ([a-z]+\.[a-z_]+)(?:\s|$)/gm), m => m[1]!);
  const expected = new Set(manifest.expectedIds);
  if (passed.length !== 50 || new Set(passed).size !== 50 || passed.some(id => !expected.has(id)) || /\b\d+ (?:skip|todo)\b/.test(output)) {
    throw new Error("Completion requires all 50 distinct original named tests passing, without skip/todo/only filtering.");
  }
  console.log("All 50 finite navigation obligation checks passed; no universal proof is claimed.");
}
