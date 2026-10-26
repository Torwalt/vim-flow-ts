# Direction

*From the author, 2026-10-26.* Relive fluent Vim navigation: see where you are
and where you want to go, know the motions, and execute them from muscle memory.
The game is free. Settled direction (2026-10-26): top-down ASCII RTS, real
text-grid navigation with named sites, construction of mana-wells/rings,
local mana connections and five stationary, individually positioned imps/ring.
Construction is free/immediate; visible time continues while typing/using menus.
These features are planned, not implemented yet.

The shared [game authority](first-playable.md) pins behavior and defaults.
The [planned workbench topic](workbench/first-playable-rts.md) points at the pass.

## What runs now

The seeded 40x20 text field is drawn on Canvas with a visible cursor. Keyboard
capture feeds the pure TypeScript navigation API without computing destinations
in the browser, and the status line reports pending counts, find and go prefixes.
The supported motions are counted `h j k l`, `w b e W B E`, `0 ^ $`, `gg G` and
`f F`; Escape and browser blur cancel a stranded prefix. There is still no
editing, time or game objective. Bun serves and bundles; Nix pins tools; Bun and
Chromium check contract, core and development/production browser behavior.

## Next implementation

Run the [first-playable plan](plans/FIRST_PLAYABLE_EXECUTION.md) when ready.
Both language plans and their identical acceptance corpus are prepared before
execution; the author starts the runs. The baseline navigation remains current
until implementation lands.
