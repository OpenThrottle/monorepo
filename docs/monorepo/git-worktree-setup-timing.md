# Git worktree setup timing (copy `node_modules` vs `pnpm install`)

This doc compares two Cursor worktree setups from `.cursor/worktrees.json`:

1. **Baseline:** copy `node_modules` from the main repo, then `./scripts/setup.sh`.
2. **Comparison:** `./scripts/setup_worktree.sh` — `setup_environment.sh`, `pnpm install`, `pnpm build` (no `node_modules` copy, not the full `setup.sh` stack).

Timings are **machine-specific** (disk, pnpm store warmth, Nx Cloud cache).

> `setup_worktree.sh` also offsets the worktree's app ports onto a `7000`-range
> block so its dev servers don't collide with the main checkout — see
> [worktree-port-allocation.md](worktree-port-allocation.md).

---

## Baseline: copy `node_modules` + `scripts/setup.sh`

### Environment (baseline run)

| Item                 | Value                                                               |
| -------------------- | ------------------------------------------------------------------- |
| Date                 | 2026-05-01                                                          |
| Machine              | macOS (darwin 25.4.0)                                               |
| `WORKTREE_ID`        | `test-setup-5cdb16ac`                                               |
| `WORKTREE_START_REF` | `HEAD` (detached)                                                   |
| `HEAD_COMMIT`        | `271a242c205da0c8e4d98d4954044f66c196f473`                          |
| Worktree path        | `~/.cursor/worktrees/test-setup-5cdb16ac/openthrottle-507450a7ce17` |
| Repo root            | `~/Development/openthrottle` (`ROOT_WORKTREE_PATH` for setup)       |

### Timings (baseline)

| Phase                                                                                                                                      | Duration              |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| `git worktree add --detach`                                                                                                                | 603 ms                |
| Copy `node_modules`                                                                                                                        | 115,749 ms (~1.9 min) |
| `./scripts/setup.sh` (env generation; worktree skips troubleshooting / services / software installs; then `pnpm build` → `build:packages`) | 13,546 ms (~13.5 s)   |
| **Setup total** (copy + script)                                                                                                            | 129,378 ms (~2.2 min) |
| **Create + setup**                                                                                                                         | **~130 s** (~2.2 min) |

Notes:

- Most wall time was **copying `node_modules`**.
- `pnpm run build:packages` used **Nx remote cache** heavily.
- Worktree detection: setup scripts **skipped** troubleshooting clone, services clone, and software installation when running from a linked worktree.

### Smoke check after baseline (`@openthrottle/nestjs-utils`)

| Check      | Result                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| Type error | `pnpm nx run @openthrottle/nestjs-utils:typecheck` failed (TS2322), ~4 s                                     |
| Lint       | `pnpm nx run @openthrottle/nestjs-utils:lint` failed (`no-debugger`), ~4 s                                   |
| Clean tree | `pnpm nx run-many -t lint,typecheck -p @openthrottle/nestjs-utils --skip-nx-cache` succeeded in **3,374 ms** |

---

## Comparison: `setup_worktree.sh` (`pnpm install` + `pnpm build`)

Equivalent to `scripts/setup_worktree.sh`:

1. `./scripts/setup_environment.sh`
2. `pnpm install`
3. `pnpm build`

### Environment (comparison run)

| Item                 | Value                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Date                 | 2026-05-01                                                                                                         |
| Machine              | macOS (darwin 25.4.0)                                                                                              |
| `WORKTREE_ID`        | `pnpm-install-e36dc132`                                                                                            |
| `WORKTREE_START_REF` | `HEAD` (detached)                                                                                                  |
| `HEAD_COMMIT`        | `4eead86c40ddce33a8363382e7e0fa276f60021f`                                                                         |
| Worktree path        | `~/.cursor/worktrees/pnpm-install-e36dc132/openthrottle-507450a7ce17`                                              |
| Repo root            | `~/Development/openthrottle` (`ROOT_WORKTREE_PATH` not required for install path; used if you mirror Cursor setup) |

### Timings (comparison)

| Phase                                   | Duration                | Notes                                      |
| --------------------------------------- | ----------------------- | ------------------------------------------ |
| `git worktree add --detach`             | 617 ms                  |                                            |
| `./scripts/setup_environment.sh`        | 454 ms                  | Same worktree skips as in baseline env run |
| `pnpm install`                          | 18,500 ms (~18.5 s)     | Lockfile up to date; heavy **store reuse** |
| `pnpm build` (`build:packages`)         | 13,578 ms (~13.6 s)     | Nx remote cache similar to baseline        |
| **Setup total** (env + install + build) | 32,639 ms (~32.6 s)     |                                            |
| **Create + setup**                      | **33,256 ms** (~33.3 s) | `CREATE_MS` + `SETUP_TOTAL_MS`             |

### Observations (comparison)

- **Much faster end-to-end** than copying `node_modules` in this run (~33 s vs ~130 s), almost entirely because **`pnpm install` linked from the local store** (`reused 3254`, `downloaded 0` in the log) instead of reading a full tree copy from disk.
- **pnpm** emitted **ENOENT** warnings when creating some workspace `.bin` shims before built artifacts existed (e.g. `openthrottle-mcp`, `@tools/workflows` bins). Install still exited 0; **`pnpm build` afterward** produced those `dist` outputs. If you need bins immediately after install, consider ordering or a follow-up `pnpm rebuild` where applicable.
- This path does **not** run `setup_troubleshooting.sh`, `setup_services.sh`, or `setup_software.sh` (unlike `setup.sh`); aligned with a lighter worktree-only workflow.

### Commands used (reproducibility)

Timed phases were run sequentially from the worktree root, with `ROOT_WORKTREE_PATH` set to the main repo (optional for these steps; Cursor sets it for `setup-worktree`):

```bash
ms() { python3 -c 'import time; print(int(time.time()*1000))'; }
# after git worktree add --detach <path> HEAD
cd <worktree-path>
export ROOT_WORKTREE_PATH="/path/to/main/repo"

S=$(ms); ./scripts/setup_environment.sh; E=$(ms); echo "ENV_MS=$((E-S))"
S=$(ms); pnpm install; E=$(ms); echo "PNPM_INSTALL_MS=$((E-S))"
S=$(ms); pnpm build; E=$(ms); echo "PNPM_BUILD_MS=$((E-S))"
```

---

## Summary

| Approach                                     | Create + setup to “ready” | Dominant cost                                  |
| -------------------------------------------- | ------------------------- | ---------------------------------------------- |
| Copy `node_modules` + `scripts/setup.sh`     | **~130 s**                | **`cp` of `node_modules`** (~116 s)            |
| `setup_worktree.sh` (`pnpm install` + build) | **~33 s** (this run)      | **`pnpm install`** (~18.5 s) + build (~13.6 s) |

**Caveat:** A **cold** or **low-reuse** `pnpm install` (empty store, CI, or strict `frozen-lockfile` with network fetch) can swing the comparison; re-time in that environment if that is your target.

### Optional follow-ups

- After experiments: merge with **`/apply-worktree`**, remove worktree with **`/delete-worktree`**.
- Add `#!/usr/bin/env sh` and `set -e` to `scripts/setup_worktree.sh` if you want stricter, portable execution when invoked as `./scripts/setup_worktree.sh`.
