# vim-flow-ts

The ordinary TypeScript/Bun arm of [vim-flow](https://github.com/Torwalt/vim-flow),
comparing AI code quality and total token/iteration cost with a law-and-proof
workflow. This is an independent repository, owned by the personal GitHub user
Torwalt. It starts from the common baseline, not the completed implementation.

```sh
nix develop
just setup
just dev
```

Open http://localhost:3000 and click the field. `just verify` checks contract
integrity, all 50 named navigation obligations, TypeScript, core behavior and
development/production Chromium. `just check-nix` checks the Nix static build.
`just timing` records production browser dispatch timings in `artifacts/`.
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
navigation contract remains checked as a compatibility fixture. Space then `f`
opens the targeted-site Build menu: `w`/`r` choose a well or ring, Enter builds
it for free, Escape cancels and the core glyphs preview the choice. At a built
site, `i` opens a 32-character command buffer: exact `connect` plus Escape or
Enter stages a well, and Enter at a ring commits a persistent directed arrow
from the well; ring Escape retries and Normal Escape or blur cancels. There are
no economy ticks, imps or objective yet. The execution plan runs under OpenCode /
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

## Next implementation

The shared [first-playable game authority](docs/first-playable.md) and
[Ploopy execution plan](docs/plans/FIRST_PLAYABLE_EXECUTION.md) are active. The
full-window 240×160 world, camera, free keyboard construction and typed directed
connections are in place; linked mana, stationary imps and simulation time
remain planned for later units.
