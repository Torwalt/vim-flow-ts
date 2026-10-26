# vim-flow-ts

The ordinary TypeScript/Bun comparison arm of vim-flow. Read docs/direction.md
and ../notes/zettelkasten/vim-game-bend-main.md. Navigation is implemented.
The comparison protocol and execution evidence live in that note's index.
The shared game authority is `docs/first-playable.md`; the active implementation
plan is `docs/plans/FIRST_PLAYABLE_EXECUTION.md`.

- Enter `nix develop`; run `just setup` once, then `just dev`.
- Keep game rules, Vim interpretation and state transitions in `src/core/` as
  pure TypeScript. `src/web/` captures events and draws observations.
- Implement the exact supported domain and behavior in the active authority.
  Types and tests express requirements; never change expected behavior to make
  an implementation pass. Document equivalent test/interface revisions with
  independent examples and preserve the obligation mapping.
- Keep storage and algorithms private. Test the actual exported functions on
  arbitrary fields, not only the fixture. No unsafe casts to fabricate State
  in acceptance tests: use the real factory/pack API.
- Run `just verify` before finishing changes, and `just check-nix` after flake
  changes. Commit `flake.lock` and `bun.lock`; generated output is ignored.
- Keep design questions and work in `docs/workbench/` using benchpress.
  `NEXT.md` is the author's order. Run `benchpress lint`.
- Preserve configured Git identity. Do not add AI attribution to commits.
- Do not read or port the completed sibling implementation. This experiment
  measures implementation from the supplied specification, not translation.
