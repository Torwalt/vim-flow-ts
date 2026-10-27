# vim-flow-ts

A small Vim-controlled ASCII RTS, developed in TypeScript/Bun. Read
`docs/direction.md` and `../notes/zettelkasten/vim-game-bend-main.md`.
The Bend/TypeScript comparison is paused; preserve its historical evidence.
The completed first-playable authority is `docs/first-playable.md`.
Next-pass authority: `docs/plans/CURSOR_SURVIVAL.md`; execution plan:
`docs/plans/CURSOR_SURVIVAL_EXECUTION.md`. Started; unit 1.1 added the rules
profiles and empty survival scenario, unit 1.2 added dynamic building
identity/placement and the fixed enemy gate, and unit 2.1 added deterministic
survival terrain, rendered grass and the relative row gutter; later features
remain pending.

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
- Do not read or port the completed sibling implementation. The comparison is paused;
  this pass develops TypeScript from its own authority.
