# Cursor survival: terrain, typed building and a building finder

Status: TypeScript-only next-pass authority, written 2026-10-27 against `dbb4f78`.
This is a small playable iteration. Numerical values and algorithms below are
planner defaults chosen under the author's request to fill the blanks; they are
not measured balance or additional author quotations.

## 1. Decisions settled with the author (2026-10-27)

D1. Pause the independent Bend/TypeScript comparison. Develop the game in TS;
reconsider a Bend rewrite when rules and code are substantial and stable.
D2. Populate the world visually and add cursor-relative line numbers. Preserve
fluent Vim movement and useful textual anchors.
D3. Type world interactions in Insert: building types and connect. Construction
leaves Space f. Autocomplete building types, then optionally name the building.
D4. Space f becomes a finder for jumping to named buildings.
D5. Hostile imp waves chase and damage the cursor. Cursor and imps have health;
friendly imps fight hostile imps. Distinguish factions by color. Long jumps
cannot bypass hostile imps. Cursor death ends the run.
D6. Keep effort modest. No general engine project, parallel Bend implementation,
formal proof pass, or full RTS systems in this increment.

## 2. Scope and authority boundaries

Keep 240x160 dimensions, eight fixed 11x7 sites and their art/coordinates,
initial cursor, local directed mana economy, 100 ms ticks, free construction,
manual pause, hidden suspension and supported Vim grammar. No free placement,
resource harvesting, building damage, army orders, fog, saving, upgrades or victory.
Friendly guards remain at their five rally cells. Combat does not require an
army-control subsystem. Terrain is traversable scenery for both factions.

This authority supersedes first-playable rules only for the new survival mode:
terrain composition, construction/Insert/finder, named buildings, living troop
state and the five-LIVING-imps cap, collision and death. Legacy 40x20 navigation
and the historical first-playable contract remain runnable. Do not edit frozen
`docs/first-playable.md`, corpus, manifests or expected results to describe new
rules. `docs/plans/FIRST_PLAYABLE.md` is historical implementation guidance.

Add an explicit rules profile behind the existing exported `game` facade:
`game.initial()` and omitted-profile `game.scenario(...)` retain first-playable
behavior; `game.initial({ rules: "survival" })` and validated
`game.scenario({ rules: "survival", ... })` select new behavior. Browser defaults
to survival once its UI is integrated. `?rules=first-playable` selects the old
playable behavior for historical browser checks. New tests exercise survival
through the real exported facade. Shared unchanged algorithms remain shared;
do not fork/copy the whole engine. This compatibility boundary preserves the
measured contract without forcing old UI semantics into new play.

Maintain `docs/survival-coverage.md`: map every section below to exported
operations, independent examples and tests; list intentional replacements of old
requirements separately from preserved ones. New tests must check outcomes and
progress, not merely bounds. Finite tests are not universal proofs.

## 3. Terrain, anchors and row numbers

Survival logical field retains blank grass cells, boundary #, existing lake and
tree strip, site/building art and imp glyphs. Add deterministic small landmarks:
for c=0..9 and r=0..9, origin (8+24c,8+16r), propose a 3x2 cluster with rows
`^^^`, ` ^ ` when (c+r) is even; otherwise `oo `, ` o `. Skip a whole cluster if
it intersects any site patch or extends outside the interior. Existing lake and
tree strip win over new clusters; sites and troops win over terrain. No random
seed or generated-map framework. Clusters give real f/F and word anchors.

Draw every logical blank cell as a faint ASCII `.` grass texture, with a dark
green ground tint. This texture is presentation only, like link lines. Cursor
still displays its underlying logical glyph; HUD legend says grass is whitespace.
Draw trees green, rocks gray, lake blue; art/labels remain brighter. Do not put
fake grass dots in game.field: punctuation carpeting would spoil word travel.

Reserve a fixed 4-cell-wide left gutter outside the world grid. At the cursor's
row show its 1-based absolute world row; elsewhere show abs(row-cursorRow).
Align to visible rows and camera, highlight current row. Gutter is neither text
nor a selectable world column. Subtract its 48 CSS pixels before visibleCells
and camera math; clamp tiny world viewports to one cell. Preserve 12x20 cells and
DPR behavior. No horizontal number gutter or cursor-following floating panel.

Example logical row `   ^^^    a01` appears as faint grass around a green grove
and a bright site ID. Word motion sees precisely the logical row above. At world
row 10, gutter shows 11 on that row, 1 above/below, 2 two rows away. `7j` moves
seven world rows, irrespective of the gutter or camera.

## 4. Typed construction, names and connections

Normal i opens Insert on any site patch, capturing that site; outside sites it
reports an error. Empty site candidates are exactly `mana well` and
`summoning ring`; built-site candidate is exactly `connect`. Draft max 32 ASCII
characters, Backspace and blocked/non-ASCII behavior as before. Case-sensitive
commands; no trimming. Only Enter commits commands. Escape always cancels the
draft, preserves an already staged source and returns Normal. Blur/hidden cancel
all interaction and source. Normal Escape still clears source.

Display candidates whose full command starts with the draft, in the order above.
Tab replaces draft with the first matching command; it never executes. Empty
site Enter with an exact building command constructs immediately and opens Name
for the captured site. Reject occupied/wrong-context/invalid commands without
mutating buildings. No Build menu in survival. Time runs in Insert and Name.

Name draft starts empty. Accept ASCII letters, digits, space, underscore and
hyphen, at most 20 characters. Enter trims leading/trailing spaces; empty uses
`Well a01` or `Ring a02` with actual ID. Escape/blur/hidden use the default name;
they never undo an already constructed building. Names need not be unique;
immutable site ID disambiguates. Display the name in the inspector/finder;
keep fixed map art and site IDs unchanged, so long names cannot spill into sites.
No rename command this pass.

At a well `i`, `connect`, Enter stages/replaces source. At a ring the same
sequence links from staged source and clears it only on success. Direction,
validation, relinking and mana ownership stay unchanged. Source survives finder
navigation and draft cancellation. Connect+Escape no longer stages a well.

Example: at a01 type `imana well`, Enter, `Foo`, Enter. At a02 type
`isummoning ring`, Enter, `Guard`, Enter. At Foo type `iconnect`, Enter; use
finder to Guard and type `iconnect`, Enter. Typed characters inside the buffer
never become movement commands.

## 5. Building finder

Normal Space then f opens Finder with empty query and captured cursor origin;
outside sites it works too. List built buildings only, row text `name | type | ID`.
Query max 32 printable ASCII characters; Backspace edits. Match query as an
ASCII-case-insensitive subsequence of `name type ID` (type is `mana well` or
`summoning ring`). Sort by name case-insensitively, then site ID. No fuzzy score
or external package. Up/Down select with clamping; query edits reset to first.
Enter applies collision-aware movement to selected site's center (relative 5,2),
then Normal. No result: Enter leaves Finder open with a notice. Escape closes
without moving. Opening, typing or highlighting never moves the cursor/camera.
Blur/hidden close and clear source under normal global cancellation. Counts are
discarded on opening. Pending f/F still consumes Space or i as literal targets.
Finder and Name ignore navigation bindings as navigation. Time keeps running.

Example names Foo and Bar match `fo` and `br`; duplicate Foo names remain distinct
by a01/a02. Blocked jump closes Finder at the last safe cursor cell and reports
which hostile blocked it. Finder cannot teleport through enemy lines.

## 6. Troop state, economy and combat

Store living imps explicitly with stable IDs, faction, position, HP and next
attack tick. Preserve ring/slot identity for legacy mode. Survival allied IDs
include ring ID plus monotonically increasing spawn serial; dead IDs never recur.
Allies have 4 HP, enemies 3 HP, cursor 10 HP; all deal 1 damage per attack.
Cursor has no attack. Cardinal adjacency (Manhattan distance 1) is melee range.
Allies occupy fixed rally slots; hostile movement never shares a live troop or
cursor cell. Allies are passable by cursor. Scenery/buildings remain passable.

Change cap to five living allies per ring. On economy phase, if ring has mana
and a vacant rally slot, spend 1000 and summon into lowest available slot unless
it contains an enemy or cursor; otherwise try next vacant slot. No eligible slot
means no spend. New allies start nextAttackTick=spawnTick+10. Preserve generation,
transfer order/caps and one summon/ring/tick. Keep both total-produced and living
counts in observations; production serial is not the cap. Death frees a slot for
a later tick, preserving local mana and making replacement possible.

Enemies spawn with nextAttackTick=spawnTick+10. Every tick after movement, each
ready imp chooses ONE adjacent opposing imp with lowest HP then ID; enemies
choose an adjacent opposing imp before cursor. Ties use stable ID lexical order.
Compute all attacks from one pre-damage snapshot, accumulate damage, apply
simultaneously; mutual kills are possible. Only an actual attack sets that
attacker's nextAttackTick=tick+10. An idle ready imp remains ready. Remove dead
imps after applying all damage. Newborns cannot attack immediately.

Collision contact: attempting a cursor move through/onto a hostile stops before
it; if that enemy is ready it deals 1 immediately and sets nextAttackTick=
currentTick+10. Otherwise only blocks. Multiple contacts within one motion cause
at most this first contact. Repeated inputs at a fixed time cannot bypass the
cooldown. Allied units never attack through input events.

Example: ready allied HP=1 and enemy HP=1 adjacent both die in one combat phase.
Ready enemy blocks cursor HP10 at tick50: HP9, enemy ready again at tick60;
a second blocked input at tick50 deals no damage. Normal tick attacks share
that same enemy cooldown. A dead ally's replacement receives a fresh ID/HP.

## 7. Movement, waves, clock and death

Obtain normal Vim destination with existing pure navigation logic. In survival,
resolve every cursor displacement, including finder, through the same sweep:
let D=max(abs(dx),abs(dy)); for i=1..D, sample each axis as
start+sign(delta)*floor((2*i*abs(delta)+D)/(2*D)). Visit in order; before accepting
a diagonal step also check both orthogonal side cells for enemies, in x-side
then y-side order. First hostile blocks; retain last accepted sample and apply
contact rule. Ignore start cell. Zero distance has no contact. No row-major
wrapping in collision geometry. This is the deliberate survival restriction on
otherwise unchanged Vim target selection. Navigation-only scenarios retain
unrestricted original motion. No path search to make a cursor jump evade enemies.

Tick phases: increment elapsedTicks; economy; wave spawn; hostile movement on
ticks divisible by 5; simultaneous combat; death. Existing exact remainder,
partition behavior, manual pause and hidden suspension apply to all phases.
Hostile speed is one cardinal cell per 500 ms. Compute a BFS distance field from
cursor over interior cells, ignoring troop occupancy for distance calculation.
For each enemy in ID order, choose an unoccupied neighbor of strictly smaller
distance; tie order north, east, south, west. Occupancy uses updated positions of
earlier movers, fixed allies and cursor. If none, wait. No entering cursor cell;
adjacent enemies wait and attack. One shared distance field per movement phase,
not a path search per enemy. Terrain/buildings do not obstruct BFS.

Wave n=1 starts at tick300 (30s), then tick300+200*(n-1); size=min(n+2,16).
Spawn in row-major order on the Chebyshev-distance-12 perimeter around cursor,
clipped to interior; skip occupied cells, site patches and cursor. If insufficient
cells, spawn the available prefix and discard remainder. Enemy cap128; only
spawn remaining capacity. Wave counter still advances. IDs use wave+ordinal.
Enemies do not despawn with camera movement. No randomness, queues or hidden
units. Cap is a performance bound, not a victory condition; repeated waves
replace losses and make survival harder. Wave1=3, wave2=4, wave14+=16.

At cursor HP0 set game-over, cancel all interaction/source and freeze simulation
at the lethal transition. Drop remaining elapsed time/remainder after death.
No further navigation, construction or elapsed mutation. Unblocked Normal Enter
on the game-over screen restarts a fresh survival world; other keys ignored.
Blur/visibility may still update suspension metadata. HUD shows HP, next-wave
countdown/wave, kills, living allies/enemies and pause/game-over; restart hint
appears on death. No regeneration, invulnerability or score beyond survival time,
wave and enemy kills. Restart resets clock anchor in browser, preventing catch-up.

## 8. Presentation and acceptance

Both factions use i glyphs: allies cyan, enemies red/orange, cursor bright gold;
add compact faction legend and selected/nearby HP readout so color is not the
only means of identification. Draw a small distinct faction pip/underline and
injured-unit health bar. Finder is a readable list overlay; Insert candidates
and Name prompt show actual text. Prevent default Tab/arrow/Enter scrolling only
when the focused canvas handles them; preserve browser shortcuts and IME rules.

Exercise exported survival constructors on varied valid layouts/times/HP,
reject invalid troop IDs/overlaps/out-of-bounds/cooldowns and name/profile data.
Expose validated scenario setup and observations/snapshots for all new state;
no private-state fabrication. Property checks: deterministic/partition-invariant
clock until death, unique living positions/IDs, HP/caps, mana accounting, no
cancelled command side effects, valid links, collision equivalence across input
paths, progress for waves/chase/combat/replacements. Death is an explicit terminal
boundary for partition checks, not an excuse to skip them.

Independent examples include command/name cancellation, query duplicate names,
relative gutter resize, unobstructed/blocked gg/word/find/finder paths, diagonal
corner blocking, attack cooldown spam, simultaneous kills, replacement funding,
wave boundary300/500 and capacity, paused menus/hidden time, input death and
elapsed death/restart. Browser tests use real keys/manual clock and inspect
visible text/pixels as well as observations, in both dev and production projects.
Keep all historical checks active through explicit legacy profile routing and
record each test/interface migration in survival-coverage. Run just verify at
each unit; no new proof tooling or arbitrary performance gate.
