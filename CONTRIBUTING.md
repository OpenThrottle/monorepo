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
- [docs/monorepo/Knip.md](./docs/monorepo/Knip.md) — dead-code checks and the
  `@public` export convention.
- [docs/Skills.md](./docs/Skills.md) — agent skills and rules (`.agents/` is the
  source of truth; run `skill-sync`, never hand-edit generated trees).
