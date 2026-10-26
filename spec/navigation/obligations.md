# Original obligation mapping

Source: pre-implementation `0e17f02`, six original navigation contract modules.
No obligation is removed by translating its syntax. The source had 13 abstract
declarations and 50 semantic obligations, not 63 behavior proofs. Each ID below
is the corresponding test name registered by checks.ts. These are finite checks
of universal requirements, not proofs. Additional cases belong in separate tests.

## API/type declarations

`model.Field` and `model.State` are executor-owned generic types.
`model.field/at/contents/view/pack/initial` are ModelApi methods. The four
`axis/words/lines/find.move` declarations map to axisMove/wordMove/lineMove/findMove;
`input.step` maps to step. Mode/View/Input remain planner-authored observations.
That is two abstract types and eleven callable operations. Field and State must
have real values and constructors; fixture-only or empty-domain tricks fail scope.

## Semantic obligations

| Original ID / runtime test name | Preserved requirement |
| --- | --- |
| `model.field_contents` | Factory cell observation equals sanitized/padded source text for every inside position. |
| `model.field_printable` | Every observed cell is printable ASCII. |
| `model.field_outside` | Outside cell reads return space, including huge positions. |
| `model.pack_view` | Every valid snapshot roundtrips through the runtime constructor. |
| `model.initial_view` | Initial field, position and mode equal the exact seed snapshot. |
| `model.initial_valid` | Initial state is valid. |
| `model.contents_length` | Observed contents length is exactly 800. |
| `model.contents_at` | Contents and actual cell reads agree at every inside position. |
| `model.contents_printable` | Every character in observed contents is printable ASCII. |
| `axis.left` | Subtract count from column with floor zero; preserve row. |
| `axis.right` | Add count to column with cap 39; preserve row. |
| `axis.up` | Subtract count from row with floor zero; preserve column. |
| `axis.down` | Add count to row with cap 19; preserve column. |
| `axis.bounded` | Every axis result stays inside the field. |
| `words.one` | One step selects the nearest strict candidate or the exact edge fallback. |
| `words.zero` | Zero repetitions return the original position. |
| `words.counted` | Two-plus-n steps equal one step followed by one-plus-n steps. |
| `words.bounded` | Every counted word result remains inside. |
| `lines.zero_column` | Return column zero on the same row, ignoring count. |
| `lines.row_end` | Return column 39 of the exact clamped relative target row. |
| `lines.first_nonblank` | Return the minimal nonblank on the same row or its column zero. |
| `lines.first_row` | Return the correct explicit/default first target row and indent. |
| `lines.last_row` | Return the correct explicit/default last target row and indent. |
| `lines.bounded` | Every line result remains inside. |
| `find.zero` | Zero internal find count is identity. |
| `find.exact` | Select exact nth strict row-local hit, or original position if insufficient. |
| `find.bounded` | Every find result remains inside. |
| `input.respects_view` | Hidden representations with the same observable snapshot behave equally. |
| `input.preserves_field` | Input preserves field and does not mutate its supplied state. |
| `input.preserves_validity` | Every valid state remains valid after an event. |
| `input.other` | Other input preserves every representable state. |
| `input.blocked_character` | Blocked character preserves every representable state. |
| `input.blocked_escape` | Blocked Escape preserves every representable state. |
| `input.escape` | Unblocked Escape resets grammar/count only. |
| `input.nonprintable` | Nonprintable character leaves state unchanged. |
| `input.axis` | Normal axis keys call the exact counted axis behavior and clear count. |
| `input.words` | All six word keys call the exact counted word behavior and clear count. |
| `input.zero_column` | Zero with no count executes column-zero motion. |
| `input.first_nonblank` | Caret executes indent and clears count. |
| `input.row_end` | Dollar executes counted row end and clears count. |
| `input.last_row` | Capital G executes explicit/default row target and clears count. |
| `input.find_right_prefix` | f enters FindRight with effective count without moving. |
| `input.find_left_prefix` | F enters FindLeft with effective count without moving. |
| `input.find_target` | Printable target is literal and completes the pending counted find. |
| `input.go_prefix` | g enters Go with the pending optional count without moving. |
| `input.go_complete` | g in Go executes explicit/default first row and clears state. |
| `input.go_invalid` | Other printable input in Go cancels and is consumed. |
| `input.nonzero_digit` | 1–9 appends a decimal digit with saturation at 9999. |
| `input.zero_digit` | Zero extends an existing count with saturation. |
| `input.unsupported` | Unsupported printable Normal input clears count without moving. |

Activation counts: model 9; +axis 5 =14; +words 4 =18; +lines 6 =24;
+find 3 =27; +input 23 =50. The full check audits named passing tests.
Large bigint samples preserve exact arithmetic; finite samples do not establish
the universal arbitrary-natural property of the original laws. Other/blocked
requirements quantify over every representable state, though samples are valid
snapshots. Add independently generated and boundary cases; disclose coverage gaps.
