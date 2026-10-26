# TypeScript navigation implementation evidence

Setup 2026-10-26. No implementation run has started. Baseline/specification
checks are separate from the 50 pending navigation checks. Read comparison.md
for provenance, supplied code, accounting rules and the historical comparison's
limitations. The planner supplied the baseline, API types, specification helpers,
obligation checks and plan; no production navigation code or private model.

Record actual outcomes here per unit. Include failed approaches, equivalent
contract revisions, independent examples, measurements and interventions. Missing
metrics remain unavailable. A finite test pass is not a proof.

| Unit | Commits | Actual harness/model/effort | Attempts | Checks | Difficulties and interventions |
| --- | --- | --- | --- | --- | --- |
| 1.1 | `0ece0a8` and the evidence commit that adds this row | OpenCode / `deepseek/deepseek-flash`, high effort | 1 | `nix develop --command just verify` and `direnv exec . just verify` green: contract integrity, typecheck, 17 core tests, 2 browser tests, benchpress lint | No failed approach or manual assistance. Field and State representations were open; the model checks fixed the observable behavior only. No interface revision was needed. |

**Unit 1.1 representation notes.** `Field` is a normalized 800-cell ASCII string
at runtime, branded at the type level so ordinary strings cannot be passed as a
field without the factory. `State` is a `View<Field>`: there is no hidden parser
state yet, so `pack`/`view` shallow-copy the mode and preserve field identity.
`at` compares the arbitrary bigint position with 800 before converting it to a
number, so huge positions cannot lose precision. Normalization reuses the
supplied `normalized` and `seedText` helpers, keeping code-point truncation,
sanitation and the concatenated seed exactly in step with the specification.
Independent roundtrip examples live in `tests/core/navigation-model.test.ts`.
