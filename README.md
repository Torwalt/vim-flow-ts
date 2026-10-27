# vim-flow-ts

A small Vim-controlled ASCII RTS in TypeScript/Bun. The independent Bend/TS
comparison is paused. Continue this game here; reconsider a Bend rewrite after
the design stabilizes. Historical measurements remain in the linked notes.

Next pass: [cursor survival design](docs/plans/CURSOR_SURVIVAL.md) and
[nine-unit Ploopy plan](docs/plans/CURSOR_SURVIVAL_EXECUTION.md), started. The
rules-profile boundary, dynamic free placement, terrain, relative row numbers,
typed/named construction, connections, a shared rally command, the building
finder, living troop combat and fixed-gate enemy waves with cursor collision and
game over exist; allied movement remains planned. The browser now defaults to
survival with its terrain, gutter, typed construction, finder, waves and troop
state;
`?rules=first-playable` selects the historical playable described below. See
[survival coverage](docs/survival-coverage.md).

```sh
nix develop
just setup
just dev
```

Open http://localhost:3000 and click the field. `just verify` runs the complete
first-playable gate: frozen corpus integrity, all 18 property IDs and 53 cases,
the original 50 named navigation obligations, TypeScript, core behavior and
development/production Chromium. `just check-nix` checks the Nix static build.
`just timing` records production browser dispatch timings for the eight-site and
all-space worlds plus bounded direct-core stress probes in `artifacts/`.
`nix build` produces the static site. `just preview` serves `dist/` on port 4173.

The flake retains the sibling's locked Bun, TypeScript, agent harnesses, Ploopy,
Benchpress and Chromium tooling, without its compiler/proof dependencies. gh is
included. `.env` is local and ignored; on this host it links to the sibling's
existing environment. Agent authentication stays in existing user settings.

Navigation is **implemented and playable**: `h j k l`, `w b e W B E`, `0 ^ $`,
`gg G`, counted motion and `f F` move a visible cursor over the 240×160 world.
The game fills the window with a 32px HUD, 12×20 cells, device-pixel-ratio
backing and an integer-cell camera; pending counts and find/go prefixes appear
in the HUD, and Escape or browser blur cancel them. The original 40×20
navigation contract remains checked as a compatibility fixture. In the
first-playable profile, Space then `f` opens the targeted-site Build menu:
`w`/`r` choose a well or ring, Enter builds it for free, Escape cancels and the
core glyphs preview the choice. At a built site, `i` opens a 32-character
command buffer: exact `connect` plus Escape or Enter stages a well, and Enter at
a ring commits a persistent directed arrow from the well; ring Escape retries
and Normal Escape or blur cancels. In survival, `i` types construction commands
and Space `f` opens a finder for built names, types, IDs, Rally and the enemy
gate; movement applies the shared displacement sweep used by later collision.
The pure core advances linked mana on exact 100 ms ticks. Legacy rings create up
to five ordered stationary imps; survival rings keep living allies with HP and
replacement production, and adjacent allies and enemies resolve simultaneous
attacks with stable IDs and cooldowns. Fixed-gate waves arrive on scheduled
ticks, enemies chase the cursor over deterministic distance fields, cursor
movement stops before hostiles with contact damage, and death freezes play until
Enter restarts. Survival exposes cursor HP, kills and wave state. The browser
forwards monotonic frame time into that core, suspends without catch-up while the
tab is hidden, and Normal `p` toggles manual pause; the HUD shows mana, link
endpoints, ring population, mode, draft, source and simulation time. The execution plan runs under OpenCode /
`deepseek/deepseek-flash`, high effort, with no secondary or rescue; evidence and
measurements are in
[execution evidence](../notes/zettelkasten/vim-game-bend-typescript-navigation.md).

See [comparison protocol](../notes/zettelkasten/vim-game-bend-comparison-protocol.md),
[behavior authority](docs/plans/NAVIGATION.md),
[obligation mapping](spec/navigation/obligations.md).

Run Ploopy from this checkout inside tmux. It creates its own worktree and links
the ignored environment via `.ploopy.toml`. `ploopy status` lists open plans.
The navigation plan is completed and landed.
On macOS install Playwright Chromium once; Linux uses the flake's Chromium.

## First playable

The shared [first-playable game authority](docs/first-playable.md) is implemented
by the completed and landed first-playable plan: the
full-window 240×160 world, camera, free keyboard construction, typed directed
connections, linked mana, five ordered stationary imps per ring, visible
monotonic time, manual pause and hidden suspension all run in development and
production builds. `just first-playable-complete` executes the mapped core and
browser suites; `just verify` requires it.
