# Survival coverage

Authority: [Cursor survival](../cursor-survival.md). This map covers the
rules-profile boundary, empty survival scenario, dynamic building identity,
placement, the fixed gate, deterministic terrain, the relative row gutter,
typed construction, names, connections, the shared rally command, the building
finder, living troop combat, fixed-gate waves, hostile chasing, cursor collision,
game over, allied rally movement, faction presentation and end-to-end browser
acceptance. Every authority clause is implemented or explicitly preserved.

Status values: **implemented** and **preserved** (historical behavior kept).

## Authority §2 - profiles and scope

| Clause | Exported operations | Independent evidence | Status |
| --- | --- | --- | --- |
| Omitted profile and explicit `first-playable` keep historical behavior; snapshots omit the profile. | `game.initial`, `game.scenario`, `game.snapshot`, `game.observe`, `game.field` | `tests/core/survival-profile.test.ts`; every historical suite | implemented |
| `{ rules: "survival" }` selects an empty survival world with no fixed sites or buildings. | `game.initial`, `game.scenario`, `game.observe`, `game.snapshot`, `game.siteAt`, `game.field` | `tests/core/survival-profile.test.ts` | implemented |
| Survival scenarios validate their profile and reject legacy fixed-site data. | `game.initial`, `game.scenario` | `tests/core/survival-profile.test.ts` | implemented |
| The browser defaults to survival; `?rules=first-playable` selects the historical profile and `?rules=survival` selects survival explicitly. | `?rules=first-playable`, `?rules=survival`, `window.__vimFlowTest.load` | `tests/browser/profile.spec.ts`; historical suites select `?rules=first-playable` | implemented |
| The 40x20 navigation contract and the 18-property / 53-case first-playable corpus stay runnable. | `game.*`, unchanged navigation facade | `spec/first-playable`, `tests/core/first-playable-*`, historical browser suites | preserved |
| Shared navigation, clock and economy algorithms remain shared rather than forked. | `src/core/game-navigation.ts`, `game.advance`, `game.dispatch` | historical suites plus survival profile tests | preserved |
| This coverage map is maintained as sections land. | - | this file | implemented |

## Authority §§3-8 - feature map

| Section | Expected exported operations | Evidence | Status |
| --- | --- | --- | --- |
| §3 terrain, landmarks, grass, gutter and relative row numbers | `game.field`, `game.glyphAt`, `game.dispatch`; web `visibleCells`, `followCamera`, `gutterLabel`, `render` | `tests/core/survival-terrain.test.ts`, `tests/browser/survival-terrain.spec.ts` | implemented |
| §4 dynamic building identity, cursor-centred 11x7 placement, overlap/gate/edge validation, 32-building cap and dynamic links | `game.place`, `game.link`, `game.scenario`, `game.snapshot`, `game.observe`, `game.siteAt` | `tests/core/survival-buildings.test.ts` | implemented |
| §4 typed Insert construction, autocomplete, names, shared rally commands and connect through input | `game.dispatch`, `game.observe`, `game.snapshot`, `game.place` | `tests/core/survival-construction.test.ts`, `tests/browser/survival-construction.spec.ts` | implemented |
| §5 building finder, query order and collision-aware shared displacement entry point | `game.dispatch`, `game.observe`; web render/key handling | `tests/core/survival-finder.test.ts`, `tests/browser/survival-finder.spec.ts` | implemented |
| §6 living troop identity, HP, cooldowns, replacement production and simultaneous combat | `game.advance`, `game.scenario`, `game.snapshot`, `game.observe`, `game.imps`; exported `ALLY_HP`, `ENEMY_HP`, `CURSOR_MAX_HP`, `ATTACK_COOLDOWN` | `tests/core/survival-combat.test.ts`; legacy economy/clock suites | implemented |
| §7 fixed enemy gate art, reserved patch, passable geometry and default shared rally cell | `game.field`, `game.glyphAt`, `game.place`, `game.observe`, `game.scenario`, `game.snapshot` | `tests/core/survival-buildings.test.ts` | implemented |
| §7 fixed-tick wave sizes, enemy cap, gate-perimeter spawns and interior-only deterministic hostile BFS movement | `game.advance`, `game.observe`, `game.scenario`; exported `ENEMY_CAP`, `WAVE_START_TICK`, `WAVE_INTERVAL`, `WAVE_MAX_SIZE` | `tests/core/survival-waves.test.ts` | implemented |
| §7 cursor collision contact, lethal freeze, game over and Enter restart across normal and finder movement | `game.dispatch`, `game.advance`, `game.observe`, `game.snapshot`; web clock reset | `tests/core/survival-waves.test.ts`, `tests/browser/survival-death.spec.ts` | implemented |
| §7 allied rally movement, aggro range and shared distance fields | `game.advance`, `game.observe`, `game.snapshot`; exported `ALLY_AGGRO_RADIUS`; web render/HUD | `tests/core/survival-allies.test.ts`; `tests/browser/survival-construction.spec.ts`, `tests/browser/survival-finder.spec.ts` | implemented |
| §8 cyan ally and orange enemy `i` glyphs, non-color faction markers and injured health bars | web `render`, `drawTroopMarkers`, colors, style and markup | `tests/browser/survival-complete-loop.spec.ts` | implemented |
| §8 gate and rally markers, rally coordinates, `i rally Enter` hint, Finder/Insert/Name text overlays | web `render`, `drawRally`, `drawFinder`, HUD and core terminal notice | `tests/browser/survival-complete-loop.spec.ts`, `tests/browser/survival-construction.spec.ts`, `tests/browser/survival-finder.spec.ts` | implemented |
| §8 cursor HP, nearby troop HP, next-wave countdown, wave, kills and living-population HUD; game-over overlay with restart instructions | web `render`, `drawGameOver`, HUD markup/style; `game.observe`; core `terminal` | `tests/browser/survival-complete-loop.spec.ts`, `tests/browser/survival-death.spec.ts` | implemented |
| §8 deterministic real-key end-to-end flow in development and production browser projects | all exported survival operations and browser event wiring | `tests/browser/survival-complete-loop.spec.ts`; full `just verify` | implemented |
| §8 validated scenarios, observations/snapshots and finite property checks | `game.initial`, `game.scenario`, `game.snapshot`, `game.observe`, `game.advance`, `game.dispatch` | core survival suites `survival-profile`, `survival-buildings`, `survival-construction`, `survival-finder`, `survival-terrain`, `survival-combat`, `survival-waves`, `survival-allies` | implemented |

Clock increment, manual pause and hidden suspension run for both profiles and
are preserved. Survival economy ticks, wave spawning, allied movement, hostile
movement, combat damage and cursor death run in §7 order.

## Preserved historical obligations

All first-playable requirements remain active and mapped in
`spec/first-playable/coverage.json`: W1, W2, N1, N2, V1, V2, B1, B2, I1, I2,
L1, L2, E1, E2, E3, E4, T1 and T2. `just first-playable-complete` still checks
the frozen authority hashes, the 53 corpus cases, the coverage map and the
original navigation contract. Omitted-profile construction and snapshots keep
the historical shapes; only survival snapshots carry `rules`.

## Intentional replacements of old requirements

These are the deliberate survival changes. The empty-site boundary, stable
dynamic building IDs/links, typed construction, names, rally input, the
building finder, troop combat, waves, hostile movement, collision, cursor death,
allied rally movement and faction presentation are implemented.

| Old first-playable behavior | Survival behavior | Owner |
| --- | --- | --- |
| Eight fixed sites always visible | Survival starts with no fixed sites, then freely placed dynamic buildings | 1.1 (empty), 1.2 (placement) |
| Space `f` Build menu | Typed Insert construction with autocomplete, names and a typed rally command | 2.2 (implemented) |
| Fixed `SiteId` links | Dynamic stable building IDs with validated links | 1.2, 2.2 |
| Stationary slot imps | Living allies with stable IDs, HP and replacement production | 3.1 (implemented) |
| Stationary survival allies | Allies march to the latest rally, pursue enemies within six path cells and resume the rally after combat | 3.3 (implemented) |
| Five-imps-per-ring total cap | Five living allies per origin ring; death frees a slot and replacements get fresh serials | 3.1 (implemented) |
| No combat | Adjacent allies and enemies attack simultaneously with HP and cooldowns; enemies also damage the cursor | 3.1 (implemented) |
| Immortal cursor | Cursor HP damaged in combat and on blocked collision; HP zero freezes play until Enter restarts | 3.1 (HP), 3.2 (collision/death) |
| One fixed terrain composition | Deterministic landmarks, grass texture and the fixed enemy gate | 1.2 (gate), 2.1 (terrain) |
| No building finder | Space `f` finder for names, types, IDs, rally and gate | 2.3 (implemented) |

## Survival interface additions

Units 1.2 through 3.3 add these public interfaces without changing the historical ones:

- `game.place(world, center, kind)` places a survival well or ring with an
  `11x7` footprint centred on `(center.x, center.y)`. It returns the input world
  unchanged on any invalid placement and allocates the first free `b001`-style
  ID only on success.
- Survival `game.scenario` and `game.snapshot` building entries use
  `{ id, kind, center, mana?, link?, produced?, name? }`. IDs are
  `b001`..`b032`, footprints must stay inside `x=1..238, y=1..158`, must not
  overlap each other or the gate's `x=198..202, y=134..138` patch, and links
  must target a built ring. Names are at most 20 ASCII letters, digits, spaces,
  underscores or hyphens; blank names become `Well b001`/`Ring b002`. Fixed
  `{ site, ... }` entries remain first-playable only.
- Survival scenarios and snapshots carry `rally`, defaulting to `(13,10)`.
  Observations expose `rally`, each dynamic building's name, ID, kind, centre,
  mana and link/production, plus Insert candidates, the captured insert cell and
  the Name target. In survival, `i` opens Insert on any cell: exact `mana well`,
  `summoning ring`, `connect` and `rally` commands commit only on Enter, Tab
  completes the first matching candidate, and Escape cancels the draft while
  preserving a staged source. A successful build opens Name; Enter trims and
  commits the draft, while Escape/blur/hidden keep the already assigned default.
  Exact `rally` stores the captured cell; an invalid rally leaves the existing
  point unchanged, and a rejected placement leaves buildings and IDs unchanged.
  Survival still has no Build menu; the legacy Build menu and
  connect-then-Escape source staging remain available under the legacy profile.
- `game.siteAt` and `observation.siteAtCursor` return a dynamic ID inside a
  survival footprint. `observation.sites` remains the historical fixed-site
  map.
- Survival `game.field` composes deterministic 3x2 landmark clusters at
  `(8+24c, 8+16r)` for `c,r=0..9`, skipping the gate reservation. The lake and
  tree strip keep precedence, and placed buildings clear terrain only inside
  their own footprint. Blank cells stay literal spaces in the logical field;
  grass dots exist only in the browser presentation.
- Normal Space `f` in survival opens `Finder`: `observation.finder` exposes the
  query, clamped selection and ordered `name | type | ID` entries for built
  buildings plus `Rally | rally | rally` and `Enemy gate | spawn | gate`.
  Queries match ASCII-case-insensitive subsequences, Enter moves to the selected
  destination through the same survival displacement sweep as normal navigation,
  no-result Enter keeps Finder open, and Escape or blur closes it. Escape keeps
  a staged source; blur/hidden clear it. The browser defaults to survival and
  historical suites explicitly select `?rules=first-playable`.
- Survival scenarios and snapshots carry `cursorHp` (`0..10`), `kills` and
  `troops`. An ally entry is
  `{ faction: "ally", ring, serial, x, y, hp?, nextAttackTick? }`; its stable ID
  is `ring#serial`, `serial` must not exceed the ring's total `produced`, and HP
  defaults to 4. An enemy entry is
  `{ faction: "enemy", id, x, y, hp?, nextAttackTick? }` with a 1..32-character
  ASCII ID and HP defaulting to 3. Troop cells must be interior, distinct, and
  never shared with the cursor for enemies; allies may share the cursor cell.
  Observations expose sorted `troops`, `cursorHp`, `kills`, and each survival
  ring's total `produced` plus `living` allies attributed to that origin ring
  wherever they stand.
- Survival economy generates and transfers over dynamic IDs in ascending order.
  A ring with 1000 mana and fewer than five living allies tries its five patch
  row-6 exits left-to-right, summons at the first cell free of troops and cursor,
  spends 1000, increments `produced`, and gives the new ally serial `produced`
  and cooldown `tick+10`. A blocked ring spends nothing. Combat then runs from
  one pre-damage snapshot: each ready troop picks one adjacent opponent with
  lowest HP then lexical ID, enemies prefer adjacent allies over the cursor, and
  all damage applies at once, so mutual kills are possible. Only attackers set
  `nextAttackTick=tick+10`; dead troops are removed and no longer count toward
  the origin ring's living population.
- Survival observations expose `gameOver`, `wave` and `nextWaveTick`. Wave 1
  starts at tick 300 and every 200 ticks thereafter, with size `min(wave + 2,
  16)`; spawns use the fixed gate's 16-cell Chebyshev-distance-2 perimeter in
  row-major order, skip live troops and the cursor, fill the first available
  slots up to the wave size and the 128-enemy cap, and discard the remainder.
  Enemy IDs use the wave and spawn ordinal. Troop destinations and distance
  fields cover only the interior `x=1..238, y=1..158`; an interior source seeds
  distance zero, a boundary cursor seeds its cardinal interior neighbours at
  distance one, and a corner cursor leaves the hostile field unreachable so
  enemies wait there. Navigation still reaches boundary cells. Enemies move on
  every fifth tick over one BFS distance field from the cursor, in lexical ID
  order, choosing the first unoccupied cardinal neighbour with a strictly
  smaller distance in north/east/south/west order; adjacent enemies and enemies
  beside the cursor hold. Earlier moves count as occupancy, so units may follow
  a vacated cell but never overlap, swap, enter the cursor or stand on the
  boundary.
- Every survival cursor displacement, including finder jumps, uses the shared
  sweep. A hostile sample or diagonal side cell stops movement at the last safe
  sample and, if that enemy's cooldown is ready, deals one damage and sets its
  `nextAttackTick` to `elapsedTicks + 10`; later inputs in the same tick only
  block. Cursor HP zero clears choices, drafts and source, drops the clock
  remainder and freezes further input or elapsed time. An unblocked Enter starts
  a fresh survival world.
- On every fifth tick, allies move before enemies over at most three shared BFS
  fields: the rally, the cursor and all enemies. An ally uses the enemy field
  when its nearest enemy is at most `ALLY_AGGRO_RADIUS` path cells away and the
  rally field otherwise. It takes the first unoccupied cardinal neighbour with
  a strictly smaller distance in north/east/south/west order, holds at distance
  zero or beside an opponent, and never enters the cursor cell. Earlier ally
  moves count as occupancy for later allies and for enemies, so a packed group
  waits around the rally instead of routing around it. Newborn allies obey the
  current rally on their first movement phase.
- `src/web/camera.ts` exports `GUTTER_COLUMNS = 4`, `GUTTER_WIDTH = 48`, an
  optional gutter parameter on `visibleCells`, and `gutterLabel`. Survival
  subtracts the gutter before viewport/camera math; the historical
  two-argument call and the first-playable render remain unchanged.

## Test and interface revisions

The boundary-chase fix restricts troop destinations and distance-field traversal
to the interior `x=1..238, y=1..158` while leaving cursor navigation free to
reach the boundary. An interior source seeds distance zero; a boundary cursor
seeds its cardinal interior neighbours at distance one; a corner cursor leaves
the hostile field with no reachable interior cells. No public interface changed.
`tests/core/survival-waves.test.ts` adds the exact top-edge chase at cursor
`(5,0)` with an enemy moving east from `(4,1)` to `(5,1)` and round-tripping,
plus all four edges, all four corners, and partition invariance with occupancy.
`tests/core/survival-allies.test.ts` adds allies advancing to a top-edge rally
while the boundary cursor stays put.

Unit 4.1 adds presentation-only faction colors, faction markers and injured
health bars in `src/web/main.ts`, HUD elements `#hud-hp`, `#hud-wave`,
`#hud-kills` and `#hud-pop`, canvas datasets `allies`/`enemies`, and a game-over
overlay with restart copy. No core rule or public scenario/snapshot field changed.
`tests/browser/survival-complete-loop.spec.ts` builds and names a well and ring
at chosen positions, links them with real keys, sets the rally beside the gate,
advances the manual clock through ally production, movement, a fought wave and
cursor death, asserts grass/gutter/finder/rally/gate/faction/health/death pixels,
then restarts with Enter. It runs in both Playwright projects. The authority
moved to `docs/cursor-survival.md`; historical first-playable suites still select
`?rules=first-playable`.

Unit 3.3 adds `ALLY_AGGRO_RADIUS = 6` and the shared ally movement phase before
hostile movement. `tests/core/survival-allies.test.ts` covers the north-first
tie, arrival and waiting, stable-ID congestion, cursor avoidance, adjacent
combat hold, rally retargeting, newborn rally use, the six-cell aggro boundary
and return to rally, partition invariance, origin-ring living caps after
departure, a real gate rally/fight scenario, occupied gate slots without a
hidden backlog and the finder's current rally destination. Existing wave,
combat and snapshot shapes are unchanged by allied movement.

Unit 3.2 adds `gameOver`, `wave` and `nextWaveTick` observations, the
`ENEMY_CAP`, `WAVE_START_TICK`, `WAVE_INTERVAL` and `WAVE_MAX_SIZE` exports,
and browser `gameOver`/HP/wave datasets. `tests/core/survival-waves.test.ts`
covers exact wave ticks and sizes, the enemy cap, occupied gate exits, hostile
BFS order and congestion, collision across axis/line/find/word/finder paths,
contact cooldowns, input and tick death, pause/hidden wave progress and elapsed
partitioning through death. `tests/browser/survival-death.spec.ts` covers a real
lethal key, game-over HUD status, ignored later keys, real Enter restart and no
clock catch-up, plus a lethal tick that cancels an Insert draft. Existing
scenarios and snapshots are unchanged because game-over and wave progress are
derived from `cursorHp` and `elapsedTicks`.

Unit 3.1 adds `living` to survival ring observations, plus `troops`, `cursorHp`
and `kills` to observations and survival snapshots. Existing survival building
assertions now include `living: 0`; legacy site, snapshot and ordered `imps`
shapes are unchanged. Survival ring `produced` now accepts any nonnegative safe
integer because it counts all serials rather than living cap; legacy rings keep
the five-created cap. `tests/core/survival-combat.test.ts` covers production,
cooldowns, target selection, mutual kills, cursor damage, origin-ring counts,
snapshot round-trip and invalid setup. The browser construction suite now expects
its survival well to have generated `WELL_GENERATION` mana for each tick since
construction; unit 2.2's survival wells previously stayed at zero because the
economy only walked legacy sites.

Unit 2.1 replaces the unit 1.1 assertion that survival `(8,8)` is blank with the
new deterministic landmark `^`. The historical first-playable field, viewport
and camera tests keep their original two-argument `visibleCells` and
no-gutter expectations.

Unit 2.2 adds `name` to survival building observations and snapshots and adds
Insert/Name state observations (`insertCell`, `nameTarget`, `candidates`). The
survival building assertions in `tests/core/survival-buildings.test.ts` now
include the default names; the legacy site observation and snapshot shapes are
unchanged. Unit 2.3 made survival the browser default, so historical suites
select `?rules=first-playable` and keep exercising Build and connect+Escape
without implicit profile switching.

## Historical browser routing

Routing is explicit, not an implicit behavior switch:

- The page defaults to survival. `?rules=first-playable` selects the historical
  profile and `?rules=survival` selects survival explicitly.
- Every historical browser suite navigates with `?rules=first-playable` and keeps
  its existing interactions and assertions; each migration is recorded here.
- Scenario loads through `window.__vimFlowTest.load` carry `rules` when they
  exercise survival.

Survival draws its deterministic terrain clusters, faint grass, the 4-cell
relative-row gutter, the rally flag, gate art, cyan ally and orange enemy glyphs,
non-color faction markers and injured health bars. Browsing supports typed
Insert construction, autocomplete, names, connections, the shared rally command,
the building finder, waves, hostile movement, collision, game over and restart
through real keys. The HUD exposes cursor and nearby HP, wave countdown, kills,
living allies/enemies, rally coordinates and the restart hint; the final
real-key loop is checked in both browser projects.
