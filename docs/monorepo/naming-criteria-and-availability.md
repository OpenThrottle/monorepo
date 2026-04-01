# Naming Criteria and Availability Rules

This document defines how we choose and validate names for products in this monorepo (e.g. ex-RocketCMS, ex-Cortex) and how we ensure consistent availability across X (Twitter), GitHub, and NPM.

## 1. Names must hint at purpose

- **CMS / content / product (ex-RocketCMS):** Names should evoke content management, publishing, or product delivery. Avoid generic or unrelated terms.
- **Plans / knowledge base / MCP (ex-Cortex):** Names should evoke planning, tasks, knowledge, or tooling/APIs (e.g. MCP). Avoid names that sound like a CMS or unrelated product.

We use one coherent naming scheme so that from the name alone, someone can infer whether it’s the CMS product or the plans/knowledge-base product.

## 2. Same root or pattern everywhere (no mix)

We require **one coherent naming scheme** across all public identities:

- **X (Twitter) handle:** e.g. `@fooproduct` or `@foo_hq`
- **GitHub organization:** e.g. `github.com/fooproduct` or `github.com/foo-hq`
- **NPM scope/organization:** e.g. `@fooproduct/*` or `@foo-hq/*`

**Rule:** Do **not** mix roots. For example, do not use `@foo` on X, `github.com/bar` for GitHub, and `@baz` on NPM. Pick one root (or one pattern, e.g. `foo-cms` and `foo-plans`) and use it consistently for that product across X, GitHub, and NPM.

- For **two products** (CMS vs plans/knowledge base), we may use:
  - One umbrella root with suffixes (e.g. `foo-cms`, `foo-plans`), or
  - Two distinct roots that each follow the same rule (same root per product across X, GitHub, NPM).

## 3. How to check availability

Before shortlisting or finalizing a name, check availability in all three places.

### X (Twitter) handle

- Go to [twitter.com](https://twitter.com) and try to open or search for `@<handle>`.
- Alternatively use [https://twitter.com/<handle>](https://twitter.com/) (replace `<handle>` with the desired handle). If the account doesn’t exist, the handle may be available (Twitter’s signup will confirm at claim time).
- No official API for “is this handle available”; manual or signup-flow check is required.

### GitHub organization

- Open `https://github.com/<orgname>`. If you get a 404, the organization name is likely available.
- To create an org: GitHub → profile menu → **Organizations** → **New organization**, then enter the name; the UI will show if it’s taken.

### NPM scope/organization

- **Scope:** NPM packages are scoped as `@scope/package-name`. The scope is the “org” for NPM.
- Check if a scope is taken:
  - Try creating a package with that scope: `npm init --scope=<scope>` (use the scope without `@`), or
  - Visit `https://www.npmjs.com/org/<scope>` (or search for `@<scope>` on npmjs.com). If the org/scope doesn’t exist, it may be available.
- Claim by publishing the first package under that scope (e.g. `npm publish --access=public` for a new scope).

### Summary table (to fill when checking candidates)

| Name (candidate) | X handle      | GitHub org   | NPM scope   | Notes |
|------------------|---------------|--------------|-------------|--------|
| *(example)*      | @foo available| foo available| @foo available | Same root everywhere |

Use this pattern when documenting shortlisted names so we can see at a glance that the same root is used and available on X, GitHub, and NPM.

## References

- Plan: *Ideate new names for RocketCMS and Cortex* (Cortex plan; naming criteria and availability rules).
- Follow-up tasks: ideate candidates for ex-RocketCMS and ex-Cortex, then check availability and document final choices.
