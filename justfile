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

preview: build
    bun run preview

verify: first-playable-fixtures contract contract-complete typecheck test test-browser
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
