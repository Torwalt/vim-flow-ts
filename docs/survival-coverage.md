# Survival coverage

Authority: [Cursor survival](plans/CURSOR_SURVIVAL.md). This map begins with
unit 1.1, which establishes the rules-profile boundary and an empty survival
scenario. Clauses owned by later units are marked pending; they are not claimed
as implemented.

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

## Authority §§3-8 - pending features

| Section | Expected exported operations | Evidence to add | Owner | Status |
| --- | --- | --- | --- | --- |
| §3 terrain, landmarks, grass, gutter and relative row numbers | `game.field`, `game.glyphAt`, `game.dispatch`; web `visibleCells`, `followCamera`, `render` | core terrain/camera tests and browser pixel/text tests | 2.1 | pending |
| §4 typed Insert construction, autocomplete, names, shared rally command and dynamic links | `game.dispatch`, `game.build`, `game.link`, `game.observe`, `game.snapshot` | construction/connection core and real-key browser suites | 1.2 (identity/placement), 2.2 (input/name/connect/rally) | pending |
| §5 building finder, query order and collision-aware shared displacement entry point | `game.dispatch`, `game.observe`; web render/key handling | finder core and browser suites; `?rules=first-playable` retained for historical suites | 2.3 | pending |
| §6 living troop identity, HP, cooldowns, replacement production and simultaneous combat | `game.advance`, `game.scenario`, `game.snapshot`, `game.observe`, `game.imps` | economy/combat tests with validated survival scenarios | 3.1 | pending |
| §7 waves, fixed gate, chase/collision, allied rally movement, clock phases and death/restart | `game.dispatch`, `game.advance`, `game.snapshot`, `game.observe`; `game-navigation`; web clock | movement/wave/death core, partition and browser tests | 3.2 (waves/collision/death), 3.3 (allied movement) | pending |
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

These are the deliberate survival changes. Only the initial empty-site boundary
is implemented now; the rest stay pending until their units.

| Old first-playable behavior | Survival behavior | Owner |
| --- | --- | --- |
| Eight fixed sites always visible | Survival starts with no fixed sites, then freely placed dynamic buildings | 1.1 (empty), 1.2 (placement) |
| Space `f` Build menu | Typed Insert construction with autocomplete and optional names | 2.2 |
| Fixed `SiteId` links | Dynamic stable building IDs with validated links | 1.2, 2.2 |
| Stationary slot imps | Living allies with IDs, HP, a shared rally and waves | 3.1, 3.3 |
| Immortal cursor | Mortal cursor, collision and game-over/restart | 3.1, 3.2 |
| One fixed terrain composition | Deterministic landmarks, grass texture and the fixed enemy gate | 1.2 (gate), 2.1 (terrain) |
| No building finder | Space `f` finder for names, types, IDs, rally and gate | 2.3 |

## Historical browser routing

The intended routing is explicit, not an implicit behavior switch:

- **Now (unit 1.1):** the page still defaults to the first-playable profile.
  `?rules=first-playable` selects that same historical behavior explicitly, and
  `?rules=survival` selects the empty survival world. Scenario loads through
  `window.__vimFlowTest.load` carry `rules` when they exercise survival.
- **From unit 2.3:** default play becomes survival. Every historical browser
  suite must then navigate with `?rules=first-playable` and keep its existing
  interactions and assertions. Each such migration is recorded here when it
  lands.

No terrain, construction-input, finder or combat behavior from §§3-7 is claimed
by this unit.
