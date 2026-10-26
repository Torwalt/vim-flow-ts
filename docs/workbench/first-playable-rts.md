---
kind: design
area: gameplay
state: planned
plan: docs/plans/FIRST_PLAYABLE_EXECUTION.md
---

# Turn navigation into a Vim-driven RTS economy

*From the author, 2026-10-26.* Implement the ASCII text-grid RTS economy with
named sites, free immediate construction, local linked mana and individually
positioned stationary imps, capped at five created per ring. Visible time
continues during typing and menus. The author will start the runs.

**Settled:** Shared [game authority](../first-playable.md) pins behavior and
planner-selected defaults; the [execution plan](../plans/FIRST_PLAYABLE_EXECUTION.md)
owns implementation. The first unit records baseline repairs/checks separately.
Bend authors/proves laws per core unit; TypeScript authors tests for the same
requirements. Both use the identical frozen 53-case corpus and 18 property IDs
under `spec/first-playable/`. Units 2.1, 2.2, 3.1, 4.1, 5.1 and 6.1 landed the core
world/site/observation facade, 240x160 navigation, the full-window camera, the
free targeted-site Build menu, typed directed connections with visible arrows,
and linked mana/imp production on the exact elapsed clock; `coverage.json`
activates W1/W2/N1/N2/V1/B1/B2/I1/I2/L1/L2/E1/E2/E3/E4/T1/T2 and marks the
browser complete loop pending.

**Notes:** [Project and experiment index](../../../notes/zettelkasten/vim-game-bend-main.md).
Do not reorder NEXT or inspect the sibling's new implementation during execution.
