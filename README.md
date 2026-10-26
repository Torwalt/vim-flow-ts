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
`nix build` produces the static site. `just preview` serves `dist/` on port 4173.

The flake retains the sibling's locked Bun, TypeScript, agent harnesses, Ploopy,
Benchpress and Chromium tooling, without its compiler/proof dependencies. gh is
included. `.env` is local and ignored; on this host it links to the sibling's
existing environment. Agent authentication stays in existing user settings.

Navigation is **implemented and playable**: `h j k l`, `w b e W B E`, `0 ^ $`,
`gg G`, counted motion and `f F` move a visible cursor over the seeded 40×20
field. Pending counts and find/go prefixes appear in the status line; Escape and
browser blur cancel them. There is no editing, time or objective yet. The
seven-unit plan ran under OpenCode / `deepseek/deepseek-flash`, high effort, with
no secondary or rescue; evidence and measurements are in
[`docs/experiments/navigation.md`](docs/experiments/navigation.md).

See [comparison protocol](docs/experiments/comparison.md),
[behavior authority](docs/plans/NAVIGATION.md),
[execution plan](docs/plans/NAVIGATION_EXECUTION.md), and
[obligation mapping](spec/navigation/obligations.md).

Run Ploopy from this checkout inside tmux. It creates its own worktree and links
the ignored environment via `.ploopy.toml`. `ploopy status` lists the pending
plan; `ploopy run --plan NAVIGATION_EXECUTION --detach` starts it when requested.
On macOS install Playwright Chromium once; Linux uses the flake's Chromium.
