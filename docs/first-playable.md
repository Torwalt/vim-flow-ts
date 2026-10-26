# First playable: a Vim-driven RTS economy

Shared behavior authority, 2026-10-26. Frozen before either implementation.
Both repositories carry identical copies. `docs/plans/FIRST_PLAYABLE.md` adds
language-specific execution rules; it cannot weaken this behavior.

## 1. Decisions settled with the author (2026-10-26)

D1. Top-down 2D RTS, Warcraft II/Dune inspiration. Cursor-only player, no avatar.
D2. Full-window viewport into a larger real text grid, with named building sites.
Character/word motions retain their Vim meanings. ASCII terrain/buildings/troops.
D3. Construct mana-wells and summoning-rings through `<leader>f`.
D4. Mana is local to buildings and flows through connections. Rings continuously
summon funded imps. Every imp has its own visible world position and stands still.
D5. Each ring creates at most five imps; reconnecting does not reset its count.
D6. At a well: insert, `connect`, Escape; navigate to a ring, insert, `connect`,
Enter to link. Show the connection.
D7. Construction is free and immediate. Time continues while typing/using menus.
D8. Executors author laws within feature units, against requirements/examples
settled here. Prepare both plans before either run; the author starts the runs.

The rest of this document pins planner-selected defaults within that scope.
Rates, layout, keys and cancellation details below are engineering choices,
not additional quotations from the author. They are fixed for this measured pass.

## 2. Scope, dimensions and starting map

Economy sandbox only: no opponents, combat, unit orders, pathfinding, death,
building deletion, disconnect command, victory, persistence or offline progress.
Reload starts a fresh empty world. No construction price or global wallet.

World: 240 columns x 160 rows, coordinates x=0..239, y=0..159. World positions
never reflow with viewport size. Cursor starts at (13,10), Normal count zero.
All cells, including terrain and outer borders, are navigable by the god hand.

Base glyphs: spaces, with `#` on the outermost rows/columns. Lake `~` fills
x=8..31 on rows 60 and 61; trees `^` fill x=80..91 on row 100. No random generation.
Eight sites have these top-left coordinates; each reserves an 11x7-cell patch:

| ID | x | y |
| --- | ---: | ---: |
| a01 | 8 | 8 |
| a02 | 32 | 8 |
| a03 | 56 | 8 |
| a04 | 80 | 8 |
| b01 | 8 | 32 |
| b02 | 32 | 32 |
| z01 | 200 | 136 |
| z02 | 224 | 152 |

Each patch is blanked before its art is drawn. ID begins at relative (0,0).
Empty site: `+` at (5,2). Well art begins at (3,1), three rows `.---.`, `| ~ |`,
`'---'`; label `WELL` at (3,4). Ring art begins at (3,1), three rows `/---\`,
`| o |`, `\---/`; label `RING` at (3,4). All unspecified patch cells are spaces.
The five ordered rally cells are (1,6), (3,6), (5,6), (7,6), (9,6) relative to
the patch. Imp n occupies slot n (1-based), drawn as `i`. Site patches and rally
cells never overlap. A cursor anywhere in a patch targets that site, including
its rally cells; outside all patches there is no target.

Sites and imps have stable identities. A building uses its site's ID. An imp's
identity is (ring ID, slot 1..5). No aggregated or invisible overflow units.
Rendering a building never changes unrelated world coordinates.

## 3. Navigation and visible text

Retain all original command semantics: counted h/j/k/l, w/b/e and W/B/E,
0/^/$, gg/G, f/F, four navigation grammar states, count saturation 9999, blocked
modifiers, unsupported input and Escape. Apply the original character classes,
row splits, edge fallbacks, count/default and strict row-local find rules to the
240x160 world. Only dimensions change; there is no line wrapping or per-screen
reinterpretation. Existing 40x20 public navigation APIs/contracts stay checked
as a compatibility fixture; a new game facade may use generalized machinery.

The navigable field equals the composed ASCII glyph grid (base, sites/buildings,
imps). Read current glyphs at the instant a motion is applied. World updates may
change glyphs without moving the cursor. Connections, highlights and HUD are
non-text overlays and never affect word/find results. No search, marks or H/M/L.

New game bindings apply only when the navigation parser is Normal: Space starts
Leader, `i` enters a building command buffer, `p` toggles manual pause. They
clear any count. A pending find consumes Space/i/p as literal printable targets;
Go consumes its next printable key under the old cancellation rule. Counts on
new bindings are discarded rather than multiplied. Unrecognized Leader input
is consumed and returns to Normal. Blocked inputs/Other do not change any mode.

## 4. Viewport, camera and rendering

Fill the available window, without document scrolling or the old fixed-width
landing-page layout. A 32 CSS-pixel HUD leaves the remaining area for canvas;
very small windows must still render a usable clipped area. Use 12x20 CSS-pixel
cells, a readable monospace font and device-pixel-ratio backing dimensions.
Only whole visible cells count for camera calculations; spare pixels can be
background. Visible columns/rows are max(1,floor(canvas CSS extent/cell extent)).
Visible extent may exceed world extent; camera then stays at zero on that axis.

Camera origin is integer cells. For each axis with visible extent v, margin
m=floor(v/5). If cursor c < origin+m set origin=c-m; if
c >= origin+v-m set origin=c-(v-m-1). Clamp to 0..max(0,worldExtent-v).
Apply after cursor movement and resize; initialize from origin zero with the
same rule. Long motions pan directly; viewport geometry never changes core
world state. A viewport larger than the world shows its boundaries/background.

Draw distinct building silhouettes, bright cursor and `i` glyphs. Show selected
site ID/type, mana, outgoing/incoming IDs, ring produced count / 5, current mode,
command draft, pending source, pause status and simulation time in the HUD or
context inspector. Data attributes may aid tests, but actual pixels/glyphs must
also be checked. Do not place code/proof/experiment details in player UI.

Draw a directed line from each well's relative (5,2) to its ring's (5,2), behind
glyphs, with a visible arrowhead. Lines may cross; crossing creates no junction.
Clip to viewport; selected site's incident links are highlighted. Staged source
has a visible highlight and preview line towards the cursor; HUD names source.
Mouse may focus canvas, but cannot move/select/build/order game entities.

## 5. Construction, typing and cancellation

Space then `f` opens Build at the targeted site; outside sites report an error
and return Normal. Default selection well; `w`/`r` select well/ring, Enter builds
at the captured site if empty, Escape closes. Opening/selecting never constructs.
An occupied site rejects confirmation without changing buildings/mana/imps.
Build always returns Normal after Enter, whether success or rejection. Other
unblocked keys in Build are consumed and ignored. Cursor cannot move in Build.
A pending source survives opening/closing/building through this menu.

Normal `i` at a built site enters Insert with that site captured and empty draft;
on empty/non-site cells report an error, remain Normal. Accept printable ASCII,
Backspace deletes the last character, empty Backspace is harmless. Maximum draft
32 characters; extra characters are ignored. No general terrain/text editing.
Commands match exactly `connect` (case-sensitive, no whitespace trimming).

At a well, exact `connect` followed by Escape OR Enter stages/replaces that well
as pending source, then Normal. At a ring, exact `connect` followed by Enter
commits its pending source's link if present; clears pending source on success.
Without a source it reports an error and changes no links. Ring Insert Escape
abandons the draft, returns Normal and preserves the source. Empty/invalid well
Insert Escape abandons the draft and preserves the previous source. Invalid
Enter commands exit Insert with an error and preserve any pending source.
All exits clear the draft. Staging never transfers mana by itself.

Normal Escape clears count and pending source. In FindRight/FindLeft/Go, Escape
clears only the navigation prefix/count and returns Normal, preserving the staged
source; a second Escape in Normal cancels that source. Leader Escape
returns Normal, preserving pending source; Build Escape likewise closes only
the menu. Blur cancels ALL prefixes, menu, insert draft and pending source,
without applying any typed command; it never spends mana or changes links.
Visibility hidden also performs this cancellation and suspends time (§7).

Modified Ctrl/Alt/Meta keys are blocked before game interpretation, including
Escape/Enter/Backspace; they do not cancel drafts or invoke actions. Other
nonprintable keys are ignored. Preserve key case. Ignore composing keydowns;
on composition end dispatch one logical character only if exactly one codepoint
(otherwise Other); non-ASCII input is ignored. Avoid duplicate composition input.
Only focused canvas captures game keys; keep ordinary browser shortcuts usable.

## 6. Directed connections and invariants

Each well has zero or one outgoing ring ID. Rings may have several incoming
wells. Only existing well -> existing ring is legal. No distance, obstruction,
price, cable routing or junction rule. Relinking replaces the outgoing ID in one
transition; repeating the same link is a no-op. Invalid targets never mutate links.
Stored mana stays in its owning building on reconnect; ring population stays put.

Required invariants over every valid reachable state: fixed in-bounds coordinates;
unique non-overlapping sites and imp slots; immutable site IDs/base geometry;
building occupancy changes only empty -> well/ring; links have valid endpoints;
well/ring mana within caps; each ring count <=5; imp list exactly matches its
created count/ordered slots; canceled/invalid operations do not construct/link;
input and simulation preserve validity. Cursor motion never changes buildings,
links, mana or imp identities. Simulation never changes cursor or command draft.

## 7. Exact economy and clock

Represent amounts in exact integer quanta, 100 quanta = 1 mana. Initial mana is
zero. Tick = 100 ms. Each well generates 20 quanta/tick (2 mana/second), cap 2000.
Each ring stores at most 1000; summoning costs exactly 1000 (10 mana). Count cap
is five created imps per ring. There is no extra training timer.

For each tick, in this order:
1. Add 20 to each well, saturating at 2000. Overflow is discarded explicitly.
2. Visit wells in ascending site-ID order. If connected, transfer
   min(wellMana,1000-ringMana) from that well into its ring. Unconnected wells
   keep their mana. No mana teleports via a global wallet or changes direction.
3. Visit rings in site-ID order. If count <5 and mana >=1000, subtract exactly
   1000 and create the next imp in its fixed slot. At most one spawn/ring/tick
   follows from buffer capacity. At count 5, spend nothing and spawn nothing.

A capped ring may fill its buffer; then mana backs up into wells until their
caps. Reconnection cannot reset count. No losses except capped generation or
summoning cost; transfers conserve total stored mana. Never consume mana on
failed construction, staging, cancellation, invalid commands or capped spawning.

Core accepts nonnegative integer elapsed milliseconds, carries a remainder
0..99, and applies floor((remainder+elapsed)/100) ticks with exact arithmetic.
Zero elapsed is identity. Equal total elapsed partitioned differently yields
the same state in the absence of intervening inputs. Track elapsed simulation
ticks; core decides production, not browser timers. Input events and elapsed
calls are sequential; tests explicitly supply their order. Expose supported
constructors/observations for varied valid test scenarios, not opaque JS casts.

Manual pause uses Normal `p`, clearing count, with visible HUD state. Navigation,
construction and command input remain available while paused. While manually
paused OR hidden, elapsed calls are ignored. Entering/leaving manual pause or
hidden suspension resets the sub-tick remainder to zero. Hidden/resume never
changes the manual-pause choice, and there is no catch-up on resume. Blur alone
cancels interaction but does not pause time. Browser uses monotonic elapsed time
and avoids counting hidden time; it forwards time to the pure core. Production
continues while visible and typing/using menus. Use a deterministic manual-clock
browser harness in tests which exercises the real update/render path, not fake
world outcomes. Manual-clock control is test infrastructure, not player UI.

Worked examples, empty well/ring linked before time begins:
- 4900 ms: well=0, ring=980 quanta, no imps.
- 5000 ms: well=0, ring=0, first imp.
- 25000 ms: well=0, ring=0, five imps.
- 30000 ms: well=0, ring=1000, five imps.
- 40000 ms: well=2000, ring=1000, five imps; later time cannot create a sixth.
Two empty wells feeding one ring yield the first imp after 2500 ms. A well
pre-filled to 2000 feeds a new empty ring: after one tick well=1000, ring=0,
one imp (its just-generated overflow was discarded); after two ticks well=20,
ring=0, two imps. Supply order matters when a ring has partial room.

## 8. Requirements, independent examples and executor freedom

`spec/first-playable/obligations.md` assigns required property IDs and unit owners.
`spec/first-playable/*.json` contains independent shared examples, supplied before
implementation. `manifest.json` freezes this authority, obligation list and case
bytes; the fixture checker establishes integrity only, not correctness or proof.
Both arms must use their actual exported core on varied supported inputs. Case
setup requires a real validated factory/constructor; adapters cannot fabricate
private representations. Normalized observations in the corpus are test outputs,
not mandated storage. Additional generated/hand-computed tests remain necessary.

Do not change the shared authority/cases/checker to accommodate implementation.
Equivalent interfaces/helpers may evolve with old/new requirement mapping,
preservation argument, independent examples and full active checks. Do not
narrow domains, weaken expected results, remove obligations or test fixture-only
paths. Kernel-check equivalent-law preservation where practical; otherwise label
it as reviewed reasoning. Record revisions in coverage notes and the handover.

Core laws/tests describe functional behavior, invariants AND progress (a funded,
uncapped ring actually produces), not merely weak safety bounds. Pure core owns
world updates and command outcomes. Browser owns capture, camera and drawing.
Storage, algorithms, helper types and proof strategies belong to executors.

## 9. Compatibility, verification and performance

Keep original 40x20 navigation obligations, integrity checks and direct runtime
coverage green. New game bindings intentionally live outside the old parser.
Generalization may reuse/refactor machinery with preserved old behavior; do not
silently change 40 to 240 or hash away incompatible old laws. Old default-page
browser assertions can migrate to the new world while retaining equivalent
motion/focus/rendering coverage; the old landing-page fixture need not remain.

Run `just verify` after each unit. Add `just first-playable-complete` in the final
unit: all shared requirement IDs implemented/covered, all case groups active,
no skip/todo/only filtering, plus the full proof graph in Bend. Each unit leaves
all activated claims checked; planned later requirements stay explicitly pending
in a coverage map, never represented as proved. UI/camera properties use runtime
checks. Source-independent examples do not substitute for universal Bend laws.

Retain a timing script measuring production browser dispatch (not Playwright
round trips), same initial states/commands, 3 warmups and 5 measured runs, counts
1/99/9999 for six word motions and axis/line/find families. Record final positions,
median/max, machine, Bun/Chromium/compiler/model/provider versions. Repeat on
world text with all eight sites and on all-space text via the real core factory.
Use a bounded worker/process for direct-core stress probes; report timeouts.
No numeric latency gate was agreed. Do not equate mathematical termination with
responsiveness. Avoid repeated scans after movement reaches its fixed point.
Keep baseline repairs and new-feature timings/costs separate in handovers.

## 10. Experiment and completion

This pass evaluates executor-authored per-unit Bend laws against an independently
settled behavior contract. It differs from the previous planner-authored laws.
TS authors tests for the same properties. Neither arm reads/ports the other's
new implementation. Shared artifacts are identical before execution; baseline
assistance and differing repairs remain disclosed. Both plans use the same
feature boundaries and default DeepSeek configuration; actual routes/usage come
from the harness. No implementation, laws or proof solutions were supplied here.

At completion, update game docs and the workbench's outcome, preserve protocol,
case corpus and measurements, and remove resolved workbench topics through
Benchpress. Never delete the running plan/state files; Ploopy closes them.
Research synthesis belongs in the Zettelkasten after review, not a recreated
`docs/experiments/`. Plans do not authorize starting/landing/pushing other runs.
