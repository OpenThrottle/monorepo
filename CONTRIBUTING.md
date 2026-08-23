# Contributing to OpenThrottle

Thanks for your interest in contributing! This guide walks the contributor
journey end to end. For how the monorepo is organized and the deeper build/test
mechanics, see [MONOREPO.md](./MONOREPO.md) and [docs/monorepo/](./docs/monorepo/).

## Ways to contribute

- **Issues** — report bugs or request features. Search first, then include clear
  reproduction steps.
- **Pull requests** — while the project is early-stage, contributions are scoped
  to smaller, targeted changes (bug fixes, docs, well-scoped improvements).
  Discuss anything larger in an issue before you build it.
- **Questions** — open an issue for clarification.

## Getting set up

1. **Bootstrap the workspace** (Node ≥ 22, pnpm only — `preinstall` blocks
   npm/yarn):

   ```bash
   ./scripts/setup.sh
   ```

2. **Authenticate to GitHub Packages (one-time).** The workspace pulls
   `@openthrottle/*` packages from GitHub Packages. As of pnpm 11 the token can
   **not** live in the committed `.npmrc`; set it once in your user-level config
   with a token that has the `packages:read` scope:

   ```bash
   pnpm config set "//npm.pkg.github.com/:_authToken" "$GITHUB_TOKEN"
   ```

   CI and the Docker build stages do the equivalent from their `GITHUB_TOKEN`.

## The change loop

1. **Branch** off `main` — never commit to `main` directly.
2. **Make your change.** New projects, components, routes, and services come from
   the generators, not hand-scaffolding — see
   [Creating new projects](./MONOREPO.md#creating-new-projects). Follow the code
   style in [`.agents/rules/`](./.agents/rules/README.md).
3. **Validate locally — the golden path.** Run the same gates CI runs:

   ```bash
   pnpm run check:local
   ```

   Green locally ≈ green on the PR. It covers formatting, lint, typecheck, tests,
   GraphQL codegen drift, and Knip. Fix what it reports rather than memorizing
   each rule — the validators and every Nx target's `description`
   (`nx show project <p>`) are the source of truth. See
   [docs/monorepo/CI-quality-gates.md](./docs/monorepo/CI-quality-gates.md).

4. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/)
   (enforced by commitlint + Husky). Don't bypass the hooks (`--no-verify`).
5. **Open a PR** with the
   [pull request template](./.github/pull_request_template.md): a
   conventional-commit title, and testing steps phrased as things to do.
6. **Merge through the queue.** `main` is protected by GitHub's merge queue, so a
   successful `gh pr merge --auto` or UI merge action may only **enqueue** your
   PR; it is not merged until the queue lands it and GitHub reports
   `mergedAt`/`mergeCommitSha`. If the queue rejects or dequeues the PR, inspect
   the failing `merge_group` Actions run, fix the branch, and enqueue it again.
   The landed commit on `main` is the squash commit the queue creates, so any
   post-merge bookkeeping that needs "the merged SHA" must read it back from the
   merged PR or from `main`, not from the branch head you pushed.

## Dependency licenses

Dependency licenses are gated in CI so an incompatible license (copyleft such as
AGPL/GPL/LGPL/SSPL, "Commercial"/proprietary, or an undetected one) cannot slip in
with a dependency bump — the way the dead `ua-parser-js` AGPL dependency once did.

**Policy** lives in [`license-policy.json`](./license-policy.json). It is
**allowlist-based / default-deny**: a package passes only if _every_ license in
its SPDX expression is on the `allow` list, or the package is covered by a
documented waiver. The policy has four sections:

- `allow` — SPDX ids permitted outright (MIT, Apache-2.0, BSD-2/3-Clause, ISC,
  0BSD, Unlicense, BlueOak, MPL-2.0 used unmodified, etc.).
- `deny` — copyleft/proprietary ids listed only so the report can explain _why_
  something failed; the default-deny already blocks anything not in `allow`.
- `resolvedUnknowns` — `package → verified SPDX id` overrides for packages that
  `pnpm licenses list` reports as `Unknown` because their `license` field is
  absent or non-SPDX (verified from the bundled license text).
- `exceptions` — package-scoped waivers, `{ package, license, reason, scope, notice? }`.

**The gate.** `scripts/validate-license-compliance.ts` applies the policy to
`pnpm licenses list --json` and exits non-zero on any disallowed or undetected
license. It runs in CI (the _Dependency-license compliance gate_ step, full-tree
on every ready PR) and locally:

```bash
pnpm validate:licenses            # or: pnpm nx run monorepo:validate-licenses
```

**When the gate fails,** the report names each offending package and the fix.
Pick the right one:

1. **The license is permissive but not yet listed** → add its SPDX id to `allow`
   (keep the array sorted).
2. **pnpm reports it as `Unknown`** → open the package's bundled `LICENSE`,
   confirm the real license, and add `"<package>": "<SPDX>"` to `resolvedUnknowns`
   (or `allow` the SPDX if it is new).
3. **The license is non-permissive but acceptable for a documented reason**
   (build-only tooling, a scoped source-available dependency, an elected dual
   license) → add an `exceptions` entry with a clear `reason` and `scope`
   (`build-tooling` or `runtime`). Set `notice: true` if the license requires its
   text be reproduced downstream. **Waivers are an owner/maintainer decision** —
   flag it in the PR; don't self-approve a copyleft runtime dependency.

**Attribution.** [`THIRD-PARTY-LICENSES.md`](./THIRD-PARTY-LICENSES.md) (the
Apache-2.0 §4 manifest, pointed to by [`NOTICE`](./NOTICE)) is generated and
drift-checked in CI. If a dependency change moves it, regenerate and commit:

```bash
pnpm generate:notices   # writes THIRD-PARTY-LICENSES.md
pnpm validate:notices   # what CI runs; fails if the committed file is stale
```

Every `notice: true` waiver has its full license text embedded at the end of the
manifest. Background and the per-package waiver rationale live in [`LICENSING.md`](./LICENSING.md).

## Contributor License Agreement (CLA)

> ⚠️ **DRAFT — pending legal review.** The CLA terms and process below are not
> final until an attorney has reviewed them, and are not yet the operative
> agreement. Status is tracked in OpenThrottle.

Inbound contributions are governed by a **Contributor License Agreement**:

- **Individuals** sign the Individual CLA (ICLA): you grant the project a
  copyright and patent license to your contribution while retaining ownership of
  your work.
- **Contributing on behalf of an employer** additionally requires a Corporate
  CLA (CCLA) signed by an authorized representative.

Signing is a one-time step per contributor (and per company). Until the CLA
automation is approved and wired up, a maintainer will coordinate signing on
your first PR.

## Code of Conduct & Security

- **Code of Conduct** — participation is governed by our
  [Code of Conduct](./CODE_OF_CONDUCT.md).
- **Security** — do **not** open public issues for vulnerabilities; follow
  [SECURITY.md](./SECURITY.md) for private disclosure.

## Going deeper

- [MONOREPO.md](./MONOREPO.md) — architecture, applications vs packages,
  generators, dependency management, full-workspace builds, and the no-build
  (source-first) projects.
- [docs/monorepo/NX/tags.md](./docs/monorepo/NX/tags.md) — the required project
  tags (`name` / `type` / `production` / `technology`); validate with
  `pnpm nx:validate-tags`.
- [docs/monorepo/CI-quality-gates.md](./docs/monorepo/CI-quality-gates.md) — the
  CI gates, `typecheck` vs `test`, and the local commands that mirror CI.
- [docs/monorepo/ci-cost.md](./docs/monorepo/ci-cost.md) — what CI costs and why,
  what it costs to re-enable a disabled workflow, and the checklist to run
  through **before** adding a job, changing a `runs-on`, or adding a schedule.
  Read this first if you are touching `.github/workflows`.
- [docs/monorepo/Knip.md](./docs/monorepo/Knip.md) — dead-code checks and the
  `@public` export convention.
- [applications/openthrottle-workbench/README.md](./applications/openthrottle-workbench/README.md)
  — the Storybook host for `@openthrottle/react-router-shadcn`
  (`pnpm nx run openthrottle-workbench:dev`). Often the quickest check on a
  component change, and the only place to see the library across every theme in
  the registry. It consumes the source-first shadcn package's `src/` directly
  through Vite and takes **no `build` dependency** on it — do not add a `build`
  target to that package. Stories live beside their components inside the
  package, never in the workbench; scaffold them with
  `NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react --subGenerator=story --destination=@openthrottle/react-router-shadcn --name=<Name>`.
- [docs/monorepo/component-primitive-shape.md](./docs/monorepo/component-primitive-shape.md)
  — the enforced shape every authored React component follows (derived from the
  `@tools/generators` template); scaffold with the generator and run
  `pnpm run audit:component-shape`. The strict audit
  (`pnpm run audit:component-shape:strict`) is a **commit gate** — it runs at
  pre-commit, pre-push, and CI on one identical command; fix any R4/R5 violation
  rather than bypassing with `--no-verify`.
- [docs/monorepo/route-primitive-shape.md](./docs/monorepo/route-primitive-shape.md)
  — the routing-layer sibling of the component shape: keeps React Router route
  modules under `app/routes/*.tsx` thin (only the framework surface + type
  aliases), hoisting module-scope helpers/config/data into
  `app/routing/<area>/{utils,config,data,hooks}`. Enforced by the
  `openthrottle/route-primitive-shape` ESLint rule, currently at **`warn`**
  during rollout. A repo-wide inventory / future gate mirrors the component
  audit: `pnpm run audit:route-shape` (report-only) and
  `pnpm run audit:route-shape:strict` (exit non-zero on R1/R3). The strict
  audit is **not** wired into `check:local` yet — the baseline still has route
  files to remediate; wire it in (and flip the rule to `error` per app) once an
  app's routes are clean, then fix violations rather than bypassing with
  `--no-verify`.
- [docs/Skills.md](./docs/Skills.md) — agent skills and rules (`.agents/` is the
  source of truth; run `ot-skill-sync`, never hand-edit generated trees).
