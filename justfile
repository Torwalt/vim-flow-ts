default:
    @just --list

setup:
    bun install --frozen-lockfile

dev:
    bun run dev

contract:
    bun tools/check-navigation-contract.ts

contract-complete:
    env -u AGENT -u CLAUDECODE -u REPL_ID bun tools/check-navigation-contract.ts --complete

typecheck:
    bun run typecheck

test:
    bun run test

build:
    bun run build

test-browser: build
    bun run test:browser

timing: build
    bun tools/experiments/first-playable-timing.ts

preview: build
    bun run preview

first-playable-complete: first-playable-fixtures test test-browser
    bun tools/check-first-playable-completion.ts

verify: first-playable-complete contract contract-complete typecheck
    benchpress lint

check-nix:
    nix flake check

fmt:
    nixfmt flake.nix

doctor:
    bun --version
    tsc --version
    just --version
    codex --version
    claude --version
    opencode --version
    tmux -V
    ploopy --version
    benchpress --version
    gh --version

# Check frozen first-playable authority/examples, without claiming implementation.
first-playable-fixtures:
    bun tools/check-first-playable-fixtures.ts
