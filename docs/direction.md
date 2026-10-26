# Direction

*From the author, 2026-10-26.* Relive fluent Vim navigation: see where you are
and where you want to go, know the motions, and execute them from muscle memory.
The game is free. Preferred gameplay direction is a textual/glyph RTS or wargame
with Dune, Command & Conquer and Warcraft II as references. Editing, troops,
terrain and time remain discussion topics, not implemented game mechanics.

This repository is the ordinary TypeScript/Bun arm of the vim-flow experiment.
The author wants useful AI development workflows: higher code quality, fewer
failed approaches and lower token/iteration cost, ideally both. The sibling
uses Bend with laws and kernel-checked proofs. Compare complete workflow cost
and independently evaluated behavior; do not assume either language wins.

## What runs now

The seeded 40x20 text field is drawn on Canvas with a visible cursor. Keyboard
capture feeds the pure TypeScript navigation API without computing destinations
in the browser, and the status line reports pending counts, find and go prefixes.
The supported motions are counted `h j k l`, `w b e W B E`, `0 ^ $`, `gg G` and
`f F`; Escape and browser blur cancel a stranded prefix. There is still no
editing, time or game objective. Bun serves and bundles; Nix pins tools; Bun and
Chromium check contract, core and development/production browser behavior.

## Next discussion

Choose the first playable objective and use the same brief and acceptance
criteria for both repositories. See docs/experiments/comparison.md.
