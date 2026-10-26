---
name: ploopy-local
description: This repository's own rules for ploopy's skills — writing plans, carrying out units, reviewing, triage, landing, and working with ploopy here. Read the section named after the ploopy skill in use, alongside that skill.
---

# ploopy in this repository

ploopy's skills, which `ploopy skills` writes beside this one, are the same
in every repository. This file adds what is particular to this one, under a
heading per skill. ploopy hands each section to the sessions it runs with that
skill, after the skill; an agent working by hand reads it alongside the skill.
A rule here wins over the skill. A section left empty adds nothing.

## ploopy

Plans live in `docs/plans/`. Run Ploopy from `nix develop` in the main checkout,
inside a tmux session. `.ploopy.toml` sets `launch = "tmux"`. Its setup links
the main checkout's ignored `.env`, allows direnv, and installs dependencies
through `direnv exec . just setup`. Checks also use `direnv exec` so the flake
and local environment are loaded. Ploopy owns worktree creation.
Do not start a plan merely because its skills were installed or refreshed.

## plan-writing

## plan-unit

Follow `AGENTS.md` and `docs/direction.md`. Run `nix develop --command just verify`
before finishing changes, and `nix develop --command just check-nix` after flake
changes. Preserve the configured Git identity and omit AI attribution in commits.

For this comparison, implement from this repository's authority and public
contracts. Do not inspect the completed sibling implementation. Record test or
interface revisions and preserve all mapped behavioral obligations. Runtime
property checks are finite evidence, not universal proofs.

## plan-review

## review-triage

## review-direct

## unit-rescue

## land-repair
