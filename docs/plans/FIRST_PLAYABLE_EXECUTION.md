---
authority: docs/plans/FIRST_PLAYABLE.md
context: docs/first-playable.md spec/first-playable/obligations.md
test: yes
agent: opencode
model: deepseek/deepseek-flash
effort: high
---

# First playable: TypeScript core and browser

Status: active task document, written 2026-10-26 against `15f3e2c`.

## Decisions settled with the author (2026-10-26)

Implement the shared ASCII RTS economy, local mana and five stationary imps/ring.
Construction is free/immediate; visible simulation continues during typing/menus.
Author tests inside each feature unit, under the same frozen shared requirements.
The author starts the runs. No gameplay/law code has been supplied by this plan.

The shared game authority is `docs/first-playable.md`; requirements/corpus schema
are `spec/first-playable/obligations.md`. Read the case groups owned by this unit.
The shared files are identical in both repositories and frozen before execution.
Do not inspect/port the sibling's new implementation. No run is started here.

Every unit activates its complete required properties/cases and keeps earlier
ones green. A new unit owns its new laws/tests, not the product requirements.
Keep a cumulative `spec/first-playable/coverage.json` mapping requirement IDs to
exports, laws/tests and case IDs, with later work explicitly pending. Final
assembly must report all 18 IDs and all 53 cases covered, no skip/todo/only.
Adapters observe actual core APIs; fixture setup uses validated real factories.
Integrity hashes do not establish proof or behavioral coverage.

Record baseline-stage work separately from new features in each handover:
commits, active IDs/cases, checks, failed approaches, contract/interface revisions,
actual harness/model/provider when known and available usage/timing. Do not
invent missing metrics. Keep raw logs ignored/outside Git; Ploopy records usage.
Do not recreate experiment narratives in docs; the workbench can hold a compact
progress/revision pointer and the handovers hold per-unit receipts.

The existing NAVIGATION authority is historical and subordinate to this pass
where the new default game intentionally differs. Retain its 40x20 compatibility
contract/checks; new game rules belong to a separate facade. Do not delete the
running plan, authority or state. No flake changes are expected.

## Stage 1 — Existing navigation baseline (separate accounting)

### 1.1 Validate and harden the navigation baseline

**Goal:** Establish a separately costed baseline of the existing navigation and
focus/high-count behavior, without adding game features or unnecessary rewrites.

**Start from:** `src/core/words.ts` wordMove, `src/core/model.ts` field/pack/view,
`src/core/navigation.ts` actualApi, `src/web/main.ts` blur/input handlers,
`tests/core/navigation-words.test.ts`, `tests/core/navigation-model.test.ts`,
`tests/browser/navigation.spec.ts` and `justfile`.

**Work:** Revalidate the original 50 checks and arbitrary-field constructor tests.
Add missing boundary regressions only where needed: count/find/go blur,
blocked/Other input and all six word motions at 1/99/9999, with recorded final
positions. Retain a baseline timing probe instead of relying on the old deleted
temporary script. Existing fixed-point optimization should remain unless evidence
requires a repair. Classify any repairs separately. Do not add game geometry,
sites, menus or simulation and do not inspect Bend's repair implementation.

**Done when:** `just contract-complete` and `just verify` pass; all pending-state
blur cases and six high-count word probes are covered and measurements retained;
original exports/obligations remain intact. Record the baseline check/repair
receipt distinctly from later feature effort.

## Stage 2 — World and navigation

### 2.1 Model the larger world, sites and validated observations

**Goal:** Implement shared §§2/6's world model and static glyph composition,
covering W1/W2 with independent runtime/property tests and all world.json cases.

**Start from:** `src/core/model.ts`, `spec/navigation/api.ts`, `src/core/navigation.ts` and `tests/core/navigation-model.test.ts`.
Create `src/core/game.ts` as a new cumulative facade; revalidate all named
landmarks first. Future private modules are executor-owned.

**Work:** Model the exact fixed map/site IDs, cursor, occupancy/link/resource/
created-count data and five reserved imp slots. Implement initial/validated
scenario construction and observations, including arbitrary navigationOnly fields.
Constructing a valid ring fixture with count n yields exactly its first n imps.
Reject invalid fixture inputs instead of narrowing valid cases to the seed.
Render the semantic glyph field without embedding screen/camera information.
Prepare coverage.json, activating W1/W2 and explicitly marking later work pending.
Keep old core/browser behavior green; no construction/time outcomes yet.

**Done when:** world.json cases pass through real APIs; independent roundtrip,
normalization, site-boundary and non-overlap cases pass; W1/W2 have the required
varied-input tests; `just verify` is green.

### 2.2 Navigate the larger text world with the existing grammar

**Goal:** Cover N1/N2 and navigation.json over real 240x160 glyph fields while
preserving the old 40x20 contract, with independent runtime/property tests.

**Start from:** the new game facade, `src/core/axis.ts`, `words.ts`, `lines.ts`, `find.ts`, `input.ts` and `spec/navigation/helpers.ts`.

**Work:** Implement exact dimension-adjusted motion destinations, counts, parser
states, find rank/miss and word/WORD distinctions. Read current composed glyphs.
Use varied and malformed fields through public constructors; include row splits,
blank fields, punctuation, boundary positions, zero/default/huge counts and all
pending modes. Reuse/generalize algorithms and proofs as appropriate; never
silently reinterpret rows as viewport rows. Keep new game bindings for later
units; literal i/p/Space find targets already work. Test fixed-point termination
without changing destinations. No browser viewport or construction work here.

**Done when:** all navigation.json cases and independent generalized motion
examples pass; old integrity/completion checks pass unchanged or with documented
equivalent interface repairs; active coverage and `just verify` are green.

## Stage 3 — Scrollable ASCII world

### 3.1 Replace the landing page with the full-window viewport

**Goal:** Render the new world with exact camera/resize behavior, covering V1
and the camera-only cases in browser.json.

**Start from:** `index.html`, `src/web/main.ts`, `src/web/style.css`,
`tests/browser/test.ts`, `tests/browser/navigation.spec.ts`, the new game facade
and its actual observed glyph/cursor data.

**Work:** Use the 32px HUD, 12x20 cells, DPR and integer camera rule in shared §4.
Render visible cells, real cursor and initial sites; connect browser navigation
to the new core. Handle focus, blocked modifiers, composition and blur. Test
multiple viewport sizes, oversized viewport, long jumps, bottom/right clamping
and resize while cursor is off the old 40x20 fixture. Camera is presentation only.
Migrate old browser fixture assumptions with equivalent navigation/focus/rendering
coverage; keep original direct core regressions. Do not add building/simulation
outcomes in the renderer. Do not serialize the full world on every paint solely
for tests if a truthful observation API suffices.

**Done when:** camera cases match; actual canvas cursor/site glyphs appear at
expected screen coordinates in development AND production; resizing never
changes core state; no document scroll; `just verify` is green.

## Stage 4 — Construction

### 4.1 Build wells and rings through the keyboard menu

**Goal:** Cover B1/B2/I1, construction.json and shared §5's construction behavior
with independent runtime/property tests plus real browser capture/render checks.

**Start from:** the new game facade/model/navigation dispatch, `src/web/main.ts`,
`src/web/style.css`, `tests/browser/test.ts` and prior viewport tests.

**Work:** Add Leader/Build modes, target capture, well/ring selection, Enter
confirmation, Escape cancellation and contextual preview. Only empty -> building
is allowed, immediately/free. Preserve pending source metadata through menu
operations. Precedence keeps f/F targets literal and blocks modified control
keys. Use the same pure build action for direct cases and keyboard dispatch.
Render silhouettes/labels from core glyphs and show contextual status/errors.
No actual economy ticks, links or general text editing yet.

**Done when:** all construction.json cases pass; independent outside-site,
occupied-site, blocked-input, menu-cancel and targeting-locality checks pass;
actual browser menu/preview/confirmation and glyph change are covered in both
projects; full active obligations and `just verify` pass.

## Stage 5 — Typed connections

### 5.1 Stage and commit directed links through building commands

**Goal:** Cover I2/L1/L2, connections.json and shared §§5/6 with
independent runtime/property tests and browser link visualization.

**Start from:** the new game facade's modal dispatcher/model/build action,
`src/web/main.ts`, `src/web/style.css`, browser fixtures and coverage.json.

**Work:** Add captured-site Insert buffers (32 chars), Backspace, exact connect
commands, well Escape/Enter staging, ring Enter commit, ring Escape retry and
Normal Escape cancellation. Blur cancels globally without applying a draft.
Implement directed validity, idempotence and atomic rerouting; leave stored
mana/population at their buildings. Reuse one pure link transition from direct
cases and keyboard paths. Draw persistent arrows/highlights, preview and source
ID independently of navigable text. Test off-screen endpoints and crossing
lines without accidental junctions. No transfer or spawning yet.

**Done when:** exact requested sequence and all connections.json cases pass;
invalid/canceled/blocked operations preserve persistent world data; browser
checks confirm visible source, arrow direction and cancellation across modes;
full active obligations and `just verify` pass.

## Stage 6 — Deterministic production

### 6.1 Advance mana and create five stationary imps per ring

**Goal:** Cover E1–E4/T1/T2, economy.json and clock.json with
independent runtime/property tests over valid arbitrary supported states.

**Start from:** the new world/build/link facade, factories, glyph composition,
coverage.json and existing shared corpus adapters. New private time/economy
modules belong in src/core; browser live scheduling is the next unit's concern.

**Work:** Implement exact quanta, 100ms ticks/remainder, generation, ascending-ID
transfer, spending, ordered individual imp creation, cap/backpressure and
pause/suspension behavior from shared §7. Assert progress as well as bounds,
conservation/locality and count/list agreement. Test saturated/pre-filled buffers,
multiple suppliers, reconnecting capped rings, zero/partitioned elapsed and
pause/resume during drafts/menus. Preserve cursor/draft while time advances.
Expose actual updated glyphs and inspector data; no browser-side calculation of
mana, cap eligibility, production or simulation remainder.

**Done when:** all economy/clock cases plus independent varied-resource/time
examples pass; no sixth imp, overlapping spawn or resource underflow; paused
elapsed is ignored and time partitioning agrees; all active tests pass
and `just verify` is green.

## Stage 7 — Playable integration and completion

### 7.1 Wire live time, verify the complete loop and retain measurements

**Goal:** Complete V2, activate all 18 required properties and all 53 cases, and
leave a playable build/connect/produce sandbox in development and production.

**Start from:** the completed game facade, `src/web/main.ts`, `src/web/style.css`,
`tests/browser/test.ts`, `tests/browser/navigation.spec.ts`, `justfile`,
`tools/preview.ts`, coverage.json and all spec/first-playable case groups.

**Work:** Forward monotonic elapsed time into the core, implement visibility
suspension/no catch-up and Normal p manual pause, and render resource/time/5-imp
status while editing/menus remain usable. Supply a deterministic browser clock
harness through actual production update/render paths. Check the full keyboard
loop, five individual glyph positions, link direction, resize, long navigation,
all modal blur states, blocked shortcuts and composition in both browser projects.
Retain `tools/experiments/first-playable-timing.ts` and run shared §9's measurements,
including high counts and correct final observations; record baseline separately.
Add `just first-playable-complete` and make verify require it. It must check actual
active coverage/case execution, not only manifest bytes.

Update README/direction to what actually runs. Resolve the planned gameplay
workbench topic using Benchpress, preserving the permanent shared authority and
corpus; no NEXT reorder. Do not delete FIRST_PLAYABLE plan/authority/state.
Record outstanding limitations and the final implementation/measurement receipt
in the handover; research synthesis follows independently after completion.

**Done when:** all 53 actual cases and full coverage pass without filtering;
`just first-playable-complete` and `just verify` pass; development/production
browser tests observe real glyph/cursor/arrow output; retained timing script
reports final positions and repeated timings; documentation matches the game.
