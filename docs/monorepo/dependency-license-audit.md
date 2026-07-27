# Dependency license audit — resolving the 10 "Unknown" packages

_Last updated: 2026-07-27 · Tracked in OpenThrottle plan `956e3522-e172-405e-9b9c-63532a718a76`_

`pnpm licenses list` bucketed **10 installed packages as `Unknown`**. "Unknown"
means pnpm could not read a machine-detectable SPDX id from the package's
`license` field — **not** that the package is unlicensed. Every one of these
ships a real license; the field was either absent or non-SPDX (e.g.
`"SEE LICENSE IN LICENSE.txt"`).

This document records the manual verification of each (from the bundled
`LICENSE`/`README` text and provenance), the confirmed SPDX id, and the verdict.
It is the input the license-compliance automation
(plan `4b527648-b5ef-43b3-9bf4-b4f253ab09d6`) should consume to seed its
**allowlist** and **exceptions/waiver** list so these stop surfacing as
`Unknown`. See also root [`LICENSING.md`](../../LICENSING.md).

## Summary

- **6 permissive, no action** — MIT / Apache-2.0 / Unlicense. Add to allowlist.
- **1 permissive (MIT), no action** — `@schedule-x/resize`.
- **2 build/publish-tooling waivers** — Microsoft `@vscode/vsce-sign*`
  (proprietary EULA, never shipped).
- **2 runtime waivers** — `@paper-design/shaders*` (PolyForm Shield 1.0.0,
  source-available non-compete). **Waived & allowlisted** per owner decision
  (2026-07-27); attribution obligation noted below.

Nothing is genuinely unlicensed, and nothing copyleft (AGPL/GPL/LGPL) or
otherwise disallowed was hiding in the `Unknown` bucket.

## Findings

| Package                          | Version | Confirmed SPDX                     | Evidence                                                             | Shipped in product?                              | Verdict      |
| -------------------------------- | ------- | ---------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------ | ------------ |
| `@browserbasehq/sdk`             | 2.10.0  | `Apache-2.0`                       | Bundled LICENSE = verbatim Apache-2.0                                | Transitive (via `@browserbasehq/stagehand`)      | ✅ Allowlist |
| `@schedule-x/resize`             | 3.7.3   | `MIT`                              | Bundled LICENSE = verbatim MIT (© 2023 Tom Österlund)                | Yes (`packages/react-router-scheduling`)         | ✅ Allowlist |
| `fast-shallow-equal`             | 1.0.0   | `Unlicense`                        | Bundled UNLICENSE (public domain)                                    | Transitive                                       | ✅ Allowlist |
| `pause`                          | 0.0.1   | `MIT`                              | MIT text in `Readme.md` (no LICENSE file; © 2012 TJ Holowaychuk)     | Transitive                                       | ✅ Allowlist |
| `react-universal-interface`      | 0.6.2   | `Unlicense`                        | Bundled UNLICENSE (public domain)                                    | Transitive                                       | ✅ Allowlist |
| `union`                          | 0.5.0   | `MIT`                              | Bundled MIT (© 2010 Charlie Robbins & contributors)                  | Transitive                                       | ✅ Allowlist |
| `@vscode/vsce-sign`              | 2.0.9   | `LicenseRef-Microsoft-vsce-sign`   | Bundled LICENSE.txt = Microsoft Software License Terms (proprietary) | No — build/publish tooling                       | 🟡 Waiver    |
| `@vscode/vsce-sign-darwin-arm64` | 2.0.6   | `LicenseRef-Microsoft-vsce-sign`   | Bundled LICENSE.txt = Microsoft Software License Terms (proprietary) | No — build/publish tooling                       | 🟡 Waiver    |
| `@paper-design/shaders`          | 0.0.76  | `LicenseRef-PolyForm-Shield-1.0.0` | Bundled LICENSE = verbatim PolyForm Shield 1.0.0                     | Yes (transitive peer of shaders-react)           | 🟡 Waiver    |
| `@paper-design/shaders-react`    | 0.0.76  | `LicenseRef-PolyForm-Shield-1.0.0` | Bundled LICENSE = verbatim PolyForm Shield 1.0.0                     | Yes (`MeshGradient` in `react-router-ui-global`) | 🟡 Waiver    |

## Waivers / exceptions (with rationale)

### `@vscode/vsce-sign`, `@vscode/vsce-sign-darwin-arm64` — Microsoft proprietary EULA (build tooling)

- **License:** Microsoft Software License Terms ("MICROSOFT VSCE-SIGN") —
  proprietary; use permitted only "with Visual Studio Products and Services to
  develop and test your applications"; standalone redistribution forbidden.
- **Provenance:** transitive via `@vscode/vsce@3.9.1` (the VS Code extension
  packaging/publish CLI), pulled in by `packages/vscode-openthrottle`.
- **Why it's fine:** used only as build/publish tooling (`vsce package` /
  `vsce publish`) — never imported into shipped runtime code and not
  redistributed in any product bundle. Packaging a VS Code extension is exactly
  the use the license permits. Its native postinstall build is already gated off
  (`pnpm-workspace.yaml` → `allowBuilds: '@vscode/vsce-sign': false`).
- **Hygiene note (non-blocking):** `@vscode/vsce` is under `dependencies` of
  `vscode-openthrottle`; it would be more correct as a `devDependency`, but it
  does not enter the shipped `.vsix` runtime either way.

### `@paper-design/shaders`, `@paper-design/shaders-react` — PolyForm Shield 1.0.0 (runtime)

- **License:** [PolyForm Shield License 1.0.0](https://polyformproject.org/licenses/shield/1.0.0) —
  source-available, **non-permissive, non-OSI**. Grants broad use rights with a
  single carve-out: no **"Competing Use"** (using the software to build/offer a
  product or service that competes with the licensor's).
- **Usage:** `@paper-design/shaders-react` is a direct catalog dependency of
  `packages/react-router-ui-global`, imported as `MeshGradient` in
  `src/components/GradientMesh.tsx` — a decorative auth-screen gradient
  background. `@paper-design/shaders` is its transitive peer.
- **Decision (owner, 2026-07-27): WAIVE & ALLOWLIST** as a documented exception,
  no code change. The Competing-Use restriction is scoped to competing with
  **paper.design** (a design-tooling company); OpenThrottle is a developer
  task-runner/platform and does not compete in that domain, so both first-party
  use and realistic downstream forks are permitted.
- **Obligation:** PolyForm §Notices requires that anyone receiving the software
  also receives the license text (and any `Required Notice:` lines). Ensure the
  generated NOTICE / THIRD-PARTY-LICENSES file (license-automation plan, task
  "Generate & commit NOTICE") includes the PolyForm Shield text for these two
  packages.
- **Revisit if:** OpenThrottle ever moves into design/graphics tooling that
  could be construed as competing with paper.design, or if these packages stop
  being merely decorative.

## Seed for the license-automation allowlist

When the license-check policy (plan `4b527648`) is implemented, seed it from the
block below. `allow` are SPDX ids to permit outright; `exceptions` are
package-scoped waivers that override an otherwise-flagged license.

```json
{
  "allow": ["Apache-2.0", "MIT", "Unlicense"],
  "resolvedUnknowns": {
    "@browserbasehq/sdk": "Apache-2.0",
    "@schedule-x/resize": "MIT",
    "fast-shallow-equal": "Unlicense",
    "pause": "MIT",
    "react-universal-interface": "Unlicense",
    "union": "MIT"
  },
  "exceptions": [
    {
      "package": "@vscode/vsce-sign",
      "license": "LicenseRef-Microsoft-vsce-sign",
      "reason": "Microsoft proprietary EULA; build/publish tooling via @vscode/vsce, not shipped in any product bundle.",
      "scope": "build-tooling"
    },
    {
      "package": "@vscode/vsce-sign-darwin-arm64",
      "license": "LicenseRef-Microsoft-vsce-sign",
      "reason": "Microsoft proprietary EULA; build/publish tooling via @vscode/vsce, not shipped in any product bundle.",
      "scope": "build-tooling"
    },
    {
      "package": "@paper-design/shaders",
      "license": "LicenseRef-PolyForm-Shield-1.0.0",
      "reason": "Source-available non-compete; competing use scoped to paper.design's domain, not OpenThrottle's. Owner-approved waiver 2026-07-27. Requires NOTICE attribution.",
      "scope": "runtime",
      "notice": true
    },
    {
      "package": "@paper-design/shaders-react",
      "license": "LicenseRef-PolyForm-Shield-1.0.0",
      "reason": "Source-available non-compete; competing use scoped to paper.design's domain, not OpenThrottle's. Owner-approved waiver 2026-07-27. Requires NOTICE attribution.",
      "scope": "runtime",
      "notice": true
    }
  ]
}
```

## Method (reproduce)

```bash
# Locate each package in the pnpm store and read its real license text:
find node_modules/.pnpm -maxdepth 1 -type d -iname '*<pkg>*'
cat node_modules/.pnpm/<dir>/node_modules/<pkg>/LICENSE        # or LICENSE.txt / README
node -p "require('<path>/package.json').license ?? 'ABSENT'"   # why pnpm said Unknown
```
