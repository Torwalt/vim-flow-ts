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

## Survival pass (2026-10-27)

The author paused independent Bend/TypeScript comparison. Continue the small
game in TypeScript; reconsider a Bend rewrite after playtesting stabilizes rules
and the codebase is substantial enough. No ongoing parity obligation.

The implemented [cursor survival authority](cursor-survival.md) is the current
default game. It specifies faint rendered grass over logical whitespace, real
terrain landmarks, relative row numbers, typed/autocompleted construction with
optional names, Space f building finder, free placement, shared rally, moving
allies, fixed-gate hostile waves, collision and cursor health. Its defaults are
planner choices under the author's request; the [execution
plan](plans/CURSOR_SURVIVAL_EXECUTION.md) is in its final unit. The browser
defaults to survival with deterministic terrain, grass, the relative row gutter,
typed construction, names, connections, the shared rally command and the
building finder. Living allies have stable IDs, HP and attack cooldowns;
survival rings replace dead allies on their first free spawn exit, and adjacent
troops fight in one simultaneous combat phase with cursor HP and a kill count.
Fixed-gate enemy waves spawn on exact ticks, chase over deterministic distance
fields, stop cursor displacement with shared contact cooldowns, and freeze at
cursor death until Enter restarts. Allies travel to the latest shared rally,
pursue enemies within six path cells, hold adjacent combat and resume the rally
afterward. Cyan allies, orange enemies, non-color faction markers, injured
health bars, the HP/wave/kills/population HUD and the restart overlay make the
state readable without relying on color alone. `?rules=first-playable` selects
the historical playable explicitly. The live map is
[survival coverage](survival-coverage.md).

## What runs now

The 240x160 world is drawn on a full-window Canvas with a visible cursor, eight
named sites, a 32-pixel HUD and an integer-cell camera. Keyboard capture feeds
the pure TypeScript navigation API without computing destinations in the
browser, and the HUD reports pending counts, find and go prefixes. The supported
motions are counted `h j k l`, `w b e W B E`, `0 ^ $`, `gg G` and `f F`; Escape
and browser blur cancel a stranded prefix. The original 40x20 navigation
contract remains checked as a compatibility fixture. The historical
first-playable profile keeps Space `f` building and `i` `connect`; the default
survival profile types construction with `i`, opens the building finder with
Space `f`, and sends every cursor displacement, including finder jumps, through
one shared sweep. Linked wells feed rings on exact 100 ms ticks; legacy rings
summon five ordered stationary imps while survival rings track living allies,
replace the dead and send them to the shared rally. Survival waves arrive at the
fixed gate, allies and enemies move on 500 ms phases, collision applies the same
contact cooldown, and game over freezes all time until Enter restarts. Normal `p`
pauses, and hidden tabs suspend without catch-up. The HUD shows resources, link
endpoints, production, mode, simulation time, cursor health, wave timing, kills
and living population; the game-over overlay shows the restart key. Bun serves
and bundles; Nix pins tools; Bun and Chromium check
contract, core and development/production browser behavior.

## Completion

The first-playable plan is complete and landed in this repository: the full 18-property, 53-case corpus and the original 40×20
navigation contract pass. `just first-playable-complete` executes the mapped
core and browser suites and checks the active coverage map.
