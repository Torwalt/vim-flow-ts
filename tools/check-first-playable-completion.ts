import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type Case = { readonly id: string; readonly requires: readonly string[] };
type Requirement = {
  readonly status?: string;
  readonly unit?: string;
  readonly exports?: readonly string[];
  readonly tests?: readonly string[];
  readonly cases?: readonly string[];
};
type Coverage = {
  readonly authority?: string;
  readonly corpus?: string;
  readonly requirements?: Record<string, Requirement>;
};

const root = resolve(import.meta.dir, "..");
const manifest = JSON.parse(readFileSync(resolve(root, "spec/first-playable/manifest.json"), "utf8")) as {
  readonly files?: Record<string, string>;
  readonly caseCount?: number;
  readonly requirementIds?: readonly string[];
};
const coverage = JSON.parse(readFileSync(resolve(root, "spec/first-playable/coverage.json"), "utf8")) as Coverage;
const requirements = coverage.requirements ?? {};
const files = manifest.files ?? {};
const corpus = new Map<string, Case>();

for (const path of Object.keys(files)) {
  if (!path.endsWith(".json")) continue;
  const cases = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Case[];
  if (!Array.isArray(cases)) throw new Error(`Not a case array: ${path}`);
  for (const example of cases) {
    if (!example.id || corpus.has(example.id)) throw new Error(`Invalid or duplicate case: ${example.id}`);
    corpus.set(example.id, example);
  }
}

const failures: string[] = [];
const check = (condition: boolean, message: string): void => {
  if (!condition) failures.push(message);
};

const requiredIds = [...(manifest.requirementIds ?? [])].sort();
const coveredIds = [...new Set(Object.values(requirements).flatMap(requirement => requirement.cases ?? []))].sort();
const mappedIds = Object.keys(requirements).sort();

check(manifest.caseCount === corpus.size, `Manifest case count ${manifest.caseCount} differs from ${corpus.size} corpus cases`);
check(requiredIds.join(",") === mappedIds.join(","), "Coverage requirement IDs differ from the frozen manifest");
check(coverage.authority === "docs/first-playable.md", "Coverage does not point at the shared authority");
check(coverage.corpus === "spec/first-playable", "Coverage does not point at the shared corpus");

for (const id of requiredIds) {
  const requirement = requirements[id];
  check(requirement !== undefined, `${id} is missing from coverage`);
  if (!requirement) continue;
  check(requirement.status === "active", `${id} is not active`);
  check(typeof requirement.unit === "string" && requirement.unit.length > 0, `${id} has no owning unit`);
  check(Array.isArray(requirement.exports) && requirement.exports.length > 0, `${id} maps no exports`);
  check(Array.isArray(requirement.cases) && requirement.cases.length > 0, `${id} maps no cases`);
  const testFiles = requirement.tests ?? [];
  check(testFiles.length > 0, `${id} maps no test files`);
  for (const path of testFiles) {
    const absolute = resolve(root, path);
    check(existsSync(absolute), `${id} names a missing test file: ${path}`);
    if (!existsSync(absolute)) continue;
    const source = readFileSync(absolute, "utf8");
    check(/\b(?:test|it)\s*\(/.test(source), `${id} test file has no test cases: ${path}`);
    check(!/\b(?:test|it|describe)\.(?:skip|todo|only|fixme)\b/.test(source), `${id} test file filters cases: ${path}`);
  }
  for (const caseId of requirement.cases ?? []) {
    const example = corpus.get(caseId);
    check(example !== undefined, `${id} names an unknown case: ${caseId}`);
    check(example?.requires.includes(id) === true, `${id} lists a case that does not require it: ${caseId}`);
  }
}

for (const [caseId, example] of corpus) {
  check(example.requires.length > 0, `${caseId} declares no requirement`);
  for (const id of example.requires) {
    check(requirements[id]?.status === "active", `${caseId} requires inactive ${id}`);
  }
  const listedByRequired = example.requires.some(id => requirements[id]?.cases?.includes(caseId));
  check(listedByRequired, `${caseId} is not mapped under any requirement it requires`);
}

for (const caseId of coveredIds) check(corpus.has(caseId), `Coverage maps an unknown case: ${caseId}`);
check(corpus.size === coveredIds.length, `Coverage maps ${coveredIds.length} of ${corpus.size} corpus cases`);

if (failures.length > 0) throw new Error(`First-playable completion failed:\n- ${failures.join("\n- ")}`);

const testFiles = new Set(Object.values(requirements).flatMap(requirement => requirement.tests ?? []));
console.log(`First-playable completion: ${requiredIds.length} active properties, ${corpus.size} mapped cases, ${testFiles.size} active test files, no skip/todo/only filtering.`);
