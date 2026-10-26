# TypeScript comparison protocol

*Setup authorized by the author, 2026-10-26.* The goal is to identify useful
AI development workflows: better code quality, token savings from fewer failed
approaches, or ideally both. A narrower solution space is a hypothesis, not a
measured saving. Count specification/proof work and stronger-model help too.

This independent repository was bootstrapped from vim-flow's pre-implementation
`main` commit `0e17f02c8db13dabdca3e8db49109d7d72df0121` using a file snapshot.
It has its own Git object store and no imported implementation history. The
Bend result under review is `779bbb8e649af151ff8e4beead2c50c34585a8cd`; its
review and later repairs remain in the sibling repository. Do not inspect or
translate that solution during this experiment.

## What is supplied before execution

- The common 40x20 border-field baseline is translated to ordinary TypeScript.
  No navigation implementation, storage model, scan or parser is supplied.
- Nix retains the existing non-language tool inputs and locks. Compiler/proof
  packages and integration are removed. Bun bundles the static HTML and TS.
  gh is included. The same local `.env` is linked and ignored, never published.
- Public observations and generic API declarations in `spec/navigation/api.ts`
  preserve private Field/State choice. Counts use bigint at motion APIs to keep
  the original arbitrary-natural-count domain. The observable parser count
  remains a number bounded by 9999; valid positions remain numbers 0–799.
  No floating-point approximation of a large natural is required or allowed.
- Helpers translate the original planner's character classification,
  normalization, coordinates, candidate and rank relations. They do not return
  destinations. Production reuse is permitted as in the revised original handoff.
- `spec/navigation/checks.ts` supplies finite tests corresponding to the 50
  original semantic obligations. `obligations.md` maps them individually.
  Helpers have independent worked-example preflight tests; this is extra
  planner work, not executor work. API/type declarations are separate from
  behavioral obligations. No navigation tests are active until implementation.
- The execution plan retains model, axis, words, lines, find, input, browser
  units, and uses OpenCode / `deepseek/deepseek-flash`, high effort, no secondary
  and no rescue. No run is started by repository setup. Ploopy owns its worktree.

This is a pragmatic comparison with the historical revised Bend workflow,
not a fresh randomized language experiment. The planner has seen the first
run's review. Explicit browser focus-loss coverage and high-count measurements
are hindsight-informed evaluation additions. They must be applied to the
original Bend snapshot too when reporting a comparison; do not silently add
them to its old acceptance criteria or count repairs as the original result.

## Rules during execution

Keep behavior and supported domain fixed. Equivalent type/test/helper changes
need a concrete reason, old-to-new obligation mapping, independent examples
and a recorded explanation. Do not drop tests, substitute fixture-only behavior,
change expected results to match the implementation, or edit this protocol or
the authority. Add tests through the actual runtime API on varied fields.
Document original requirements that cannot be met instead of silently narrowing
them. Each unit activates its complete test group; earlier groups stay active.

The first five units register their groups from `spec/navigation/checks.ts` in
`tests/core/navigation-contract.test.ts`; input adds the sixth group. Final
assembly calls `registerAll(actualApi)` exactly once there. No skip/todo/only
or pending group counts as checked. The original baseline/specification tests
pass today, with zero navigation implementation claims. A passing finite suite
is never described as a universal theorem. Additional generated cases and
hand-computed examples remain necessary because the fixed sample is finite.

Do not configure automatic stronger rescue or follow-up repairs for the measured
run. Record actual provider routes, attempts, checks, wall time, input/output/
cached tokens, recorded price, and any manual help. Retain available session logs
outside Git; never publish API credentials or raw transcripts without checking
them. The user must explicitly request execution; setup does not start sessions.

## Evaluation

Compare independent behavior checks, defects found after completion, runtime
latency, and full authoring/implementation/review/repair effort. Record separately:

1. Setup/planning tokens, time, assumptions and code supplied.
2. Implementation tokens and price, distinguishing cached from uncached reads;
   session attempts and failed approaches where logs permit classification.
3. Correctness on arbitrary and malformed fields, edge positions, punctuation,
   row splits, counted find misses, input sequences, modifiers and focus loss.
4. Warmed repeated timing of counts 1, 99 and 9999 for word commands and other
   motions, with final position and machine/browser versions. No numeric latency
   pass mark was settled; record measurements rather than inventing a threshold.
5. Review and repairs, plus the effort and regressions on the same next feature.

Keep additional evaluation inputs/expected results independent of production
helpers and agent edits. Before scoring, freeze and record the shared corpus
and adapters and run it against both snapshots. The seed and original example
results may be shared; the completed sibling engine must not become the oracle.
Quality is more than test count, and total tokens are more than implementation
price. Proof coverage is an additional Bend result; sampled tests are finite
evidence. Missing metrics stay unknown rather than being reported as zero.

## Next controlled increment

Choose one new feature from a language-neutral brief, settle shared acceptance
criteria before either implementation, and prepare comparable plans for both.
Repeat across increments to learn whether reusable proofs reduce mistakes or
cost and whether proof maintenance outweighs those gains. This initial run alone
cannot attribute a difference to language rather than planner help, tool maturity,
provider changes, cached context, or the order of experiments.
