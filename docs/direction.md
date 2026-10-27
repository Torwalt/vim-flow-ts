# Direction

*From the author, 2026-10-26.* Relive fluent Vim navigation: see where you are
and where you want to go, know the motions, and execute them from muscle memory.
The game is free. Settled direction (2026-10-26): top-down ASCII RTS, real
text-grid navigation with named sites, construction of mana-wells/rings,
local mana connections and five stationary, individually positioned imps/ring.
Construction is free/immediate; visible time continues while typing/using menus.
The full-window world viewport, free construction, typed directed connections
and the linked mana/imp economy run with visible monotonic time.

The completed [first-playable authority](first-playable.md) preserves the
measured behavior. Its execution plan has been closed and landed.

## Next pass (2026-10-27)

The author paused independent Bend/TypeScript comparison. Continue the small
game in TypeScript; reconsider a Bend rewrite after playtesting stabilizes rules
and the codebase is substantial enough. No ongoing parity obligation.

[Cursor survival](plans/CURSOR_SURVIVAL.md) specifies the next pass:
faint rendered grass over logical whitespace, real terrain landmarks, relative
row numbers, typed/autocompleted construction with optional names, Space f
building finder, free placement, shared rally, moving allies, fixed-gate hostile
waves, collision and cursor health.
[Execution](plans/CURSOR_SURVIVAL_EXECUTION.md) has nine units. Started with the
rules-profile boundary and empty survival scenario; defaults are planner choices
under the author's request. Features below remain the currently running first
playable until their units land; `?rules=first-playable` selects it explicitly
and `?rules=survival` selects the empty survival world with its deterministic
terrain, grass and relative row gutter. The live map is
[survival coverage](survival-coverage.md).

## What runs now

The 240x160 world is drawn on a full-window Canvas with a visible cursor, eight
named sites, a 32-pixel HUD and an integer-cell camera. Keyboard capture feeds
the pure TypeScript navigation API without computing destinations in the
browser, and the HUD reports pending counts, find and go prefixes. The supported
motions are counted `h j k l`, `w b e W B E`, `0 ^ $`, `gg G` and `f F`; Escape
and browser blur cancel a stranded prefix. The original 40x20 navigation
contract remains checked as a compatibility fixture. Space then `f` builds a
well or ring at a targeted site; at a built site, `i` accepts the exact `connect`
command to stage a well source and commit a directed arrow at a ring. Linked
wells feed rings on exact 100 ms ticks, rings summon five ordered stationary
imps, Normal `p` pauses, and hidden tabs suspend without catch-up. The HUD shows
resources, link endpoints, production, mode and simulation time. Bun serves and
bundles; Nix pins tools; Bun and Chromium check contract, core and
development/production browser behavior.

## Completion

The first-playable plan is complete and landed in this repository: the full 18-property, 53-case corpus and the original 40×20
navigation contract pass. `just first-playable-complete` executes the mapped
core and browser suites and checks the active coverage map.
