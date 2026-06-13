# Nx affected Docker apps

Composite action that intersects `nx show projects --affected` with a **caller-defined** list of Nx project names. Use it in Docker (or other per-app) workflows so you only build images for apps that actually changed.

**Location:** `.github/actions/nx-affected-docker-apps`
**Workflow example:** [`openthrottle-docker.yml`](../../workflows/openthrottle-docker.yml)

## Prerequisites

- **Checkout** with `fetch-depth: 0` so Nx can compute the affected graph against the base revision.
- **`nrwl/nx-set-shas`** (or equivalent) so `nx show projects --affected` uses the correct base/head SHAs in CI.
- **Dependencies installed** (e.g. `./.github/actions/node-setup`) so `pnpm exec nx` works when `nx-version` is empty.

## Inputs

| Input        | Required | Description                                                                                                                                                          |
| ------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps`       | **Yes**  | Comma-separated Nx project names or a one-line JSON array, e.g. `openthrottle-server,openthrottle-developer` or `["openthrottle-server","openthrottle-developer"]`.  |
| `nx-version` | No       | If set (e.g. `${{ vars.NX_VERSION }}`), runs `pnpm dlx nx@<version> show projects --affected --json`. If empty, runs `pnpm exec nx show projects --affected --json`. |

## Outputs

| Output                         | Description                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `affected-apps-json`           | JSON array of configured apps that are affected, e.g. `["openthrottle-server"]`.                                                       |
| `matrix-json`                  | JSON object for a job matrix: `{"include":[{"app":"openthrottle-server"},...]}`. Empty `include` when none are affected.               |
| `build-flags-json`             | JSON object mapping **each** configured app name to `true` or `false`. **Use this when adding new apps** without editing `action.yml`. |
| `build-openthrottle-server`    | `true` or `false` (strings) — convenience when `openthrottle-server` is in `apps`.                                                     |
| `build-openthrottle-developer` | Same for `openthrottle-developer`.                                                                                                     |

The compute step writes `build-<nx-project-name>=true|false` for every name in `apps` to `GITHUB_OUTPUT`. **Composite actions only expose outputs listed under `outputs:` in [`action.yml`](./action.yml).** For any other project name (e.g. a new `openthrottle-*` app), use `build-flags-json`, `affected-apps-json`, or add a new `outputs:` entry that maps `build-<name>` to `${{ steps.compute.outputs.build-<name> }}`.

## Usage

```yaml
- name: "🕵️ NX Set SHA's"
  uses: nrwl/nx-set-shas@afb73a62d26e41464e9254689e1fd6122ee683c1 # v5.0.1

- name: '📋 Affected Docker apps'
  id: affected
  uses: ./.github/actions/nx-affected-docker-apps
  with:
    apps: openthrottle-server,openthrottle-developer
    nx-version: ${{ vars.NX_VERSION }}

- name: Build server image
  if: steps.affected.outputs.build-openthrottle-server == 'true'
  run: # docker build ...

  # Hyphenated Nx names: use bracket access on build-flags-json (dot notation breaks on `-`).
- name: Build server image (via JSON flags)
  if: fromJSON(steps.affected.outputs.build-flags-json)['openthrottle-server']
  run: # docker build ...
```

Prefer `build-openthrottle-server` / `build-openthrottle-developer` for readability when those are the only apps. Use `build-flags-json` with bracket access when the list grows or you add hyphenated project names.

### Optional: matrix job

`matrix-json` is shaped as `{"include":[{"app":"openthrottle-server"},...]}`. Use it to fan out one job per affected app. The job that runs this action needs the same **Prerequisites** as above (checkout with history, `node-setup`, `nrwl/nx-set-shas`, then this action).

```yaml
jobs:
  discover:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.affected.outputs.matrix-json }}
    steps:
      # checkout, node-setup, nx-set-shas — see Prerequisites
      - id: affected
        uses: ./.github/actions/nx-affected-docker-apps
        with:
          apps: openthrottle-server,openthrottle-developer
          nx-version: ${{ vars.NX_VERSION }}

  build:
    needs: discover
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix: ${{ fromJSON(needs.discover.outputs.matrix) }}
    steps:
      - run: echo "Building ${{ matrix.app }}"
```

If `include` is empty, GitHub Actions skips matrix jobs that would have zero combinations (no rows).

## Adding another app (e.g. `openthrottle-foo`)

1. **Extend `apps`** — include the Nx project name:
   `openthrottle-server,openthrottle-developer,openthrottle-foo`
2. **Branch on affected** — either:
   - **`build-flags-json`:**
     `if: fromJSON(steps.affected.outputs.build-flags-json)['openthrottle-foo']`
     (boolean from JSON; bracket form when the name contains `-`)
   - **Or** compare against `affected-apps-json` with `contains()` / a small script if you prefer list semantics.
3. **Optional:** add a dedicated entry under `outputs:` in `action.yml` mapping `build-openthrottle-foo` to `${{ steps.compute.outputs.build-openthrottle-foo }}` if you want `steps.<id>.outputs.build-openthrottle-foo` without using `fromJSON(build-flags-json)`.

Ensure the new project is a real Nx **project** name (see `project.json` / `nx.json`) and that Docker (or whatever consumes this action) uses paths consistent with your layout (e.g. `applications/<app>/Dockerfile` when the app folder matches the project name).

## Implementation notes

- Logic lives in [`compute-outputs.mjs`](./compute-outputs.mjs): stdin is the JSON array from `nx show projects --affected --json`; outputs are written to `GITHUB_OUTPUT`.
- Multiline JSON values use GitHub’s multiline `GITHUB_OUTPUT` delimiter pattern (see [`compute-outputs.mjs`](./compute-outputs.mjs) `writeMultiline`) so values with special characters are safe.
