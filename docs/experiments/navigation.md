# TypeScript navigation implementation evidence

Setup 2026-10-26; execution ran through unit 7.1. Baseline/specification checks
are separate from the 50 navigation checks. Read comparison.md for provenance,
supplied code, accounting rules and the historical comparison's limitations. The planner supplied the baseline, API types, specification helpers,
obligation checks and plan; no production navigation code or private model.

Record actual outcomes here per unit. Include failed approaches, equivalent
contract revisions, independent examples, measurements and interventions. Missing
metrics remain unavailable. A finite test pass is not a proof.

| Unit | Commits | Actual harness/model/effort | Attempts | Checks | Difficulties and interventions |
| --- | --- | --- | --- | --- | --- |
| 1.1 | `0ece0a8` and the evidence commit that adds this row | OpenCode / `deepseek/deepseek-flash`, high effort | 1 | `nix develop --command just verify` and `direnv exec . just verify` green: contract integrity, typecheck, 17 core tests, 2 browser tests, benchpress lint | No failed approach or manual assistance. Field and State representations were open; the model checks fixed the observable behavior only. No interface revision was needed. |
| 2.1 | This commit (implementation, contract registration, independent examples and this evidence row) | OpenCode / `deepseek/deepseek-flash`, high effort | 1 | `direnv exec . just verify` green: contract integrity, typecheck, 27 core tests, 2 browser tests, benchpress lint; the active contract file reports 14 named checks (nine model plus five axis) | No failed approach or manual assistance. `registerAxis(axis)` was appended after `registerModel(model)`; the earlier group stayed active. No interface revision was needed. |
| 3.1 | This commit (implementation, contract registration, independent examples and this evidence row) | OpenCode / `deepseek/deepseek-flash`, high effort | 1 | `direnv exec . just verify` green: contract integrity, typecheck, 37 core tests, 2 browser tests, benchpress lint; the active contract file reports 18 named checks (nine model, five axis plus four words) | No failed approach or manual assistance. `registerWords({ ...model, ...words })` was appended after the axis group; all earlier groups stayed active. No interface revision was needed. Hand-working the expected punctuation and row-split destinations needed care because starts and ends fall on different cells of the same run. |
| 4.1 | This commit (implementation, contract registration, independent examples and this evidence row) | OpenCode / `deepseek/deepseek-flash`, high effort | 1 | `direnv exec . just verify` and `direnv exec . just test` green: contract integrity, typecheck, 49 core tests, 2 browser tests, benchpress lint; the active contract file reports 24 named checks (nine model, five axis, four words plus six lines) | No failed approach or manual assistance. `registerLines({ ...model, ...lines })` was appended after the words group; all earlier groups stayed active. No interface revision was needed. |
| 5.1 | This commit (implementation, contract registration, independent examples and this evidence row) | OpenCode / `deepseek/deepseek-flash`, high effort | 1 | `direnv exec . just verify` and `direnv exec . just test` green: contract integrity, typecheck, 59 core tests, 2 browser tests, benchpress lint; the active contract file reports 27 named checks (nine model, five axis, four words, six lines plus three find) | No failed approach or manual assistance. `registerFind({ ...model, ...find })` was appended after the lines group; all earlier groups stayed active. No interface revision was needed. One independent row-boundary expectation was initially hand-worked as crossing into the previous row and corrected by re-reading the strict same-row rule before the suite ran. |
| 6.1 | This commit (implementation, complete API assembly, contract registration, sequence tests, harness fix and this evidence row) | OpenCode / `deepseek/deepseek-flash`, high effort | 1 | `direnv exec . just verify`, `direnv exec . just test` and `nix develop --command just contract-complete` green: contract integrity, typecheck, 91 core tests, 2 browser tests, benchpress lint; `just contract-complete` reports all 50 named checks | No failed implementation approach or manual assistance. `registerAll(actualApi)` replaced the six individual registrations exactly once. The `contract-complete` recipe now clears Bun's AI-agent environment markers before invoking the unchanged audit tool because Bun hides passing test names when `AGENT=1`, which made the name audit fail even with 50 passes. Three hand-worked word/find expectations were corrected after the first test run: small `w` starts a punctuation run, counted find ranks accumulate rather than restart. |
| 7.1 | This commit (browser scene, development/production browser sequences, timing evidence, verification wiring and documentation) | OpenCode / `deepseek/deepseek-flash`, high effort | 1 | `direnv exec . just verify` green: contract integrity, all 50 named contract checks through `just contract-complete`, typecheck, 91 core tests, 22 browser tests (development and production), benchpress lint | No failed approach or manual assistance. Browser capture maps keyboard events to `Input` and feeds `actualApi.step`; it does not compute destinations or parser outcomes. The tests check both reported observations and the cursor's actual canvas pixels. |

**Unit 1.1 representation notes.** `Field` is a normalized 800-cell ASCII string
at runtime, branded at the type level so ordinary strings cannot be passed as a
field without the factory. `State` is a `View<Field>`: there is no hidden parser
state yet, so `pack`/`view` shallow-copy the mode and preserve field identity.
`at` compares the arbitrary bigint position with 800 before converting it to a
number, so huge positions cannot lose precision. Normalization reuses the
supplied `normalized` and `seedText` helpers, keeping code-point truncation,
sanitation and the concatenated seed exactly in step with the specification.
Independent roundtrip examples live in `tests/core/navigation-model.test.ts`.

**Unit 2.1 arithmetic notes.** Axis movement splits a valid position into its
row and column with the supplied coordinate helpers, then does all displacement
in `bigint`. Each coordinate is clamped against `0n` and its bigint edge
(`39n` for a column, `19n` for a row) before the single conversion back to a
number; the coordinate that the axis does not move is carried through unchanged.
This keeps zero an identity and makes every nonnegative count, including
`Number.MAX_SAFE_INTEGER + 1`, `2n ** 64n` and `10n ** 100n`, saturate at the
field edge rather than lose precision through an early number conversion. The
independent examples in `tests/core/navigation-axis.test.ts` cover zero at row
starts/ends/interiors, one-past-the-edge counts, huge counts in all four
directions and the invariant that horizontal moves keep the row while vertical
moves keep the column.

**Unit 3.1 selection and termination notes.** `wordMove` scans outward from the
cursor for the nearest supplied `candidate` in the requested direction and
returns the field's first or last cell when the scan finds none. The scan order
makes the first hit the minimal forward/end candidate or the maximal backward
candidate, matching `wordSelected` without storing a destination. Repetition
uses a bigint counter, so the natural-count domain is not narrowed; after each
step it returns immediately when the destination is unchanged. A fallback is
such a fixed point, which bounds work to the 800 cells for every positive count,
including `Number.MAX_SAFE_INTEGER + 1`, `2n ** 64n` and `10n ** 30n`. Zero
skips the loop and preserves the position. Independent examples in
`tests/core/navigation-words.test.ts` hand-work small punctuation runs, a single
WORD spanning punctuation, row-split runs, all-space and singleton fields, and
anchor counts to repeated single steps.

**Unit 4.1 row-target notes.** `lineMove` delegates the target row to the
supplied `targetRow` helper, which already encodes the default/count rules: zero
and indent stay on the current row, `end` offsets by `n - 1` with a minimum
offset of zero, `first` uses `n - 1` clamped so an absent count reaches row
zero, and `last` maps an absent count to the final row and otherwise uses
`n - 1`. The row target is clamped in bigint before any conversion, so huge
counts saturate rather than lose precision. `zero` returns the target row's
column zero directly. `end` returns column 39 of the target row. `indent`,
`first` and `last` scan that row's 40 cells for the first non-space and fall
back to column zero when the whole row is blank. Counts are intentionally
ignored by `zero` and `indent`. Independent examples in
`tests/core/navigation-lines.test.ts` use a field with a spaced row, a blank
row, a leading-space row and a flush-left row, then hand-work default, counted,
clamped and huge-count destinations for all five motions plus the all-nonblank
first-row case.

**Unit 5.1 rank and boundary notes.** `findMove` scans only the cursor's own
40-cell row and uses the supplied `hit` predicate, so strictness, current-cell
exclusion and target equality all come from the same relation as `findSelected`.
Forward scans ascend from `position + 1` to the row end; backward scans descend
from `position - 1` to the row start. A bigint rank increments on each hit and
the scan returns when the rank equals the requested count, so the exact nth hit
is selected without storing partial results. Zero and any rank beyond the row's
hit count return the original position: the final `return position` is the only
miss outcome, which is why an insufficient rank never returns the last hit. The
bigint comparison never converts the count to a number, so `10n ** 30n` and
other huge ranks are exact. An absent parser count is not handled here; this unit
exposes only the motion API, where zero is identity and the input layer will
supply the default count later. Independent examples in
`tests/core/navigation-find.test.ts` hand-work repeated and missing targets,
current-cell-only matches, spaces as literal targets, row starts/ends on a
continuous run crossing the row boundary, insufficient ranks, zero, and huge
ranks. The first hand-worked boundary example wrongly expected a backward find
from column zero to cross into the previous row; re-reading the strict same-row
rule corrected it to the original position before the suite ran.

**Unit 6.1 parser notes.** `input.step` is a small total transition function over
the four observable modes; it reads `state` only through `model.view`-equivalent
public fields and returns a fresh `model.pack` copy, so the supplied state is
never mutated and field identity/content is preserved. Normal digits 1–9 start
or extend a count through the supplied `appendCount`, which saturates at 9999;
an unextended `0` executes the zero-column motion, while a `0` with a pending
count extends it. Relative motions use `effective(count)` (zero becomes one),
`^` ignores its count, and `$`/`G` pass the raw observable count to `lineMove`,
which already encodes absent-count semantics. Every completed motion, failed
find, unsupported Normal key and `g` cancellation returns Normal count zero.
`f`/`F` open their mode with `max(1, count)`; the next printable code point is
literal, so spaces, digits, motion keys and `g` are targets, and a miss keeps the
cursor. `g` opens Go with the pending count; `gg` executes `lineMove("first")`,
while any other printable in Go is consumed and only resets the grammar. Blocked
channels, `Other`, and characters outside printable ASCII are identities before
mode dispatch, so prefixes survive modifier chords and nonprintable input.
Unblocked Escape resets only the grammar and count. Independent sequence tests
in `tests/core/navigation-input.test.ts` hand-work `10j`, `99999l`, zero
disambiguation, `2W`, `2w`, counted `e`/`E`/`b`/`B`, all line keys, literal and
counted finds (including `0`, space, `f` and `x` targets), `gg`/`nG`, `g`
cancellation, Escape, blocked modifiers and nonprintable input on a purpose-built
five-row field. The run exposed an interface issue rather than a behavior defect:
Bun 1.3.13 suppresses passing test names when it detects `AGENT=1`, so the
unchanged contract audit could not see the 50 names. The `contract-complete`
just recipe now runs the same audit under `env -u AGENT -u CLAUDECODE -u REPL_ID`;
the audit tool and contract files are untouched.

**Unit 7.1 browser and evidence notes.** `src/web/main.ts` owns only rendering
and event capture. It starts from `actualApi.initial()`, draws `actualApi.contents`
and the cursor, and sends each captured `Input` through `actualApi.step`; the
pending mode and position are reported in the status line and on the canvas
data attributes. The canvas is focusable, takes focus on pointer down, sends an
unblocked Escape on canvas or window blur, ignores keydown while an IME
composition is active, and maps Ctrl/Alt/Meta chords to blocked input. Keys with
more than one code point become `Other`. Escape and unmodified single-code-point
keys are prevented from scrolling or activating browser defaults; modified
chords are left to the browser.

The browser tests use the initial seed and hard-coded expected destinations
worked from the authority rather than browser-side calculations. They cover the
initial frame, `5j`, Shift+`w`, `2fx` both as a row-zero miss and a successful
counted find on row 1, `F` pending and completing a literal space, `gg`, `3G`,
Escape on find/go prefixes, a blocked Control+`j` chord with a pending count,
window blur cancellation and a composed keydown that is ignored until the
logical character commits. Each case reads the reported position/mode/count and
locates the cursor by scanning the canvas for its rendered colour, then checks
the derived cell. The same tests run in both Playwright projects; there are 22
browser tests including the retained baseline smoke test.

**Unit 7.1 high-count timings.** Measured 2026-10-26 on Linux NixOS 6.18.55,
x86_64, Bun 1.3.13 and Chromium 150.0.7871.181 against the production preview,
headless. Each cell is final position / median dispatch milliseconds (maximum
dispatch milliseconds) over five runs after three warmups. Sequential synthetic
`keydown` events were dispatched on the focused canvas; the measurement covers
event mapping, `actualApi.step`, status update and canvas redraw, not Playwright
round trips. No sustained main-thread stalls appeared; the largest single
dispatch was 1.6 ms. No latency threshold is claimed.

| family | command | count 1 | count 99 | count 9999 |
| --- | --- | --- | --- | --- |
| words | `w` | 6 / 0.40 (0.40) | 799 / 0.50 (0.60) | 799 / 0.60 (0.90) |
| words | `b` | 0 / 0.20 (0.40) | 0 / 0.30 (0.40) | 0 / 0.50 (0.60) |
| words | `e` | 4 / 0.20 (0.40) | 799 / 0.30 (0.40) | 799 / 0.50 (0.60) |
| words | `W` | 6 / 0.20 (0.30) | 799 / 0.30 (0.40) | 799 / 0.50 (0.50) |
| words | `B` | 0 / 0.30 (0.40) | 0 / 0.30 (0.30) | 0 / 0.40 (0.50) |
| words | `E` | 4 / 0.20 (0.40) | 799 / 0.30 (0.40) | 799 / 0.40 (0.70) |
| axis | `h` | 0 / 0.20 (0.30) | 0 / 0.30 (0.50) | 0 / 0.50 (1.00) |
| axis | `j` | 40 / 0.20 (0.30) | 760 / 0.30 (0.50) | 760 / 0.50 (0.60) |
| axis | `k` | 0 / 0.20 (0.20) | 0 / 0.30 (0.50) | 0 / 0.50 (0.60) |
| axis | `l` | 1 / 0.20 (0.40) | 39 / 0.30 (0.30) | 39 / 0.40 (0.50) |
| lines | `^` | 0 / 0.20 (0.30) | 0 / 0.30 (0.30) | 0 / 0.50 (0.50) |
| lines | `$` | 39 / 0.20 (0.50) | 799 / 0.40 (0.50) | 799 / 0.40 (0.50) |
| lines | `G` | 0 / 0.20 (0.30) | 760 / 0.50 (0.70) | 760 / 0.60 (0.90) |
| lines | `gg` | 0 / 0.30 (0.50) | 760 / 0.40 (0.50) | 760 / 0.70 (0.90) |
| lines | `0` | 0 / 0.10 (0.30) | | |
| find | `f` | 53 / 0.50 (0.50) | 40 / 0.40 (0.50) | 40 / 0.60 (0.70) |
| find | `F` | 40 / 0.50 (1.60) | 40 / 0.60 (0.70) | 40 / 0.60 (0.70) |

Find rows started at position 40 on row 1, so `1fx` reaches 53 while higher
ranks miss and stay at 40. `0` is measured only at the default count because a
pending count makes the input `0` extend the count instead of executing the
zero-column motion, even though `lineMove("zero")` ignores its count. Counts are
explicit (`1w`), so the count digit is included in each measured sequence.

**Unit 7.1 Ploopy measurements and limits.** Before this unit's state was
recorded, `ploopy report NAVIGATION_EXECUTION` showed 6 of 7 units landed, six
sessions, 10m30s in sessions, 21s in checks, $0.10, 6.6M tokens read with 96%
from cache and 90k written, and a median `just verify` of 2s. `ploopy history`
showed one OpenCode / `deepseek/deepseek-flash` high session per unit at about
$0.01 and one minute. The 7.1 session's own cost, tokens and elapsed time are not
in the state file until Ploopy records them; they are unknown here, not zero.
Ploopy covers recorded state and stats logs, so the timing table came from the
separate in-browser measurement above. The timing evidence is one host, one
headless Chromium, one production bundle, synthetic events and five runs; it is
finite evidence, not a usability threshold or a universal latency statement.
The pixel check relies on the cursor's rendered colour, and the scene still has
no editing, time, objective or game scoring.
