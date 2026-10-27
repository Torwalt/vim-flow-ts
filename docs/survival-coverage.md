# Survival coverage

Authority: [Cursor survival](plans/CURSOR_SURVIVAL.md). This map covers the
rules-profile boundary, empty survival scenario, dynamic building identity,
placement, the fixed gate, deterministic terrain, the relative row gutter,
typed construction, names, connections and the shared rally command. Clauses
owned by later units are marked pending; they are not claimed as implemented.

Status values: **implemented**, **preserved** (historical behavior kept), and
**pending** (named execution unit owns it).

## Authority §2 - profiles and scope

| Clause | Exported operations | Independent evidence | Status |
| --- | --- | --- | --- |
| Omitted profile and explicit `first-playable` keep historical behavior; snapshots omit the profile. | `game.initial`, `game.scenario`, `game.snapshot`, `game.observe`, `game.field` | `tests/core/survival-profile.test.ts`; every historical suite | implemented |
| `{ rules: "survival" }` selects an empty survival world with no fixed sites or buildings. | `game.initial`, `game.scenario`, `game.observe`, `game.snapshot`, `game.siteAt`, `game.field` | `tests/core/survival-profile.test.ts` | implemented |
| Survival scenarios validate their profile and reject legacy fixed-site data. | `game.initial`, `game.scenario` | `tests/core/survival-profile.test.ts` | implemented |
| Browser can select the historical profile; default play is unchanged in this unit. | `?rules=first-playable`, `?rules=survival`, `window.__vimFlowTest.load` | `tests/browser/profile.spec.ts` | implemented routing; default switch pending 2.3 |
| The 40x20 navigation contract and the 18-property / 53-case first-playable corpus stay runnable. | `game.*`, unchanged navigation facade | `spec/first-playable`, `tests/core/first-playable-*`, historical browser suites | preserved |
| Shared navigation, clock and economy algorithms remain shared rather than forked. | `src/core/game-navigation.ts`, `game.advance`, `game.dispatch` | historical suites plus survival profile tests | preserved |
| This coverage map is maintained as sections land. | - | this file | implemented |

## Authority §§3-8 - feature map

| Section | Expected exported operations | Evidence | Owner | Status |
| --- | --- | --- | --- | --- |
| §3 terrain, landmarks, grass, gutter and relative row numbers | `game.field`, `game.glyphAt`, `game.dispatch`; web `visibleCells`, `followCamera`, `gutterLabel`, `render` | `tests/core/survival-terrain.test.ts`, `tests/browser/survival-terrain.spec.ts` | implemented |
| §4 dynamic building identity, cursor-centred 11x7 placement, overlap/gate/edge validation, 32-building cap and dynamic links | `game.place`, `game.link`, `game.scenario`, `game.snapshot`, `game.observe`, `game.siteAt` | `tests/core/survival-buildings.test.ts` | implemented |
| §4 typed Insert construction, autocomplete, names, shared rally commands and connect through input | `game.dispatch`, `game.observe`, `game.snapshot`, `game.place` | `tests/core/survival-construction.test.ts`, `tests/browser/survival-construction.spec.ts` | implemented |
| §5 building finder, query order and collision-aware shared displacement entry point | `game.dispatch`, `game.observe`; web render/key handling | finder core and browser suites; `?rules=first-playable` retained for historical suites | 2.3 | pending |
| §6 living troop identity, HP, cooldowns, replacement production and simultaneous combat | `game.advance`, `game.scenario`, `game.snapshot`, `game.observe`, `game.imps` | economy/combat tests with validated survival scenarios | 3.1 | pending |
| §7 fixed enemy gate art, reserved patch, passable geometry and default shared rally cell | `game.field`, `game.glyphAt`, `game.place`, `game.observe`, `game.scenario`, `game.snapshot` | `tests/core/survival-buildings.test.ts` | implemented (movement later) |
| §7 waves, chase/collision, allied rally movement, clock phases and death/restart | `game.dispatch`, `game.advance`, `game.snapshot`, `game.observe`; `game-navigation`; web clock | movement/wave/death core, partition and browser tests | 3.2 (waves/collision/death), 3.3 (allied movement) | pending |
| §8 faction presentation, health/HUD, restart copy and end-to-end acceptance | web `render`, style and page markup; all exported survival operations | pixel/text browser suites, complete survival loop, final coverage audit | 3.2, 4.1 | pending |

Clock increment, manual pause and hidden suspension already run for both profiles
and are preserved; the survival death boundary and wave scheduling are pending
with §7.

## Preserved historical obligations

All first-playable requirements remain active and mapped in
`spec/first-playable/coverage.json`: W1, W2, N1, N2, V1, V2, B1, B2, I1, I2,
L1, L2, E1, E2, E3, E4, T1 and T2. `just first-playable-complete` still checks
the frozen authority hashes, the 53 corpus cases, the coverage map and the
original navigation contract. Omitted-profile construction and snapshots keep
the historical shapes; only survival snapshots carry `rules`.

## Intentional replacements of old requirements

These are the deliberate survival changes. The empty-site boundary, stable
dynamic building IDs/links, typed construction, names and rally input are
implemented; troop, finder and combat changes stay pending until their units.

| Old first-playable behavior | Survival behavior | Owner |
| --- | --- | --- |
| Eight fixed sites always visible | Survival starts with no fixed sites, then freely placed dynamic buildings | 1.1 (empty), 1.2 (placement) |
| Space `f` Build menu | Typed Insert construction with autocomplete, names and a typed rally command | 2.2 (implemented) |
| Fixed `SiteId` links | Dynamic stable building IDs with validated links | 1.2, 2.2 |
| Stationary slot imps | Living allies with IDs, HP, a shared rally and waves | 3.1, 3.3 |
| Immortal cursor | Mortal cursor, collision and game-over/restart | 3.1, 3.2 |
| One fixed terrain composition | Deterministic landmarks, grass texture and the fixed enemy gate | 1.2 (gate), 2.1 (terrain) |
| No building finder | Space `f` finder for names, types, IDs, rally and gate | 2.3 |

## Survival interface additions

Units 1.2, 2.1 and 2.2 add these public interfaces without changing the historical ones:

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
- `src/web/camera.ts` exports `GUTTER_COLUMNS = 4`, `GUTTER_WIDTH = 48`, an
  optional gutter parameter on `visibleCells`, and `gutterLabel`. Survival
  subtracts the gutter before viewport/camera math; the historical
  two-argument call and the first-playable render remain unchanged.

## Test and interface revisions

Unit 2.1 replaces the unit 1.1 assertion that survival `(8,8)` is blank with the
new deterministic landmark `^`. The historical first-playable field, viewport
and camera tests keep their original two-argument `visibleCells` and
no-gutter expectations.

Unit 2.2 adds `name` to survival building observations and snapshots and adds
Insert/Name state observations (`insertCell`, `nameTarget`, `candidates`). The
survival building assertions in `tests/core/survival-buildings.test.ts` now
include the default names; the legacy site observation and snapshot shapes are
unchanged. The browser default is still first-playable, so the historical
construction and connection suites continue to exercise Build and
connect+Escape without a profile query.

## Historical browser routing

The intended routing is explicit, not an implicit behavior switch:

- **Now (units 1.1-2.2):** the page still defaults to the first-playable
  profile. `?rules=first-playable` selects that same historical behavior
  explicitly, and `?rules=survival` selects survival with its gate, deterministic
  terrain, gutter and any scenario-placed dynamic buildings. Scenario loads through
  `window.__vimFlowTest.load` carry `rules` when they exercise survival.
- **From unit 2.3:** default play becomes survival. Every historical browser
  suite must then navigate with `?rules=first-playable` and keep its existing
  interactions and assertions. Each such migration is recorded here when it
  lands.

Survival now draws its deterministic terrain clusters, faint grass, the 4-cell
relative-row gutter and a rally flag with HUD coordinates. Opt-in survival
browsing supports typed Insert construction, autocomplete, names, connections
and the shared rally command through real keys. Finder and combat behavior from
§§5-7 remain unclaimed, and the browser still defaults to first-playable until
unit 2.3.
