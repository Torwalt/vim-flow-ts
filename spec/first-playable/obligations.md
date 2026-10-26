# First-playable obligations and corpus schema

Frozen before execution, 2026-10-26. Shared property requirements, not Bend law
signatures or production types. Unit IDs refer to FIRST_PLAYABLE_EXECUTION.

| ID | Unit | Required property |
| --- | --- | --- |
| W1 | 2.1 | Valid initial world, exact dimensions/map/IDs; public constructors for valid varied scenarios; pure observable roundtrips. |
| W2 | 2.1 | Unique non-overlapping sites, exact target hitboxes/rally cells, bounds and composed glyph fidelity; no cursor/world drift. |
| N1 | 2.2 | Exact generalized axis/word/line/find/count behavior over arbitrary supported world text, preserving original 40x20 domain. |
| N2 | 2.2 | Navigation validity, modifier/Other identity, Escape/blur cancellation, field preservation and high-count fixed points. |
| V1 | 3.1 | Full-window camera/resize follows the exact rule without world mutation; correct DPR and visible rendering. |
| V2 | 7.1 | Real keyboard/focus/composition/visibility plus actual glyph/cursor/link rendering match core observations; deterministic clock integration. |
| B1 | 4.1 | Menu stages selection; only confirmation builds, immediately/free at captured empty site; visible targeting/preview. |
| B2 | 4.1 | Invalid/occupied placement identity; exact building glyph changes/locality; no spending or accidental overwrite. |
| I1 | 4.1 | Modal input precedence, literal find targets, count handling, blocked input identity and menu capture. |
| I2 | 5.1 | Bounded editable drafts, exact commands, source staging/commit, mode-specific Escape and global blur cancellation. |
| L1 | 5.1 | Exact requested keyboard sequence links source well to target ring, with no premature mutation. |
| L2 | 5.1 | Endpoint validity, one outgoing/multiple incoming, idempotence, atomic reroute, invalid-link identity and ownership preservation. |
| E1 | 6.1 | Exact well generation/saturation and unfunded ring behavior over valid states. |
| E2 | 6.1 | Ordered transfer with bounded buffers, nonnegative balances, conservation except explicit generation overflow/summon spending. |
| E3 | 6.1 | Funded uncapped ring actually creates next stationary imp and spends exact cost; stable unique ordered positions. |
| E4 | 6.1 | At most five created/ring; exact count/list agreement; no sixth/spending at cap or reconnect reset. |
| T1 | 6.1 | Exact elapsed/remainder/ticks, zero identity and partition equivalence without intervening actions. |
| T2 | 6.1 | Pause/suspension ignores elapsed, resets remainder, preserves manual choice; input/menu do not pause visible production. |

Bend: give core requirements universal laws over valid supported inputs, with
behavioral progress and safety; IDs V1/V2 use browser/runtime coverage. W1's
literal fixture observations and finite API conversions can also use runtime
examples, alongside universal validity/roundtrip laws. Finite examples alone
cannot discharge the other core properties. TS: corresponding independent tests
and property-style varied-input checks. Record a per-ID mapping to concrete
exports/laws/tests in executor-owned `spec/first-playable/coverage.json`.

## Corpus format

Each group JSON is an array of cases: unique id, requires (IDs), setup, events,
expect. Case setup is applied through real validated public factories. It cannot
write private JS State shapes. Scenario fields not given default to the initial
world; buildings lists specify the complete initial building population on the
fixed sites. A ring with produced=n comes with exactly its first n stationary
imps. Initial command/navigation mode is Normal, no pending source, unpaused,
visible, zero clock/remainder, unless explicitly set. `pendingSource` fixtures
must name an existing well. Mana integers are quanta (100 = one mana).

`navigationOnly:true` means a real factory-supported valid 240x160 blank field,
no sites/terrain/border overlays, with each setup.rows string placed/padded to
240 cells on its numeric row. Short/malformed text sanitation follows the old
ASCII policy (nonprintable becomes space); glyph rows are world text, not fake
runtime observations. This is an input-construction path, not a separate engine.

Events: key carries a logical printable character or Escape/Enter/Backspace,
optional blocked=true. build/link invoke the real pure construction/link actions
for isolated tests; they must use the same functions as keyboard dispatch.
elapsed.ms forwards an exact natural elapsed duration; blur/visibility are real
core cancellation/suspension events. Camera-only cases call the production
presentation camera helper with the given viewport/origin; they are not Bend
world laws. The complete-loop browser case drives actual keyboard/rendering and
a deterministic manual clock through the production update path.

Expected observations are deep partial matches with exact primitive values;
arrays (notably imps) must match exactly in length/order/content. Missing fields
are not unspecified behavior: the authority still applies. sites is a dictionary
by permanent ID, including kind, mana quanta, link (well), produced (ring).
Empty sites have kind=empty. Additional queries: siteCount, buildingCount,
impCount, siteAtCursor, glyphs [{x,y,value}], cursor {x,y}, mode string, count,
pendingSource, menuSelection, commandBuffer, manualPaused, suspended,
elapsedTicks, remainderMs. Adapters normalize observations only, never compute
expected outcomes or repair results. Mode strings: Normal, FindRight, FindLeft,
Go, Leader, Build, Insert. Camera observations are integer {x,y}.

Case groups activate cumulatively by unit: world 2.1, navigation 2.2,
construction 4.1, connections 5.1, economy+clock 6.1, browser 7.1. Camera cases
within browser.json activate at 3.1; the complete-loop case at 7.1. No skip/todo
placeholders: later groups stay unregistered until their owning unit, with the
coverage map declaring pending work. Every case must be active by final assembly.
No planner-supplied production engine, private model, Bend laws or proofs exist.
