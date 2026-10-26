# First-playable execution authority: TypeScript

Status: active authority, written 2026-10-26 against `15f3e2c`. The shared
behavior is docs/first-playable.md; this file describes the implementation arm.

Decisions settled with the author (2026-10-26): free immediate construction,
continuous visible time during typing/menus, local linked mana, individual idle
imps capped at five/ring, ASCII text-grid RTS, and per-unit executor-authored
Bend laws. Other constants are explicitly planner-selected shared defaults.

## 1. TypeScript workflow

Author tests within EACH feature unit against the supplied requirements and
independent shared cases. No new production model, algorithms or tests through
an engine stub have been supplied. Choose private storage and helpers, preserve
the supported domains, and expose real validated constructors for varied inputs.
Use immutable/pure transitions; browser code cannot decide game outcomes.

`src/core/game.ts` is the new intended cumulative facade; private modules/API
names remain executor choices. New game behavior stays separate from the original
40x20 public facade. The new engine may reuse/generalize private machinery while
keeping old exported behavior and original obligation tests intact. Use exact
integer resource/time arithmetic; bigint where necessary for natural domains,
never silently round large counts/elapsed values through number conversion.

Each unit maps its required properties to named runtime/property-style tests and
shared case IDs. Expected results cannot call the production candidate, transfer
or summon helper being checked. Use hand-worked examples and varied valid
scenarios, including malformed field text through the real factory. No unsafe
casts to create opaque State; fixture adapters construct through real APIs.
Finite coverage is not a universal theorem, regardless of assertion counts.

## 2. Contract and assembly

Keep spec/navigation's original 50 named tests and integrity/completion checks
active. Equivalent type/helper/test-interface revisions require old/new mapping,
independent examples and recorded preservation evidence; do not edit expected
results, skip cases or bypass the unchanged auditor. Browser fixture assumptions
may migrate to the new default page while core compatibility remains checked.

The shared authority, obligations.md, cases and fixture checker are frozen.
`spec/first-playable/coverage.json` and per-feature acceptance harnesses are
executor-owned. Wire all active tests into `just verify`; final
`just first-playable-complete` requires all 18 IDs and 53 actual cases active
and passing without skip/todo/only filtering. Do not claim completion from
manifest/count checks alone. The current contract-complete environment wrapper
unsets Bun's AI markers so names remain visible: preserve it or demonstrate an
equivalent fix without weakening the name audit.

## 3. Measurement and baseline

The completed navigation experiment is preserved in Git. Classify unit 1.1 as
baseline repair/validation; report its cost separately from units 2.1 onward.
Do not pretend both arms start with equal defects or that this isolates language
from workflow. Do not implement the new game in that baseline unit.

Use the same feature boundaries and OpenCode / deepseek/deepseek-flash high
configuration as the other arm. The author's run choices may override defaults;
record actual routes, fallback, cache/input/output/reasoning, elapsed and price
from available harness records. Repository configuration already disables
secondary/rescue; do not add automatic stronger intervention silently.

Performance measurements follow shared §9. Retain the benchmark script in
`tools/experiments/first-playable-timing.ts`; save machine-readable results to an
ignored/local artifact path and summarize in final handover. No arbitrary timing
pass mark is invented. If stress probes stall, terminate the owned probe with a
recorded bound and fix its algorithm, keeping all required behavior.
