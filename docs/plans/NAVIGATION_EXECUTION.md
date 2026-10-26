---
authority: docs/plans/NAVIGATION.md
context: docs/experiments/comparison.md spec/navigation/obligations.md
test: yes
agent: opencode
model: deepseek/deepseek-flash
effort: high
---

# Implement navigation in ordinary TypeScript

Status: active task document, written 2026-10-26 from common baseline `0e17f02`;
setup supplied the TypeScript baseline and specification, no navigation engine.

## Decisions settled with the author (2026-10-26)

Implement the same navigation without editing, using ordinary TypeScript/Bun,
in a separate personal repository. Use the same OpenCode/DeepSeek Flash executor
at high effort. The authority and comparison protocol hold the shared behavior,
numeric domain, ownership, revision and measurement rules; read them every unit.
The executor chooses private Field/State and algorithms. Keep prior contract
groups active and run just verify. Record actual difficulties and assistance in
docs/experiments/navigation.md. Do not inspect the sibling implementation, edit
NEXT.md, start another run, land or push. Setup did not implement any navigation.

## Stage 1 — Runtime observations and arbitrary scenes

### 1.1 Choose representations and implement the observable model

**Goal:** Implement ModelApi<Field, State>, arbitrary field construction,
observations, pack/view and initial. The model has nine behavioral obligations.

**Start from:** src/core/scene.ts, spec/navigation/api.ts, helpers.ts and
checks.ts. Add src/core/navigation.ts and private model modules as needed.
RegisterModel(actualModel) in tests/core/navigation-contract.test.ts. Do not
implement movement or change the browser yet. Input and Mode are public types;
there is no requirement that State equal View or Field equal string.

**Done when:** All nine model checks pass, independently worked normalization/
roundtrip examples exercise actual exports and arbitrary text, just verify is
green, and evidence records representations and any interface difficulty.

## Stage 2 — Axis movement

### 2.1 Implement counted h/j/k/l destinations and edge behavior

**Goal:** Implement AxisApi, zero identity and clamping for nonnegative bigint
counts, including counts larger than Number.MAX_SAFE_INTEGER.

**Start from:** The model, spec/navigation/api.ts and registerAxis in checks.ts.
Add the axis group while keeping model active. Choose private arithmetic and
clamp before conversion; browser parsing remains later work.

**Done when:** Nine model plus five axis checks pass, extra edge examples are
independent, just verify is green, and arithmetic/large-count choices are recorded.

## Stage 3 — Word and WORD navigation

### 3.1 Implement counted w/b/e and W/B/E

**Goal:** Implement WordsApi with nearest-candidate, zero, count decomposition
and bounds behavior on arbitrary fields, preserving row splits and fallbacks.

**Start from:** The model and candidate/wordSelected relations in helpers.ts.
RegisterWords alongside earlier groups. The relation describes results without
prescribing storage/scans. Production may reuse classification helpers. Supply
independent examples for punctuation, all-space fields and singleton runs.

**Done when:** All four word checks and prior groups pass, count examples are
anchored in actual single-step behavior, just verify passes, and evidence records
candidate selection, repetition, large-count termination and test difficulties.

## Stage 4 — Line and field navigation

### 4.1 Implement 0, ^, $, gg and G destinations

**Goal:** Implement LinesApi including blank-row fallback, ignored caret count,
explicit/default row targets and clamped relative row end.

**Start from:** Model, targetRow/indentSelected helpers and registerLines. Keep
all previous groups. This unit computes destinations; g-prefix grammar is later.

**Done when:** Six line checks and prior groups pass, independent examples cover
blank/nonblank rows and huge counts, just verify is green, and choices are recorded.

## Stage 5 — Counted character find

### 5.1 Implement nth forward/backward row-local find

**Goal:** Implement FindApi: exact nth strict hit, current-cell exclusion,
identity for zero or insufficient matches and no partial-success return.

**Start from:** Model and findSelected/hit relations in helpers.ts. RegisterFind
alongside prior groups. The interval counts matches; the executor chooses a scan
or another terminating representation. Do not add input prefix handling yet.

**Done when:** Three find checks and prior groups pass; independent examples
cover repeated/missing targets, row boundaries and huge ranks; just verify passes;
evidence records rank strategy, absent-count handling and any difficult attempts.

## Stage 6 — Pure input interpretation

### 6.1 Implement counts, case and pending commands

**Goal:** Implement InputApi.step over all four modes, count saturation,
zero disambiguation, literal find targets, g consumption, unsupported/nonprintable
input, Escape, blocked modifiers and extensionality/field/validity preservation.

**Start from:** All completed APIs and input contract in checks.ts. Assemble the
complete NavigationApi in src/core/navigation.ts. Replace cumulative individual
registrations with registerAll(actualApi) in navigation-contract.test.ts, exactly
once. Add actual sequence tests and independent expected destinations on varied
fields. Browser may still draw the baseline.

**Done when:** All 50 named contract tests pass with just contract-complete,
sequence tests cover the authority's parser examples, just verify passes, and
evidence distinguishes interface/test issues from incorrect implementation.

## Stage 7 — Playable browser and complete evidence

### 7.1 Render and exercise the navigation scene

**Goal:** Draw the seeded field/cursor and observed pending mode, capture events
without deciding outcomes, and record the complete experiment result.

**Start from:** Actual NavigationApi, src/web/main.ts, style.css, index.html and
tests/browser/baseline.spec.ts. Keep tests independent and check actual cursor
pixels as well as reported state. Add the browser sequences, blur and modifier
behavior from authority section 5; no editing, time or new game objective.

**Done when:** Add contract-complete to just verify's dependencies; all 50 contract
checks, extra runtime tests and development/production browser tests pass. Record
high-count timings with context and any stalls, actual Ploopy measurements and
limitations. Update README and docs/direction.md, remove navigation-comparison
with benchpress rm and fix links, run benchpress lint and just verify. Leave plan
files/state for Ploopy; do not land or push.
