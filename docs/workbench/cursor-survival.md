---
kind: change
area: gameplay
state: planned
plan: docs/plans/CURSOR_SURVIVAL_EXECUTION.md
---

# Give the cursor a populated world and something to survive

*Author request, 2026-10-27.* Continue the small game in TypeScript; pause Bend
parity. Populate ground, help vertical travel, type buildings/interactions,
find named buildings through Space f, and survive hostile imp waves.

**Now:** `src/core/world.ts` has eight fixed sites, Build menu, typed connect,
local mana and five stationary imps per ring. No names, enemies or health.
`src/web/main.ts` renders sparse ASCII with a camera and HUD.

**Plan:** [authority](../plans/CURSOR_SURVIVAL.md),
[execution](../plans/CURSOR_SURVIVAL_EXECUTION.md). Seven units, not started.
Author decisions and planner-selected small-scope defaults are separate there.
No unresolved design question blocks execution; tune defaults after playing.
