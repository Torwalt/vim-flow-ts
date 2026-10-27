---
authority: docs/plans/CURSOR_SURVIVAL.md
test: yes
---

# Cursor survival execution

Status: active task document, written 2026-10-27 against `fc960b9` (extended before execution).

## Decisions settled with the author (2026-10-27)

Continue TypeScript independently; pause Bend comparison. Add populated terrain,
relative row numbers, typed construction with autocomplete/names, Space f
building finding and hostile waves attacking a mortal cursor. Planner defaults
and exact contracts are in the authority, explicitly distinguished from those
decisions. Author extension: freely place buildings, set a shared rally point,
and fight at a fixed enemy spawn. Planner defaults keep one global rally command
and simple deterministic troop movement; no individual-unit control.

The authority is docs/plans/CURSOR_SURVIVAL.md. Frozen first-playable artifacts
are historical acceptance, not editable new gameplay specifications. Preserve
the 40x20 navigation facade. Browser defaults change only when the new input UI
lands. No Bend work, new benchmark campaign or general engine abstraction.

## Stage 1 — Separate the live game from historical acceptance

### 1.1 Introduce rules profiles and survival scenario support

**Goal:** Establish the explicit legacy/survival boundary in authority §2 without
changing default browser behavior yet.

**Start from:** src/core/game.ts facade, src/core/world.ts World/Scenario,
parseScenario, construct, initial, snapshot, observe, dispatch; tests/browser/test.ts,
src/web/main.ts testLoad and initial state; spec/first-playable/coverage.json;
tools/check-first-playable-completion.ts.

**Done when:** Explicit survival initial/scenario construction and validated
profile snapshots work; omitted profile retains every historical outcome.
Browser can select ?rules=first-playable. Begin docs/survival-coverage.md mapping
§§2–8 with later features explicitly pending. Document intended profile routing
for historical browser tests, without claiming new behavior implemented.
Independent tests cover invalid profiles and profile round-trip. just verify passes.
No terrain/input/combat changes in this unit.

### 1.2 Support dynamically placed buildings and the fixed gate map

**Goal:** Implement survival building identity, placement validation and map
geometry in authority §§2–4 and §7, while keeping historical sites unchanged.

**Start from:** src/core/world.ts SITE_IDS/SiteId, SiteDefinition,
siteDefinition/siteCenter/siteAt, buildingSetup/parseScenario, build/link,
compose/snapshot/observe; src/core/game.ts exports.

**Done when:** Exported survival build operations accept cursor-centered 11x7
footprints, allocate b001-style IDs only on success, support32 buildings and
validate arbitrary legal dynamic positions/links. Empty survival has no fixed
sites. Gate at(200,136) renders logical art with reserved5x5 patch; terrain and
building composition respect it. Tests independently cover map edges, overlap,
scenery clearing, gate exclusion, successful-ID sequencing, link endpoints,
rejected scenarios and snapshot round-trip. Set default shared rally(13,10) in
survival observations/scenarios for later commands; no troop motion yet.
Legacy fixed-site APIs/cases remain intact. Update coverage; just verify passes.

## Stage 2 — Make the world readable and editable

### 2.1 Populate terrain and add relative row numbers

**Goal:** Implement authority §3 for survival, including the logical/rendered
terrain distinction and camera accounting.

**Start from:** src/core/world.ts baseCells/compose/glyphAt/field;
src/web/main.ts render, src/web/camera.ts visibleCells/followCamera;
tests/core/first-playable-camera.test.ts and tests/browser/viewport.spec.ts.

**Done when:** Deterministic clusters respect gate/building precedence, faint grass covers blank ground,
terrain colors and 4-cell gutter render in survival, and pixel/text tests verify
numbers, camera alignment, resize and tiny viewports. Direct game.field word/find
examples show grass remains whitespace and landmarks are real glyphs. Legacy
camera/terrain checks still pass. Update coverage; just verify passes.

### 2.2 Replace construction menu with typed construction and naming

**Goal:** Implement authority §4 survival Insert/Name, autocomplete and revised
Enter-only connect and the typed rally command, through pure core transitions
with visible browser prompts.

**Start from:** src/core/world.ts GameMode, build, link, key/dispatch handling;
src/web/main.ts describeSite/render/key capture; tests/core/first-playable-construction.test.ts,
tests/core/first-playable-connections.test.ts and matching browser suites.

**Done when:** Real-key survival tests construct both kinds, complete names,
Tab-complete, connect/reconnect and cancel correctly while time runs. Insert
works on open ground, captures placement center, and revalidates occupied/gate/
boundary/cap errors at commit. `rally` sets the global point with marker and
coordinates; cancel/invalid commands preserve it. Invalid, blocked/IME and
blur/hidden cases follow §4. Names survive
snapshot and observations. Legacy Build/connect+Escape behavior remains checked
under legacy profile. Keep browser default legacy until finder integration.
Update coverage; just verify passes. Do not implement finder or combat here.

### 2.3 Implement building finder and make survival the browser default

**Goal:** Implement authority §5 with deterministic query/selection and shared
cursor movement entry point ready for §7 collision.

**Start from:** src/core/world.ts LeaderMode, key/dispatch/navigation handling,
siteCenter, observe; src/web/main.ts render/apply and src/web/style.css;
tests/browser/test.ts plus existing browser suites.

**Done when:** Space f searches built names/types/IDs plus Rally and Enemy gate destinations;
visible results and real keys cover duplicates, subsequences, ordering, selection,
no-result and
cancellation. Pending source survives a successful jump for typed connection.
Survival is the default player page; existing historical browser suites
explicitly select ?rules=first-playable while new suites exercise default play.
Preserve each old suite's behavioral/pixel assertions and document the routing.
Unblocked finder movement uses one shared survival displacement function for
later collision, with no enemies yet. Update docs/direction.md/README.md to
accurately distinguish implemented features and pending combat. just verify passes.

## Stage 3 — Make the cursor survive

### 3.1 Model living troops, replacement production and simultaneous combat

**Goal:** Implement authority §6 and §7 tick phases needed for combat, using
validated setup for test opponents before automatic waves exist.

**Start from:** src/core/world.ts Imp, Ring, impsOf, economy/advance,
parseScenario/snapshot/observe; src/core/game.ts exported types;
tests/core/first-playable-economy.test.ts and clock tests.

**Done when:** Survival has real troop HP/identity/cooldowns, cursor HP and kill
count; allied imps attack and enemies retaliate deterministically; mutual kills and
one-target selection have independent examples. Living population remains
attributed to origin ring independently of position. Death frees population;
funded production uses first eligible spawn exit with a new serial, blocked
exits spend nothing. Legacy total-created cap/ordered imp observations remain unchanged.
Validated survival scenarios cover arbitrary legal positions, damaged troops,
clock phase, origin-ring counts, invalid/overlapping setup and snapshot reconstruction.
No wave spawning, hostile movement or input collision yet. Update coverage;
just verify passes.

### 3.2 Add enemy waves, chasing, collision, death and restart

**Goal:** Implement authority §7 fixed-gate waves, hostile movement and terminal
behavior using §6 cooldown/contact rules, for all normal/finder movement paths.
Allied movement is a separate unit; keep allies stationary temporarily.

**Start from:** src/core/world.ts advance/dispatch and survival displacement
function, createNavigation in src/core/game-navigation.ts, src/web/main.ts
apply/advanceBy/ElapsedClock integration; src/web/clock.ts.

**Done when:** Waves at exact ticks/cap/fixed-gate perimeter, hostile deterministic BFS,
stable occupancy and cooldown behavior match independent examples. Long word,
axis, line, find and finder moves stop before hostiles, including diagonal
corners; no repeated-input damage exploit. Pause/hidden/typing obey the same
clock. Input/tick death freezes at lethal boundary, clears drafts/source and
remainder, ignores later play, and real Enter restarts without clock catch-up.
Tests cover progress, congestion, elapsed partitioning including death, wave
capacity/occupied gate exits and no post-death time consumption. Finder can
reach gate; cursor location never changes spawn location. Update coverage; just verify passes.

### 3.3 Move allied imps to the shared rally point and intercept enemies

**Goal:** Complete authority §7 allied movement and shared distance fields so
players can send their imps to fight at the enemy gate.

**Start from:** src/core/world.ts survival tick/movement/combat machinery,
validated troop/rally scenarios and observations; src/web/main.ts rally display.

**Done when:** Existing/new allies travel toward latest rally, stop for adjacent
combat, pursue enemies within six path cells and resume rally afterward. Use
at most three shared fields and stable ally-then-enemy occupancy order; no per-
unit path searches. Tests independently check exact one-step choices/ties,
retargeting, arrival, congestion, cursor avoidance, adjacent combat hold,
aggro boundary/return, elapsed partitions and origin-ring living cap after
units depart. A deterministic scenario rallies allies beside gate, reaches it
and fights a spawned wave without moving the cursor there. Occupied gate cells
suppress spawning without hidden backlog. Marker/finder observe current rally.
Update coverage; just verify passes.

## Stage 4 — Finish the playable pass

### 4.1 Render factions, health and survival status; close the design loop

**Goal:** Finish authority §8 with a usable default game and focused end-to-end
coverage, then publish the implemented behavior in long-term game docs.

**Start from:** src/web/main.ts colors/render/HUD, src/web/style.css and page
markup; tests/browser/complete-loop.spec.ts, tests/browser/test.ts;
docs/direction.md, README.md, docs/survival-coverage.md,
docs/workbench/cursor-survival.md.

**Done when:** Allies/enemies use distinct colors plus non-color markers, health
is readable, HUD exposes cursor HP/waves/kills/population, and game-over gives
restart instructions. A deterministic real-key browser flow builds/names both
buildings at freely chosen positions, finds/connects, produces allies, sets
and moves rally toward the gate, fights there, survives an encounter, dies and
restarts in both projects. Pixel assertions check grass, gutter, finder,
rally/gate, moving factions and death; do not rely solely on data attributes. Coverage maps every
authority clause with no pending entries; full just verify and benchpress lint
pass. Update docs/direction.md/README.md/AGENTS.md with actual behavior and stable
survival authority (move this authority to docs/cursor-survival.md and update
execution front matter/context together). Retain frozen first-playable history.
Remove the resolved topic through benchpress rm; leave NEXT order otherwise
alone. Never delete this execution plan or its state file; Ploopy closes it.
