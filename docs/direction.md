# Direction

*From the author, 2026-10-26.* Relive fluent Vim navigation: see where you are
and where you want to go, know the motions, and execute them from muscle memory.
The game is free. Settled direction (2026-10-26): top-down ASCII RTS, real
text-grid navigation with named sites, construction of mana-wells/rings,
local mana connections and five stationary, individually positioned imps/ring.
Construction is free/immediate; visible time continues while typing/using menus.
The full-window world viewport is in place; the economy features are planned,
not implemented yet.

The shared [game authority](first-playable.md) pins behavior and defaults.
The [planned workbench topic](workbench/first-playable-rts.md) points at the pass.

## What runs now

The 240x160 world is drawn on a full-window Canvas with a visible cursor, eight
named sites, a 32-pixel HUD and an integer-cell camera. Keyboard capture feeds
the pure TypeScript navigation API without computing destinations in the
browser, and the HUD reports pending counts, find and go prefixes. The supported
motions are counted `h j k l`, `w b e W B E`, `0 ^ $`, `gg G` and `f F`; Escape
and browser blur cancel a stranded prefix. The original 40x20 navigation
contract remains checked as a compatibility fixture. There is still no
construction, editing, time or game objective. Bun serves and bundles; Nix pins
tools; Bun and Chromium check contract, core and development/production browser
behavior.

## Next implementation

The [first-playable plan](plans/FIRST_PLAYABLE_EXECUTION.md) is active. Both
language plans and their identical acceptance corpus were prepared before
execution; the author starts the runs. World, navigation and the full-window
viewport are implemented; construction, connections, economy, clock and browser
completion remain later units.
