import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Integrity/syntax of planner-authored examples; never an implementation verdict.
const root = resolve(import.meta.dir, "..");
const manifest = JSON.parse(readFileSync(resolve(root, "spec/first-playable/manifest.json"), "utf8")) as {
  files: Record<string, string>; caseCount: number; requirementIds: string[];
};
const ids = new Set<string>();
const requirements = new Set(manifest.requirementIds);
for (const [path, hash] of Object.entries(manifest.files)) {
  const bytes = readFileSync(resolve(root, path));
  if (createHash("sha256").update(bytes).digest("hex") !== hash) throw Error(`Unrecorded first-playable authority/corpus edit: ${path}`);
  if (!path.endsWith(".json")) continue;
  const cases = JSON.parse(bytes.toString()) as Array<{ id: string; requires: string[]; setup: object; events: object[]; expect: object }>;
  if (!Array.isArray(cases)) throw Error(`Not a case array: ${path}`);
  for (const c of cases) {
    if (!c.id || ids.has(c.id) || !c.requires.length || c.requires.some(id => !requirements.has(id)) ||
        !c.setup || !Array.isArray(c.events) || !c.expect) throw Error(`Invalid/duplicate case: ${c.id}`);
    ids.add(c.id);
  }
}
if (ids.size !== manifest.caseCount) throw Error("Case count differs from the frozen corpus");
console.log(`First-playable authority/corpus intact: ${ids.size} examples, ${requirements.size} required properties; implementation not assessed.`);
