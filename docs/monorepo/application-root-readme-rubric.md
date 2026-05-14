# Application root README audit rubric

Use this when auditing or authoring **`applications/<nx-app-name>/README.md`** only (the Nx application root). Skip nested READMEs under `app/`, `src/`, or route folders unless they are the canonical entry doc for that deployable.

For workspace-wide Nx conventions, see [NX.md](./NX.md).

## Scope

- **In scope:** One README per Nx project with `projectType: "application"` (or `nx show projects --type=app`), at the path Nx treats as the project root—typically `applications/<name>/README.md`.
- **Out of scope:** Duplicating the full application index; deep infra Terraform or GCP runbooks (link instead).
- **Edge case:** If an application project lives outside `applications/*`, document the actual README path in that app’s README and in any aggregate index.

## What to flag and fix

| Issue                          | Examples                                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wrong stack or framework**   | Remix or Vite SPA framing when the app is **React Router**; Mongo/Feathers when the backend is **Postgres + NestJS** (or other actual stack).   |
| **Wrong repository or layout** | Clone/setup steps for another repo; paths that do not match this monorepo.                                                                      |
| **Placeholder or broken copy** | Intros trailing **“is…”**, empty purpose, lorem/TODO-only sections.                                                                             |
| **Non-canonical commands**     | Primary instructions using `npm`/`yarn`, `cd applications/foo && npm run dev`, or global `nx` without **`pnpm nx`** from the **monorepo root**. |
| **Dead or guessed targets**    | `pnpm nx run foo:bar` where `bar` is not a target for `foo`.                                                                                    |
| **Missing pairing**            | UI that needs a local API (or worker) with no **order**, **project name**, or link.                                                             |
| **Secrets in-repo**            | Real keys, tokens, or copy-paste `.env` bodies; replace with pointers to internal secrets/runbooks.                                             |

## Command documentation standard

- Show commands **from the monorepo root**.
- Use **`pnpm nx run <project>:<target>`** (this workspace standard; see [AGENTS.md](../../AGENTS.md)).
- Discover real targets before documenting:

  ```bash
  pnpm nx show project <project>
  ```

- If a target is optional, one-off, or CI-only, say so explicitly (e.g. codegen watch vs single generate).
- Prefer the same target names the project actually exposes (`dev`, `test`, `lint`, `typecheck`, `build`, codegen variants, etc.)—**do not invent** convenience aliases.

## Minimum sections (every application README)

1. **Purpose** — What the app does and for whom (one short paragraph).
2. **Run from repo root** — Primary **`pnpm nx run <project>:…`** flows for local work (`dev`, `test`, `lint`, `typecheck`, and `build` when non-obvious).
3. **Related projects** — Paired API/UI, `implicitDependencies`, or obvious graph neighbors; name the Nx project and link to its app README when useful. **Do not** paste the whole monorepo map.
4. **Environment and setup** — Link to the aggregate app index **[`applications/README.md`](../../applications/README.md)** for shared env, ports, and bootstrap when that file is maintained; otherwise link the closest doc (e.g. [local-services-and-ports.md](./local-services-and-ports.md), `docs/openthrottle/…`).
5. **Optional: Links** — Staging/production URLs, Slack, Confluence, or runbooks **when the team keeps them current**.

## Per-flavor minimum add-ons

### React Router / UI applications

- Call out whether **`dev` must run after** a specific API or service.
- Document **codegen** targets (GraphQL or other) when **`dev` / `build` depends on generated artifacts**; mention watch vs one-shot if both exist.
- Use terminology that matches the codebase (**React Router** vs legacy “Remix” only if still accurate).

### NestJS / GraphQL API applications

- Center **dev, test, lint, typecheck** on **`pnpm nx run …` from the repo root**; avoid implying developers must `cd` into the app for routine tasks unless something truly requires it.
- **Auth and secrets:** pointers only to internal docs—not full procedures in the README.
- If consumers rely on schema or generated types, mention **codegen or schema ownership** in one line.

### Special / non-standard (gateways, workers, queues, canary, Cloud Functions–style)

- **What it is** and **where it runs** (high level: k8s, Cloud Run, worker process, etc.) without copying full infra.
- **Local development limits** (what cannot run fully locally; Docker, tunnels, or queue dependencies).
- Link to **`infra/`**, deployment runbooks, or team channels instead of inlining architecture.

## Cross-checks

- **`applications/README.md`:** Per-app commands and “how to run” should not contradict the aggregate index; fix mismatches in the **smallest correct place** (per-app README for exact targets; index for the high-level map and URLs).
- **Validation:** After edits, grep the README for `nx run` / `pnpm nx run` and confirm each target exists for that project via `pnpm nx show project <project>`.

## Quick validation checklist

- [ ] Purpose is specific and not placeholder text.
- [ ] Documented **`pnpm nx run`** lines match **`pnpm nx show project <project>`**.
- [ ] Paired apps and startup order are clear where relevant.
- [ ] Env/setup defers to **`applications/README.md`** or another canonical doc instead of duplicating the index.
- [ ] No secrets; stack names match the current codebase.
