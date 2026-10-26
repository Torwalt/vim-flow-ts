# Navigation comparison authority

Status: authority, written 2026-10-26 against the common baseline snapshot
`0e17f02c8db13dabdca3e8db49109d7d72df0121`; translated before execution.

## 1. Decisions settled with the author (2026-10-26)

The author requested a separate ordinary TypeScript/Bun repo to compare the
same navigation feature with the same implementation agent. Reuse the locked
tooling and local environment, publish under their personal GitHub user only,
then land the completed sibling branch. The purpose is higher AI code quality
and/or token savings from fewer failed approaches. This is a workflow experiment;
do not assume either outcome or attribute all differences to language.

The exact behavior below is retained from the original pre-implementation
authority, including its deliberately simplified grid policies. The planner
supplies public types, specification predicates, finite obligation checks and
this plan. The executor chooses private storage and algorithms and writes the
implementation, additional tests and evidence. The original's complete solution
is not a source. Setup is not execution authorization for an unattended run.

## 2. Scope and exact behavior

Use the existing 40-column, 20-row field. Positions are zero-based, row-major
indices 0 through 799; row = position / 40, column = position modulo 40. Rows
are full-width text, including padding spaces. Every cell is navigable. A dot
is punctuation, not blank terrain. ASCII 32 through 126 is the supported cell
domain, with a literal space as the only blank. There are no zero-length lines,
tabs, Unicode display-width rules, wrapping, collision, time or editing.

| Input | Destination |
| --- | --- |
| `[n]h/j/k/l` | n cells on the corresponding axis, clamped at that edge |
| `[n]w/W` | Repeat n times: nearest word/WORD start strictly after cursor |
| `[n]b/B` | Repeat n times: nearest word/WORD start strictly before cursor |
| `[n]e/E` | Repeat n times: nearest word/WORD end strictly after cursor |
| `0` | Column zero of current row, when no count is pending |
| `[n]^` | First non-space of current row; count ignored |
| `[n]$` | Last column of current row + n - 1, clamped at last row |
| `gg`, `G` | First/last row, at its first non-space |
| `[n]gg`, `[n]G` | Row n - 1 clamped to the field, at its first non-space |
| `[n]f{char}`, `[n]F{char}` | nth occurrence strictly right/left on current row |
| Escape | Clear pending count/find/g prefix, preserve cursor and field |

Default count is one for relative movements. For gg/G, zero internally means
the absence of an explicit count. On a blank row first-non-space falls back to
column zero. Without a later candidate w/W/e/E go to the final cell; without an
earlier candidate b/B go to the first cell. These are intentional grid boundary
rules. `$` clamps even when its requested row exceeds the field; we do not model
Vim's configurable error behavior. Failure to find the nth f/F occurrence
preserves the original cursor completely, rather than keeping a partial find.

A small word is a run of ASCII letters/digits/underscore or a run of other
non-space punctuation. A WORD is any non-space run. Row boundaries always split
runs. The fixed padded grid differs from an editor buffer with variable-length
lines and empty lines. [Vim reference](https://vimhelp.org/motion.txt.html).

Counts start with 1-9; subsequent digits include zero. Count entry does not
move. Counts saturate at 9999, keeping JS values exact and bounded instead of
wrapping on a long digit sequence. Every completed motion clears the count.
This cap is an explicit policy choice, recorded for the experiment.

Normal input has four observable grammar states: Normal (with optional count),
FindRight, FindLeft, Go. These are command parsing states, not Insert or Visual
mode. f/F consumes the next printable character literally, including a digit,
space, motion key or shifted character. A printable character other than g
after g cancels and is consumed, without reprocessing. Unsupported printable
characters in Normal clear the count and otherwise do nothing. Nonprintable
characters, modifier-only events and other non-character keys leave state
unchanged. Ctrl/Alt/Meta chords leave state unchanged even during a prefix.
Escape without those modifiers cancels. Uppercase is preserved; H/J/K/L do not
execute h/j/k/l. Key repeat is ordinary repeated key input. Browser blur sends
Escape to avoid a stranded prefix; composition events are ignored until the
browser supplies a committed logical character.

## 3. Observable contracts and private representations

`spec/navigation/api.ts` defines Mode, View<Field>, Input and generic API
interfaces. Field and State remain private executor-owned types. `field` and
`pack` must permit arbitrary supported fields and valid observable states, not
only the initial fixture. Contents is exactly 800 printable ASCII cells after
code-point truncation/padding/sanitation. `at` outside the field returns space.
view(pack(v)) equals v for every valid v. Initial uses the original literal
seed in helpers.ts; its fourth concatenated segment is not silently repadded
as an independent row. Normalize the concatenated text, as in the original.

Motion APIs take nonnegative bigint counts. This preserves arbitrary naturals
without prescribing an algorithm; clamp or reduce before converting to number.
Positions in valid View are numbers 0–799; `at` takes an arbitrary nonnegative
bigint position. Parser Mode.count is a bounded number 0–9999 (1–9999 in find).
Strings entering field are arbitrary JS strings, inspected by code point rather
than UTF-16 code unit. Characters in the input API are one logical code point;
multi-code-point browser keys are Other. Invalid snapshots/negative naturals
are outside the agreed valid-state/motion domain; ignored and blocked events
must leave any representable State unchanged, as in the original obligations.

Implement a stable `src/core/navigation.ts` public entry exporting the applicable
interfaces cumulatively, then the complete NavigationApi. Pure model/motion/
input modules under src/core own runtime behavior. The baseline scene may stay
until final browser integration. TypeScript has no compiler bridge or proof
assembly; do not imitate either. Browser code must only capture and draw.

## 4. Ownership and test activation

The 13 original abstract declarations map to the two private types, six model
operations, four motion operations and step (see obligations.md). There are 50
semantic obligations, mapped individually to fixed finite tests. No navigation
implementation or active navigation check is supplied at setup. The baseline
and specification-preflight tests are not navigation completion.

In tests/core/navigation-contract.test.ts, register the completed groups from
spec/navigation/checks.ts in order: model, axis, words, lines, find, input.
Earlier groups stay active. Use the actual exported implementation and the
matching generic interfaces, no mock or duplicate implementation. Unit 6 replaces
individual registrations with registerAll(actualApi), producing exactly 50 named
contract tests in that file. Keep independent extra tests in separate files.
Final `just contract-complete` checks their actual passing names and integrity.

Do not edit this authority, comparison protocol or audit tool during execution.
Equivalent API/test/helper changes are allowed only with concrete evidence,
old/new formulations, preserved-domain and obligation arguments, independent
examples, and all checks. Record in docs/experiments/navigation.md and update
the integrity manifest in the same commit. Changing hashes or passing 50 names
does not establish equivalence. Never weaken behavior, remove an obligation,
skip/todo/only checks, use fixture-only solutions or change expected examples
to fit code. Additional runtime tests/generators may expand coverage freely.

Helpers for classification, normalization, coordinates and candidate/rank
relations may be shared with production, as they were in the revised handoff.
Keep hand-worked destination examples independent of those helpers. Runtime
tests sample a finite domain; they do not prove universal statements. Huge
counts are exact bigints; words may stop once further repetition cannot change
the destination, but must preserve the stated result for every natural count.

## 5. Verification, browser and evidence

Run under nix develop. Every unit runs just verify; flake changes also require
just check-nix. No flake change should be needed for navigation. Worktree setup
and checks use the ignored local environment via .ploopy.toml. Do not land or
push during implementation. Automatic secondary, rescue and follow-up are off.

Add independently worked examples and generated cases invoking the actual API
on varied fields: all space, punctuation/keyword transitions, singleton WORDs,
row boundaries, repeated/missing targets and malformed Unicode text. Cover count
entry 10j, 99999l, 0, 2W, clearing, case, literal find targets and blocked chords.
No cast-fabricated private State in acceptance tests; use field/pack.

Final browser tests must run in development and production, checking real cursor
pixels and observations for 5j, Shift+w, 2fx, F, gg, 3G, Escape and blocked chords.
Support keyboard focus, blur cancellation and composition policy from section 2.
Do not compute destinations or parser state in browser code. No editing/time.

Measure count 1, 99 and 9999 for all six word commands and other motion families,
report repeated timings with final positions, machine/browser and warmup. No
numeric latency threshold was settled; do not invent one. Report any sustained
main-thread stalls as limitations rather than equating termination with usability.
These timing/focus checks are review-informed; the comparison protocol labels
the hindsight advantage. Preserve baseline checks until final integration.

Append per-unit evidence: commits, actual model/provider route/effort, attempts,
checks, representation/algorithm choices, failed approaches, interface revisions
and any help. Use Ploopy report/history for available measurements. Missing
metrics stay unknown. Do not infer token savings from implementation price.
At completion update durable baseline/direction and experiment results, remove
the completed workbench topic with benchpress rm, and run benchpress lint.
Leave the authority, execution plan and state for Ploopy to close. No generic
workflow skill is created by this pass.
