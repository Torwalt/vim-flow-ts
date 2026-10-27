---
test: yes
agent: opencode
model: deepseek/deepseek-flash
effort: high
context: docs/cursor-survival.md docs/survival-coverage.md docs/plans/CURSOR_SURVIVAL_EXECUTION.md
---

# Fixes from the review of CURSOR_SURVIVAL_EXECUTION

Written 2026-10-27 against `4dfcf30cfe729446f900d0a7253aadc16b620263`.
Only required fixes are included. The implementation agent and settings above
are the repository's configured implementation run, not the review session's.
Preserve the frozen first-playable contract and its browser routing. Update
`docs/survival-coverage.md` with each new regression example and any equivalent
interface revision. Each unit first reproduces its defect with a failing test
where practical, makes the smallest correction, and leaves the checks green.

## Required design decisions

### D1 — Troops and distance-field traversal stay in the interior

**Choice:** Troop destinations and BFS traversal are restricted to
`x=1..238, y=1..158`. Cursor navigation still reaches the boundary. An interior
cursor seeds its field at distance zero. A boundary cursor is a virtual source:
seed its cardinal interior neighbours at distance one, then expand only through
interior cells. A corner cursor has no cardinal interior neighbour, so its
hostile distance field has no reachable interior cells and enemies wait.
Retain north/east/south/west ties, shared fields, occupancy and combat holds.

**Why:** Authority §7 explicitly says interior BFS, and the validated troop
domain already excludes boundary cells. This keeps actual cursor coordinates
and cardinal distance rather than inventing a projected target or preventing
supported Vim boundary movement.

### D2 — Report arithmetic overflow before returning an invalid world

**Choice:** Retain the existing nonnegative safe-integer representation for
production serials, attack ticks and kills. Before a transition would produce
an out-of-domain counter, throw a descriptive error, consistently with
`advance` rejecting elapsed-tick overflow. Do not wrap, saturate, reuse an ID,
silently skip a funded summon/attack, or return an unloadable snapshot. Keep
currently accepted safe-integer scenario values accepted; ordinary in-domain
transitions retain their exact behavior. Pure operations leave the input world
unchanged when they throw.

**Why:** Accepted boundary scenarios currently produce state that the same
factory rejects. Checked arithmetic preserves the existing numeric API and
identity/cooldown invariants without expanding this pass into an arbitrary-size
counter API. A wider representation would require a separately justified
interface migration and is unnecessary to fix the invalid returned states.

### D3 — Required survival text stays visible without changing world geometry

**Choice:** Preserve the 32-pixel HUD, 12x20 cells, four-cell survival gutter and
legacy layout. Use bounded survival overlays for command/name text and status
that cannot fit in the HUD, with wrapping or compact text as needed. At normal
desktop and narrow playable sizes (including 600x600 and 800x600), display the
current Insert draft/candidates and Name draft/default/commit/cancel prompt;
keep HP/nearby health, wave/countdown, kills/population, rally coordinates,
time/pause status, faction legend and rally hint readable. Notices must be
visible when reporting command failure. No extra interaction is required to
reveal these required fields. Keep Finder and game-over overlays readable.
Tiny viewport clamping must remain functional; fitting all text in the 40-pixel
width camera test is not an additional requirement.

**Why:** Authority §§4 and 8 require visible input feedback and survival status.
Single-line clipping and `display:none` currently remove that feedback. Bounded
overlays satisfy the contract while preserving the specified viewport geometry.

## Stage 1 — Fixes

### 1.1 Keep moving troops inside their validated domain

**Goal:** Fix enemies entering the boundary while chasing a boundary cursor.
With survival cursor `(5,0)`, enemy `e` at `(4,1)` with cooldown 100 and
`elapsedTicks:4`, advancing 100ms currently moves `e` to `(4,0)`.
`game.scenario(game.snapshot(result))` then throws because the troop is not
interior. Under D1 the enemy must move east to `(5,1)` and remain loadable.

**Evidence:** `src/core/world.ts:1265` defines `inWorld` to include boundary
cells; `distanceField` at 1277 and movement checks at 1330 and 1363 use it.
`troopPosition` at 659 rejects those same cells. Authority §7 requires interior
BFS and §8 requires validated snapshots; execution units 3.2/3.3 require
deterministic movement on arbitrary valid scenarios.

**Start from:** `src/core/world.ts` `distanceField`, `moveAllies` and
`moveHostiles`; apply D1 without changing cursor navigation or relaxing troop
validation. Add exported-facade regression examples in the core movement suites.

**Done when:** The exact example above moves to `(5,1)` and round-trips. Varied
top/bottom/left/right boundary cursors and corners never draw troops onto `#`;
corner unreachable behavior, occupancy, cardinal choices and partitioned
advancement follow D1. Existing rally/aggro/chase checks and
`nix develop --command just verify` pass.

### 1.2 Enforce living population caps in survival scenarios

**Goal:** Reject scenarios exceeding five living allies per origin ring or
128 living enemies. Currently a ring `b001` with `produced:6` and six distinct
allied serials at `(20+i,20)`, `i=0..5`, is accepted with `living:6`. Likewise
129 enemies `n0` through `n128` at `(20+i,20)` are accepted. These invalid
populations persist; production/spawn guards only prevent adding more.

**Evidence:** `src/core/world.ts:710` `parseTroops` validates individual troops,
IDs, positions and overlap but never population counts. Guards at 1179 and
1403 only cap subsequent additions. Authority §§6–8 specify the five-living
origin-ring cap, enemy cap128 and validated state with HP/cap invariants.

**Start from:** `parseTroops` and `survivalTroopSetup` in
`src/core/world.ts`, plus `tests/core/survival-combat.test.ts` and
`tests/core/survival-waves.test.ts`. Count allies by origin ring, independent of
position and total-produced serial. Reject invalid setup rather than trimming
or deleting supplied troops. Keep the legacy five-produced contract intact.

**Done when:** Both over-cap examples fail construction. Five living allies
from each of multiple rings and exactly 128 enemies are accepted and round-trip;
large total-produced counts with at most five living allies remain valid.
Replacement production and wave cap checks still pass, as does
`nix develop --command just verify`.

### 1.3 Keep navigation-only worlds free of survival simulation

**Goal:** Advancing `game.scenario({rules:"survival", navigationOnly:true})`
by 30000ms currently creates three enemies even though its observation reports
wave zero, its field remains the navigation fixture, and its snapshot omits
those enemies. Navigation-only worlds must keep their navigation data and
clock without spawning or fighting troops.

**Evidence:** `src/core/world.ts:747` rejects troops in navigation-only setup;
`compose` at 900 and `snapshot` at 957 take navigation-only paths. However,
`tickWorld` at 1456 runs the entire survival simulation based only on `rules`.
`observe` at 2096 suppresses wave progress for navigation-only worlds.
Authority §§2 and 7 preserve navigation-only behavior; execution unit 1.1
requires validated profile snapshots, including the navigation-only profile
covered in `tests/core/survival-profile.test.ts`.

**Start from:** `tickWorld` in `src/core/world.ts` and the exported profile
tests. Skip survival economy, waves, troop movement and combat in
navigation-only worlds while preserving the existing elapsed/remainder,
pause/hidden and navigation behavior.

**Done when:** Navigation-only survival remains troop-free beyond multiple wave
boundaries, wave observations stay zero, custom navigation rows and cursor
motion are preserved, and snapshot reconstruction preserves observations and
future advancement. Add nontrivial elapsed partitions and retain ordinary
survival wave progress. `nix develop --command just verify` passes.

### 1.4 Preserve the numeric domain across survival transitions

**Goal:** Accepted safe-integer scenarios currently return invalid worlds on
overflow. With `M=Number.MAX_SAFE_INTEGER`, a funded ring with `produced:M`
spawns serial `9007199254740992`; a ready enemy adjacent to the cursor at
`elapsedTicks:M-1` attacks after 100ms and stores cooldown
`9007199254741000`; a world with `kills:M` increments kills to
`9007199254740992` when an ally kills an adjacent 1HP enemy. Each result's
snapshot is rejected by `game.scenario`. Apply D2 at these transitions.

**Evidence:** `src/core/world.ts:650`, 679, 674 and 795 validate the counters
with `safeInteger`. Unchecked increments occur in `summonSurvival` at 1192,
cooldown writes at 1202/1233/1236/1431/1880, and the kill accumulation at 1471.
`advance` at 1493 already rejects elapsed-tick overflow. Authority §§6 and 8
require fresh stable IDs, exact shared cooldowns, validated snapshots and varied
supported times; repository rules require the actual supported domain.

**Start from:** `src/core/world.ts` safe-integer validation and the named
transition sites, including input `contact`, troop birth and combat. Follow D2;
do not reduce accepted scenario bounds or change ordinary attack/production
rules. Use real constructors in regression tests, never private-state casts.

**Done when:** The three examples throw a descriptive overflow error without
altering the supplied world. Last representable increments succeed, round-trip
and keep exact IDs/cooldowns/kills; idle or blocked operations which do not
increment a counter remain valid at its maximum. Input contact and spawn
cooldown writes receive equivalent checks. Document the error boundary in the
coverage map; `nix develop --command just verify` passes.

### 1.5 Make survival prompts and status actually readable

**Goal:** Required UI text is clipped or hidden. At 1000x700 in initial survival,
the legend extends from CSS x=890.59 to 1339.47 and the clock starts at 1355.47,
outside the clipped HUD. At 1280px while typing `imana`, the notice starts at
1277.27 and the legend at 1570.52. At 600px, candidates, command draft and Name
draft/default prompt are `display:none`, so typing a name gives no visible
draft. Apply D3 so these features can be read while playing.

**Evidence:** `src/web/style.css:44` keeps the HUD single-line and clipped;
82–91 hide resources/draft/notices/legend and new survival status fields at
720px. `src/web/main.ts:127` and 136 put Insert/Name prompts in HUD resources;
581–593 place status and legend there. Existing browser tests check text
content, which does not establish that it is inside the visible viewport.
Authority §§4 and 8 and execution units 2.2/4.1 require visible prompts, hints
and readable survival status, not merely populated DOM nodes.

**Start from:** `src/web/main.ts` `describeSite`/`render`, `src/web/style.css`
and HUD markup. Add bounded overlays or equivalent positioned presentation per
D3. Do not change core rules, keyboard commands, the 32-pixel HUD geometry or
historical viewport calculations to make space.

**Done when:** Real-key browser regressions at 600x600, 800x600, 1000x700 and
1280x720 demonstrate readable Insert/Name drafts and candidates/prompts,
command failures, and required survival information with long valid building
names and a staged source. Check viewport/clip containment or rendered pixels,
not only `toContainText` or data attributes. Finder, death/restart, tiny viewport,
legacy tests and both browser projects remain green;
`nix develop --command just verify` passes.

### 1.6 Repair the survival coverage authority link

**Goal:** Following the authority link at the top of
`docs/survival-coverage.md` currently resolves to nonexistent
`cursor-survival.md` in the repository root. It must resolve to the implemented
authority at `docs/cursor-survival.md`.

**Evidence:** `docs/survival-coverage.md:3` links `../cursor-survival.md`
despite itself living in `docs/`. Execution unit 4.1 requires the authority move
and references to be updated together.

**Start from:** The authority Markdown link in `docs/survival-coverage.md`.
Change its target to `cursor-survival.md`; leave historical evidence alone.

**Done when:** Resolve the relative link from the coverage file's directory and
confirm the target exists. No new test framework is needed for this link fix.
`nix develop --command benchpress lint` and
`nix develop --command just verify` pass.
