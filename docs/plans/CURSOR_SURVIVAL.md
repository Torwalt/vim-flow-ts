# Cursor survival: terrain, typed building and a building finder

Status: TypeScript-only next-pass authority, written 2026-10-27 against `fc960b9` (extended before execution).
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
D7. Buildings may be placed anywhere on the map instead of at fixed sites.
D8. Set a central rally point; friendly imps travel there and fight enemies.
D9. Enemy waves originate at a fixed spawn point. Rallying near it lets the
player fight enemies at their source.

## 2. Scope and authority boundaries

Keep 240x160 dimensions, 11x7 building art/footprints, initial cursor, local
directed mana economy, 100 ms ticks, free construction, manual pause, hidden
suspension and supported Vim grammar. Survival starts with no fixed sites or
buildings; the old eight sites exist only in legacy mode. Add dynamic building
placement, one shared rally destination and moving allied imps. No resource
harvesting, building damage, individual army selection/orders, fog, saving,
upgrades or victory. Terrain and buildings remain traversable by both factions.
The enemy gate is indestructible this pass; camping it is a combat tactic, not
a separate win condition. Maximum 32 buildings bounds army size and simulation
work; this is a planner-selected prototype limit, shown on failed construction.

This authority supersedes first-playable rules only for the new survival mode:
terrain composition, free building placement/identity, construction/Insert/finder,
named buildings, shared rally/allied movement, fixed enemy gate, living troop
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
tree strip, dynamically placed building art, gate art and imp glyphs. Add deterministic small landmarks:
for c=0..9 and r=0..9, origin (8+24c,8+16r), propose a 3x2 cluster with rows
`^^^`, ` ^ ` when (c+r) is even; otherwise `oo `, ` o `. Skip a whole cluster if
it intersects the enemy gate's reserved patch or extends outside the interior.
Existing lake and tree strip win over new clusters; placed buildings and troops
win over terrain. Building placement clears underlying scenery within its patch
in the composed field without modifying terrain outside it. No random
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
and a bright building ID (after construction). Word motion sees precisely the logical row above. At world
row 10, gutter shows 11 on that row, 1 above/below, 2 two rows away. `7j` moves
seven world rows, irrespective of the gutter or camera.

## 4. Typed construction, names and connections

Normal i opens Insert anywhere, capturing the cursor cell and any building
whose footprint contains it. On open ground candidates are `mana well`,
`summoning ring`, `rally`, in that order; on a built footprint they are `connect`,
`rally`. Draft max 32 ASCII characters; Backspace and blocked/non-ASCII behavior
as before. Case-sensitive commands; no trimming. Only Enter commits. Escape
cancels draft, preserves staged source and returns Normal. Blur/hidden cancel
all interaction/source. Normal Escape still clears source.

Display candidates whose full command starts with draft. Tab replaces draft
with first match and never executes. An exact building command centers its
11x7 patch at the captured cursor (relative center 5,2, top-left x-5,y-2).
Require every patch cell inside x=1..238,y=1..158, no overlap with an existing
building or gate's reserved 5x5 patch, and no live imp anywhere in the patch.
Scenery is cleared, not an obstacle. Reject invalid placement atomically with a
specific notice; no building, name prompt or ID allocation on failure. Reject
construction within an existing footprint; cap 32 also rejects. The captured
position is validated again at Enter because enemies keep moving while typing.
A legal build constructs immediately and opens Name. Cursor stays at its center.
Allocate stable survival IDs b001, b002, ... by successful construction order;
IDs never change with names. Dynamic IDs, positions and links belong to validated
survival scenario/snapshot APIs; do not widen the old fixed-SiteId domain without
preserving legacy validation. No Build menu in survival. Time runs in all menus.

Exact `rally` sets/replaces the shared rally cell at the captured cursor and
returns Normal without a Name prompt. Require an interior cell outside the
gate's reserved patch with no enemy at commit; friendly overlap is allowed.
Invalid rally changes nothing. Works on a building footprint, with no change to
the building or pending source. Rally defaults to initial cursor (13,10) until
changed. Existing and future allies obey the latest rally. No per-ring orders.

Name draft starts empty. Accept ASCII letters, digits, space, underscore and
hyphen, at most 20 characters. Enter trims leading/trailing spaces; empty uses
`Well b001` or `Ring b002` with actual ID. Escape/blur/hidden use the default name;
they never undo an already constructed building. Names need not be unique;
immutable building ID disambiguates. Display the name in the inspector/finder;
keep building art and IDs inside their footprints, so long names cannot spill.
No rename command this pass.

At a well `i`, `connect`, Enter stages/replaces source. At a ring the same
sequence links from staged source and clears it only on success. Direction,
validation, relinking and mana ownership stay unchanged. Source survives finder
navigation and draft cancellation. Connect+Escape no longer stages a well.

Example: at (13,10) type `imana well`, Enter, `Foo`, Enter. At (37,10) type
`isummoning ring`, Enter, `Guard`, Enter. At Foo type `iconnect`, Enter; use
finder to Guard and type `iconnect`, Enter. Typed characters inside the buffer
never become movement commands.

## 5. Building finder

Normal Space then f opens Finder with empty query and captured cursor origin;
it works on any cell. List built buildings plus two special destinations:
`Rally | rally | rally` and `Enemy gate | spawn | gate`. Building rows are
`name | type | ID`. Special destinations make the rally and enemy source easy
to find across the large map.
Query max 32 printable ASCII characters; Backspace edits. Match query as an
ASCII-case-insensitive subsequence of `name type ID` (building types are
`mana well` and `summoning ring`; special types are as listed above). Sort by
name case-insensitively, then destination ID. No fuzzy score or external package. Up/Down select with clamping; query edits reset to first.
Enter applies collision-aware movement to selected building's center (relative
5,2), rally cell or gate center, then Normal. No result: Enter leaves Finder open with a notice. Escape closes
without moving. Opening, typing or highlighting never moves the cursor/camera.
Blur/hidden close and clear source under normal global cancellation. Counts are
discarded on opening. Pending f/F still consumes Space or i as literal targets.
Finder and Name ignore navigation bindings as navigation. Time keeps running.

Example names Foo and Bar match `fo` and `br`; duplicate Foo names remain distinct
by b001/b002. Blocked jump closes Finder at the last safe cursor cell and reports
which hostile blocked it. Finder cannot teleport through enemy lines.

## 6. Troop state, economy and combat

Store living imps explicitly with stable IDs, faction, position, HP and next
attack tick. Preserve ring/slot identity for legacy mode. Survival allied IDs
include ring ID plus monotonically increasing spawn serial; dead IDs never recur.
Allies have 4 HP, enemies 3 HP, cursor 10 HP; all deal 1 damage per attack.
Cursor has no attack. Cardinal adjacency (Manhattan distance 1) is melee range.
Both factions move; no live imps share a cell. Troops cannot move into the
cursor cell; cursor may pass through/end on an ally. Validated scenarios allow
that cursor/ally overlap but reject cursor/enemy overlap. Scenery/buildings
remain passable. A ring's five relative cells on patch row6 are spawn exits,
not permanently assigned rally positions.

Change cap to five living allies per ring, counted by origin ring even after
they leave it. On economy phase, if ring has mana and fewer than five living
allies, try its five spawn exits left-to-right; choose first with no live imp or
cursor. Spend 1000 and summon there, else spend nothing. New allies start
nextAttackTick=spawnTick+10. Preserve generation, transfer order/caps and one
summon/ring/tick. Keep total-produced and living counts in observations;
production serial is not the cap. Departing an exit never frees population;
death does. Replacement has a fresh identity and obeys current global rally.

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

Tick phases: increment elapsedTicks; economy; wave spawn; allied then hostile
movement on ticks divisible by 5; simultaneous combat; death. Existing exact
remainder, partition behavior, manual pause and hidden suspension apply to all
phases. Both factions move one cardinal cell per 500 ms. On a movement phase,
newly spawned units may move; attack still obeys spawn cooldown. An imp adjacent
to an opponent holds position for combat; an enemy adjacent to cursor also
holds. Allies do not target the cursor.

Compute shared BFS fields over interior cells, ignoring occupancy for distances:
one from rally, one from cursor, and a multi-source field seeded by all enemies.
For each ally in stable ID order, use enemy-distance field if its current distance
is <=6, otherwise rally-distance field. Choose an unoccupied cardinal neighbor of
strictly smaller distance; tie order north,east,south,west. At rally distance0
wait. At a blocked approach wait; no per-unit path search, formation allocation
or route around crowd this pass. A packed group settles around rally; moving
rally directs survivors onward. Allies pursue enemies within six path cells,
then resume rally when none remains in range.

Then for each enemy in ID order use cursor-distance field and same descending
neighbor/tie rule. Occupancy includes all live troops with earlier moves applied
and cursor; do not swap, overlap or enter cursor. Terrain, buildings and gate do
not obstruct distances/movement. Enemy targeting remains cursor chase with
adjacent allied combat priority (§6); no additional pursuit AI. At most three
shared distance fields per movement phase, not one BFS per troop. Distances and
tie rules, not private storage, define behavior. No separation/diagonal movement.

One visible fixed enemy gate is centered at (200,136); reserve x=198..202,
y=134..138 from building placement. Draw 3x3 logical glyph art centered there:
`/O\`, `|O|`, `\O/` (ASCII backslashes). Gate is a permanent map anchor,
passable by troops/cursor, and has no HP or attacks. Rally may be set next to the
reserved patch; allied troops may enter and camp it. Finder can target gate.

Wave n=1 starts at tick300 (30s), then tick300+200*(n-1); size=min(n+2,16).
Candidate spawn cells are the fixed Chebyshev-distance 2 perimeter around gate
center: 16 cells, row-major order. Skip cells occupied by any live troop or cursor.
Spawn available prefix up to wave size and enemy cap128; discard unspawned
remainder. No relocated spawn, deferred queue, hidden units or randomness.
Wave counter still advances even when camped/at cap; gate never follows cursor.
IDs use wave+ordinal. Enemies persist offscreen. Wave1=3, wave2=4, wave14+=16.
Friendly imps can fight at the perimeter and suppress occupied spawn cells; this
is intentional. Distant enemies take time to reach the cursor, so rallying toward
the gate offers an offensive choice rather than waiting for an attack.

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
injured-unit health bar. Show gate and shared rally marker, plus rally coordinates in HUD. Rally is a
flag overlay (not a logical glyph), visible even on a building; gate has real
text art. Include a compact `i rally Enter` hint. Finder is a readable list overlay; Insert candidates
and Name prompt show actual text. Prevent default Tab/arrow/Enter scrolling only
when the focused canvas handles them; preserve browser shortcuts and IME rules.

Exercise exported survival constructors on varied valid layouts/times/HP,
reject invalid troop IDs/overlaps/out-of-bounds/cooldowns and name/profile data.
Expose validated scenario setup and observations/snapshots for all new state;
no private-state fabrication. Property checks: deterministic/partition-invariant
clock until death, unique living positions/IDs, HP/caps, mana accounting, no
cancelled command side effects, valid links, collision equivalence across input
paths, progress for waves/chase/rally/combat/replacements. Death is an explicit terminal
boundary for partition checks, not an excuse to skip them.

Independent examples include command/name cancellation, query duplicate names,
relative gutter resize, unobstructed/blocked gg/word/find/finder paths, diagonal
corner blocking, attack cooldown spam, simultaneous kills, replacement funding,
placement edge/overlap/scenery clearing/ID allocation, dynamic-link validation,
rally retargeting/newborns/arrival/aggro return, ring cap after departure, fixed
gate boundary300/500/capacity/occupied exits, paused menus/hidden time, input death and
elapsed death/restart. Browser tests use real keys/manual clock and inspect
visible text/pixels as well as observations, in both dev and production projects.
Keep all historical checks active through explicit legacy profile routing and
record each test/interface migration in survival-coverage. Run just verify at
each unit; no new proof tooling or arbitrary performance gate.
