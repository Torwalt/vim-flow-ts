---
reviews: docs/plans/CURSOR_SURVIVAL_EXECUTION.md
test: no
review-base: f196f63eeeffdbfd642473fc6714cbb52cb066b4
review-head: 4dfcf30cfe729446f900d0a7253aadc16b620263
---

# Review of CURSOR_SURVIVAL_EXECUTION

Status: written by `ploopy review` on 2026-10-27 against
`4dfcf30cfe729446f900d0a7253aadc16b620263`. It reviews 9 landed units of
`docs/plans/CURSOR_SURVIVAL_EXECUTION.md`.

Only required fixes go into `docs/plans/CURSOR_SURVIVAL_EXECUTION_FIXES.md`:
evidenced defects, regressions, violated repository rules or unmet plan
requirements. Useful optional improvements go into one follow-up issue for this
review pass, using the session's persistence instructions. Unsupported concerns
are dropped. Zero fixes and zero optional findings is a successful review.
Explain required design choices and their alternatives under *For the author*.

One frontier session reviews the complete change `git diff
f196f63eeeffdbfd642473fc6714cbb52cb066b4..4dfcf30cfe729446f900d0a7253aadc16b620263`
against the plan at the recorded tip, including fixes already applied. It checks
the units and their integration itself, without collecting sessions, and writes
the fix plan only when necessary.

## Stage 1 — Review

### 1.1 Review the branch against the plan

Review: direct
Agent: codex
Model: gpt-6.1-sol
Effort: high

**Goal:** evidence checked, duplicates merged, required fixes separated from
optional improvements and unsupported concerns dropped; a fix plan only for
required fixes, with any necessary design decisions resolved; optional findings
persisted together in one issue.

**Done when:** the review summary is committed under *For the author*, the fix
plan when necessary lints clean, and any optional findings are committed in one
follow-up document linked from the summary. No source or tests changed.

## For the author

Reviewed 2026-10-27: the complete branch change
`f196f63eeeffdbfd642473fc6714cbb52cb066b4..4dfcf30cfe729446f900d0a7253aadc16b620263`
against [the execution plan](CURSOR_SURVIVAL_EXECUTION.md) and
[survival authority](../cursor-survival.md). The recorded target above is
unchanged. This was one direct review, without collected review sessions or
delegated agents. Later commits before this review only changed review-plan
bookkeeping; implementation evidence is the recorded tip.

Outcome: **six required fixes, zero optional findings**. The branch implements
the intended survival loop, but the defects below prevent accepting it as
complete. The [fix plan](CURSOR_SURVIVAL_EXECUTION_FIXES.md) contains six
self-contained implementation units and the necessary decisions. No optional
follow-up document was created.

### Required fixes

1. **Troops escape the interior and invalidate snapshots.** At tick 4, put the
   cursor at `(5,0)` and an enemy at `(4,1)` with cooldown 100. Advancing 100ms
   moves the enemy north onto `(4,0)`. Loading that result's snapshot fails with
   `troops[0] must be an interior cell`. `src/core/world.ts:1265` permits the
   entire world in BFS and movement (`distanceField` at 1277; destination checks
   at 1330/1363), while `troopPosition` at 659 rejects boundary troops.
   Authority §7 requires interior distance fields; §8 requires validated state
   and snapshots. Keep troops interior and route this enemy east to `(5,1)`.

2. **Scenario validation accepts populations above the game caps.** A ring
   `b001` with `produced:6` and six distinct allied serials at `(20+i,20)` is
   accepted with six living allies; 129 distinct enemies at `(20+i,20)` are
   also accepted. `src/core/world.ts:710` validates individual troop data but
   never counts populations. Later production/wave guards at 1179/1403 do not
   repair the invalid initial state. Authority §§6–8 require five living allies
   per origin ring, enemy cap128 and validated cap invariants. Reject these
   scenarios while preserving arbitrarily large supported total-produced
   counts with legal living populations.

3. **Navigation-only worlds acquire hidden survival simulation.** Advancing
   `game.scenario({rules:"survival", navigationOnly:true})` by 30000ms produces
   three enemies. Its observation still reports wave zero and its snapshot
   omits those troops, so reconstruction changes the state. `tickWorld` at
   `src/core/world.ts:1456` branches only on rules, despite navigation-only
   troop rejection at 747, fixture composition at 900, snapshot handling at
   957 and wave suppression at 2096. Preserve the navigation-only boundary
   promised by authority §§2/7 and execution unit 1.1: advance its clock without
   survival economy, waves, movement or combat.

4. **Accepted numeric boundary states become unloadable after a transition.**
   With `M=Number.MAX_SAFE_INTEGER`, a funded ring at `produced:M` creates
   serial `9007199254740992`; a ready adjacent enemy attacking on tick M stores
   cooldown `9007199254741000`; one enemy kill at `kills:M` stores
   `9007199254740992`. All three resulting snapshots are rejected by the same
   factory's safe-integer checks. Evidence: `src/core/world.ts:1192`,
   1202/1233/1236/1431/1880 and 1471, versus validators at 650/674/679/795.
   The issue is returned invalid state and loss of exact counter/identity
   semantics, not merely absent extreme-value tests. Authority §§6/8 and the
   repository's exact-domain rule require checked arithmetic at these writes.

5. **Required prompts and survival status are outside the visible UI.** A real
   Chromium check at 1000x700 found the initial legend extending from x=890.59
   to 1339.47 and the clock starting at x=1355.47. At 1280px while typing
   `imana`, the notice starts at x=1277.27 and the legend at x=1570.52.
   `src/web/style.css:44` clips the single-line HUD. Its 720px media rule at 82
   additionally hides resources, draft, notice, legend and survival status:
   at 600px after building and typing `Foo`, both the Name draft and
   default/commit/cancel prompt are `display:none`. The only prompt paths are
   `src/web/main.ts:127`/136 and HUD assignments at 581–593. Authority §§4/8
   and execution units 2.2/4.1 require actual visible text. Browser tests that
   assert text content do not establish that users can read it. Restore readable
   prompts and status while preserving the specified viewport geometry.

6. **The coverage map's authority link is broken.**
   `docs/survival-coverage.md:3` targets `../cursor-survival.md`, resolving to
   a nonexistent repository-root file. Its correct sibling is
   `docs/cursor-survival.md`. Execution unit 4.1 requires the authority move and
   reference updates together. Repair the relative target.

### Required decisions and alternatives

The fix plan resolves these without an interactive design gate:

- **Interior movement:** Keep boundary cursor navigation, seed cardinal interior
  neighbours at distance one for a boundary cursor, and expand only in the
  interior. Corners have no reachable cardinal interior neighbour, so enemies
  wait there. Permitting boundary troops contradicts the authority/validated
  domain; clamping the cursor or projecting a different chase target changes
  the specified Vim motion or targeting rules.
- **Counter overflow:** Keep safe-integer counters and reject a transition
  before it would return an invalid counter, as elapsed-tick overflow already
  does. Keep all currently accepted safe-integer scenario values. Wider integer
  representations are a possible larger interface migration; silently
  saturating counters or skipping funded summons/attacks breaks progress and
  identity/cooldown semantics.
- **Visible UI:** Use bounded survival overlays for prompts and HUD overflow,
  with wrapping/compact text, preserving the 32-pixel HUD, cells, gutter and
  legacy layout. Increasing HUD height would also require revising camera
  geometry despite the authority preserving it; hiding required text or
  requiring manual scrolling does not fulfill the presentation requirement.

The cap fix rejects invalid supplied populations rather than trimming them.
Navigation-only elapsed time retains the existing clock semantics. Neither
needs a new gameplay rule. The configured implementation agent remains
OpenCode / `deepseek/deepseek-flash`, high effort, as recorded in `.ploopy.toml`.

### Scope checked and dropped concerns

Inspected all changed implementation, browser presentation, new core/browser
tests, documentation and historical-suite routing in the recorded range,
following the shared navigation, clock, clipping and input helpers where needed.
Checked integration across all nine units: profiles and snapshots; dynamic
placement/links/gate; logical terrain versus grass/gutter; Insert/Name/rally;
Finder; population/replacements/combat; waves/chase/contact/death/restart; allied
rally/aggro/occupancy; faction/health/status presentation and the real-key loop.
Frozen first-playable artifacts remain unchanged; historical browser diffs only
add explicit legacy routing. Ploopy state and handovers supplied context, not
correctness evidence. The completed sibling implementation was not read.

Dropped after checking:

- A separate enemy-at-rally-commit concern: Insert captures the cursor's cell
  and cannot move it; hostile movement/spawning cannot enter the cursor. Thus
  a legal running world cannot acquire an enemy on that captured cell while
  typing. No independent defect was established.
- Alleged connect failure on relinking to the existing ring: this is a valid
  idempotent link, so treating it as success and clearing the source is sound.
- A general performance refactor or stronger proof tooling: no measured defect
  was established, and the authority explicitly keeps this increment modest.
  Missing tests alone were not findings.
- Previous provider authentication failures: these are launcher/provider
  failures, not evidence of a branch defect. This review made no provider or
  reviewer-selection change to address them.

### Validation

Focused exported-facade probes reproduced the movement/snapshot, over-cap setup,
navigation-only and three arithmetic defects above. A focused real-browser
probe measured HUD bounds at 800/1000/1280px and confirmed hidden Insert/Name
feedback at 600px. The broken coverage link was resolved relative to its file
and its target checked absent. No source or test files were edited.

`ploopy lint docs/plans/CURSOR_SURVIVAL_EXECUTION_FIXES.md` reports six units,
OK; `ploopy show` confirms a unit receives the shared decisions and its own
self-contained work order. Both the review and fix plans lint clean.

`nix develop --command just verify` passed: the core suites, 106 browser checks
across development and production, frozen first-playable integrity/completion,
all 50 finite navigation obligation checks, type checking and `benchpress lint`.
The full run was the repository-required finishing check, not evidence that the
independently reproduced defects are absent. `git diff --check` also passed.
No flake changes were made, so `just check-nix` was not applicable.

