# @openthrottle/\* Packages: Naming Scheme and Initial Set

**Plan:** OpenThrottle rebrand: naming exploration (OpenThrottle plan `55515309-02bd-4264-8326-c5b8efd614cb`).
**Task:** @openthrottle/\* packages: naming scheme and initial set.
**Criteria:** The naming criteria and the marketing / portal / API naming write-ups were companion docs of the rebrand plan and are not in the repo; the plan itself (`55515309-02bd-4264-8326-c5b8efd614cb`) is the surviving record.
**Context:** Marketing site `openthrottle.ai`, Developer Portal `developers.openthrottle.ai`, API `api.openthrottle.ai`.

---

## 1. Naming scheme

### Scope and format

- **Scope:** `@openthrottle`. One scope for all OpenThrottle npm packages; aligns with GitHub org (OpenThrottle), domain (openthrottle.ai), and naming criteria (same root everywhere).
- **Package names:** Lowercase, hyphenated (kebab-case). Examples: `@openthrottle/core`, `@openthrottle/api-client`.
- **Conventions:**
  - Prefer **short, clear names** that match the surface (e.g. `api-client` for the API SDK).
  - Avoid redundant scope in the name (e.g. `@openthrottle/openthrottle-core` is redundant; use `@openthrottle/core`).
  - For MCP servers and product surfaces, name by **function** (e.g. `openthrottle-mcp` for the OT plans/tasks/docs MCP server).

### Rationale

- **Consistency:** Matches the pattern used in naming criteria and in references from the API docs (`@openthrottle/api-client`).
- **Discoverability:** One scope makes it easy to find all OpenThrottle packages on npm (`npmjs.com/org/openthrottle`).
- **Reserve early:** Claim the scope and initial package names on npm as soon as the rebrand is decided to avoid squatting.

---

## 2. Initial set: packages to publish and reserve

The following table lists the **initial set** of `@openthrottle/*` packages to reserve (and eventually publish). Reserve by creating the npm org (if not already claimed) and publishing a minimal package or using npm’s “claim scope” flow for each name.

| Package                      | Purpose                                                                                              | Current / source                                                | Reserve?                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------ |
| **@openthrottle/core**       | Shared types, config, or utilities used by other OpenThrottle packages. Optional minimal core layer. | New or extract from existing OpenThrottle libs.                 | Yes                      |
| **@openthrottle/mcp**        | Plans/tasks MCP server (OpenThrottle knowledge base: plans, tasks, semantic search, activity).       | `@openthrottle/openthrottle-mcp` (`packages/openthrottle-mcp`). | Yes                      |
| **@openthrottle/api-client** | Official SDK for the OpenThrottle API (api.openthrottle.ai).                                         | New; the API surface is `api.openthrottle.ai`.                  | Yes                      |
| **@openthrottle/cli**        | CLI tooling (e.g. plan/task workflows, link-merge).                                                  | Potential extraction from tools/workflows or new CLI.           | Yes (reserve for future) |

### Optional / later (do not reserve in initial set unless needed)

- **@openthrottle/nestjs-repositories** — NestJS repositories for OpenThrottle backend. Current `@openthrottle/nestjs-repositories`. Can reserve later if we publish backend packages.

---

## 3. Availability and next steps

- **npm scope:** Confirm or create the **@openthrottle** org at [npmjs.com/org/openthrottle](https://www.npmjs.com/org/openthrottle). Publishing the first package under the scope claims it.
- **Reserve names:** For each package in the initial set, either (a) publish a minimal placeholder (e.g. `{"name": "@openthrottle/core", "version": "0.0.0-reserved"}) or (b) rely on org claim and document the intended names in this doc so we use them consistently when we publish.
- **Rebrand steps:** When implementing the rebrand, update each current package’s `package.json` `name` from `@xxxxx/*` or `@openthrottle/ai-mcp` to the corresponding `@openthrottle/*` name; update imports and docs accordingly. Do not rename on npm until release strategy (e.g. deprecate old names, publish new names) is decided.

This recommendation feeds into the final naming matrix (see plan task "Synthesize final naming matrix and update plan summary").
