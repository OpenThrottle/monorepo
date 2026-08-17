# Licensing

OpenThrottle is **open core**: the core is licensed under the **Apache License,
Version 2.0**, and commercial/enterprise modules are reserved under a separate
**End User License Agreement (EULA)**.

> ⚠️ **Relicensing in progress — pending legal review.** This file and the
> accompanying `LICENSE.md` / `LICENSE-EULA.md` reflect the intended EULA →
> Apache-2.0 open-core relicense. They are **not final until an attorney has
> reviewed them** and the repository is published. See the plan tracked in
> OpenThrottle for status.

## At a glance

| Scope                                        | License            | Where                                   |
| -------------------------------------------- | ------------------ | --------------------------------------- |
| **Core** — everything first-party today      | **Apache-2.0**     | root & per-project `LICENSE.md`         |
| **Commercial / enterprise** — future modules | EULA (proprietary) | reserved; template in `LICENSE-EULA.md` |

As of this relicense, **all current first-party code is Apache-2.0**. There are
no commercial packages yet — the EULA is retained only as the template for
future enterprise modules (see [Open core](#open-core-why)).

## How to tell what license applies

1. **Check the project's `LICENSE.md`.** Every first-party app, package, and
   tool carries one. Today they are all Apache-2.0.
2. **Check the `license` field in the project's `package.json`.** Core projects
   declare `"license": "Apache-2.0"`.
3. **Root `LICENSE.md`** is the canonical Apache-2.0 text for the repository.
4. A future commercial package will (a) carry the EULA in its own `LICENSE.md`
   with a header noting it is **not** Apache-licensed, and (b) set its
   `package.json` `license` accordingly. None exist yet.

> **Note on per-file headers.** OpenThrottle does **not** stamp a
> `SPDX-License-Identifier` header into every source file. A file's license is
> determined by its project's `LICENSE.md` and `package.json` `license` field
> (Apache-2.0 for the core today). This keeps the license authoritative in one
> place per project without a repo-wide header on thousands of files. A future
> commercial package would likewise be identified by its own `LICENSE.md` +
> `package.json`, not a per-file EULA header.

## What is Apache-2.0 (core)

Everything first-party in the repository:

- **Applications** — `applications/*` (`openthrottle-server`,
  `openthrottle-developer`, `openthrottle-admin`, `openthrottle-email`,
  `openthrottle-website`) and the `applications/openthrottle` local-stack
  Docker/compose assets.
- **Packages** — all of `packages/*` (`@openthrottle/*`).
- **Tools** — `tools/*` (`@tools/generators`, `@tools/workflows`,
  `@tools/dotfiles`, `@tools/ollama-proxy`, `tools/caddy`).
- **Infra / root** — `infra/`, root scripts, and the monorepo root itself.

New packages scaffolded via `@tools/generators` inherit the Apache-2.0
`LICENSE.md` by default, so contributed core code never lands in a closed
edition.

## What is EULA (commercial / enterprise)

**None today.** When commercial features are built (for example SSO/SAML, audit
logging, advanced RBAC, or multi-tenant admin), they will live in their **own
dedicated packages** under the EULA (`LICENSE-EULA.md`). Keeping the boundary at
the package level is deliberate: it keeps the open core cleanly Apache-2.0.
Inbound contributions are governed by a **Contributor License Agreement (CLA)**
— see [Contributions](#contributions) below.

## Open core — why <a id="open-core-why"></a>

The goal is to build a business on OpenThrottle while maximizing adoption and
welcoming (scoped) contributions. Being comfortable with others forking or even
hosting the code rules out source-available and copyleft licenses, which exist
to prevent exactly that. A **permissive** license fits.

**Apache-2.0 over MIT** for two reasons that matter more precisely because the
code is freely forkable:

- **Patent grant** — contributors and users get an explicit patent license,
  protecting the project from patent ambushes.
- **Trademark clause (§6)** — anyone may fork the _code_, but not the
  **name or marks**. When the code is free, the brand is the moat. See
  [TRADEMARK.md](./TRADEMARK.md) for the trademark policy.

Revenue comes from a canonical hosted/SaaS version, proprietary enterprise
modules (the EULA packages above), support/SLAs, and the brand — not from
restricting the core.

Relicensing is **one-way per release**: a version shipped under Apache-2.0 stays
Apache-2.0. Future versions remain under the copyright holder's control.

## Contributions

Contributions are welcome but, while the project is early-stage, scoped to
smaller targeted fixes (bugs, docs, small well-scoped improvements); discuss
anything larger in an issue first. Inbound contributions are governed by a
**Contributor License Agreement** (individual + corporate) — **draft pending
legal review**. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Third-party dependencies

Third-party and open-source dependencies are governed by their own license
terms; nothing here supersedes them. The dependency tree is overwhelmingly
MIT/Apache/BSD/ISC — all compatible with Apache-2.0. A small number of
dependencies carry non-permissive licenses that are documented, waived
exceptions (e.g. Microsoft build-only tooling; a source-available decorative UI
dependency) rather than part of the Apache-2.0 core.

The full audit — including the resolution of every package `pnpm licenses list`
reported as `Unknown`, confirmed SPDX ids, and the waiver rationale — was completed before the public release.

This is enforced automatically: [`license-policy.json`](./license-policy.json)
declares the allowed licenses and waivers, and a CI gate
(`pnpm validate:licenses`) fails any PR that introduces a disallowed or undetected
license. Dependency attributions are aggregated into
[`THIRD-PARTY-LICENSES.md`](./THIRD-PARTY-LICENSES.md) (regenerated with
`pnpm generate:notices`). See CONTRIBUTING.md § Dependency licenses for the policy
and the waiver process.

## Files

- [`LICENSE.md`](./LICENSE.md) — Apache-2.0, the canonical license for the open core.
- [`NOTICE`](./NOTICE) — Apache-2.0 §4(d) attribution notice (project name +
  copyright holder) plus a pointer to the third-party attribution manifest and
  any notice-required dependencies.
- [`THIRD-PARTY-LICENSES.md`](./THIRD-PARTY-LICENSES.md) — generated dependency
  attribution manifest (`pnpm generate:notices`); embeds the full license text of
  notice-required dependencies.
- [`license-policy.json`](./license-policy.json) — the allowlist/waiver policy
  the CI license gate (`pnpm validate:licenses`) enforces.
- [`LICENSE-EULA.md`](./LICENSE-EULA.md) — retained EULA, the template for future
  commercial/enterprise packages.
- [`TRADEMARK.md`](./TRADEMARK.md) — trademark policy for the OpenThrottle name
  and logo (Apache-2.0 §6): what you may and may not do with the marks.
- Per-project `LICENSE.md` — the license that applies to that project.
