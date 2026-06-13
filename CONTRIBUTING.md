# Contributing to the Monorepo

Thank you for your interest in contributing! This document provides guidelines and best practices for contributing to this monorepo.

For information about monorepo structure, organization, and project setup, see [MONOREPO.md](./MONOREPO.md).

## Project Tags

All NX projects in this monorepo must have appropriate tags. Tags enable project filtering, consistent organization, release management, and proper tooling workflows.

### Tag Types

Projects in this monorepo use four primary tag types:

1. **`name:`** - Identifies the project name
2. **`type:`** - Categorizes the project type (`application`, `package`, or `tool`)
3. **`production:`** - Indicates production readiness
4. **`technology:`** - Identifies the technology stack

### Tag Format

Tags follow the pattern `<type>:<value>`:

```json
{
  "nx": {
    "tags": [
      "name:@openthrottle/xxxxxx",
      "type:application",
      "production:true",
      "technology:react",
      "technology:react-router"
    ]
  }
}
```

### Tag Usage in Workflows

Tags are used throughout the monorepo for:

- **Release Management**: The `nx.json` release configuration uses `tag:type:application` and `tag:type:package` to determine which projects to release
- **Project Filtering**: Filter projects by technology, type, or production status
- **Task Execution**: Run tasks on specific project subsets using tag filters
- **Organization**: Group and discover related projects

### Required Tags

Every project must have:

- **`name:`** tag - The project identifier (matches package name or directory name)
- **`type:`** tag - One of `type:application`, `type:package`, or `type:tool`
- **`production:`** tag - Either `production:true` or `production:false`
- **At least one `technology:`** tag - See [Technology Tags](#technology-tags) section below

### Tag Examples

**React Router Application:**

```json
{
  "nx": {
    "tags": [
      "name:openthrottle-yyy",
      "type:application",
      "production:true",
      "technology:react",
      "technology:react-router"
    ]
  }
}
```

**NestJS API Application:**

```json
{
  "nx": {
    "tags": [
      "name:openthrottle-api",
      "type:application",
      "production:true",
      "technology:nestjs"
    ]
  }
}
```

### Tag Combinations

Projects can have multiple tags of the same type when appropriate:

- **Multiple technology tags**: Projects using multiple technologies should have all relevant `technology:` tags
- **Single type tag**: Projects should have exactly one `type:` tag
- **Single production tag**: Projects should have exactly one `production:` tag
- **Single name tag**: Projects should have exactly one `name:` tag

## Technology Tags

All NX projects in this monorepo must have appropriate technology tags. Technology tags enable project filtering, consistent organization, and proper tooling workflows.

### Quick Reference

- **Reference Document**: See [docs/monorepo/NX/tags.md](docs/monorepo/NX/tags.md) for complete tag definitions
- **Validation**: Run `pnpm nx:validate-tags` to check all projects
- **Format**: Tags follow the pattern `technology:<value>`

### Tagging Rules

1. **Always tag by primary technology**: Use the most specific tag that applies
2. **Use multiple tags when appropriate**: If a project uses multiple technologies, tag it with all relevant tags
3. **Don't duplicate**: Don't use `technology:typescript` if the project already has a framework tag (React, NestJS, etc.)
4. **Be consistent**: Use the exact tag values listed in the reference document
5. **Tag all projects**: Every project should have at least one technology tag

### Examples

**React Router Application:**

```json
{
  "nx": {
    "tags": ["technology:react", "technology:react-router", "type:application"]
  }
}
```

**TypeScript-only Package:**

```json
{
  "nx": {
    "tags": ["technology:typescript", "type:package"]
  }
}
```

**Isomorphic Node library (client + server):**

```json
{
  "nx": {
    "tags": ["technology:nodejs", "type:package"]
  }
}
```

Use `technology:nodejs` only for shared libraries consumed on both server and client (for example `@openthrottle/nodejs-graphql`) or the workspace root. Node-only TypeScript packages use `technology:typescript` — never both on one project. See [docs/monorepo/NX/tags.md](docs/monorepo/NX/tags.md).

**NestJS API:**

```json
{
  "nx": {
    "tags": ["technology:nestjs", "type:application"]
  }
}
```

### Validation

Before committing changes, ensure your project tags are valid:

```bash
pnpm nx:validate-tags
```

This script will:

- Identify projects missing technology tags
- Validate tag values against the reference document
- Report any inconsistencies

### Adding Tags to New Projects

When creating a new project:

1. Determine the primary technology stack
2. Consult the [technology tags reference](docs/monorepo/NX/tags.md)
3. Add appropriate `technology:*` tags to the project's `package.json` or `project.json`
4. Run `pnpm nx:validate-tags` to verify

### Updating Tags

If you need to update technology tags for an existing project:

1. Update the tags in the project's configuration file
2. Run `pnpm nx:validate-tags` to verify
3. Ensure the tags accurately reflect the project's technology stack

## Agent assets (skills & rules)

OpenThrottle uses **`.agents/` as the single source of truth** for skill and rule bodies. Editor folders (`.cursor/`, `.claude/`, repo-root `skills/`) are **symlink views** only — edit `.agents/` in your PR.

| Asset              | Write (SSOT)                                        | Load (symlink view)                             |
| ------------------ | --------------------------------------------------- | ----------------------------------------------- |
| Skills             | [`.agents/skills/<slug>/SKILL.md`](.agents/skills/) | `.cursor/skills/`, `.claude/skills/`, `skills/` |
| Rules              | [`.agents/rules/**/*.mdc`](.agents/rules/)          | `.cursor/rules/`                                |
| Personas / prompts | `.agents/personas/`, `.agents/prompts/`             | Ralph `--prompt-file`                           |

**Workflow:**

1. Add or change content under `.agents/skills/` or `.agents/rules/` only.
2. Run `pnpm nx run monorepo:check-agent-assets-ssot` before pushing (also: `pnpm run check:local:agent-assets`).
3. Open a git PR — **do not** edit agent assets in the `custom_prompts` DB; disk is write authority and DB ingest is plan 1.5.

**Editor-native (not symlinked SSOT):** `.cursor/hooks.json`, local `.cursor/mcp.json` (copy from `mcp.json.example`), `.cursor/worktrees.json`, generated `.cursor/rules/nx-rules.mdc` (gitignored). See [docs/monorepo/agent-editor-folders.md](docs/monorepo/agent-editor-folders.md) for the full tree.

**Windows clones:** Enable symlink support — `git config core.symlinks true` — or clone inside WSL. Without symlinks, editor trees may appear as plain files and CI will fail.

**Recreate symlinks** after adding a skill slug (from repo root):

```bash
ln -s ../../.agents/skills/<slug> .cursor/skills/<slug>
ln -s ../../.agents/skills/<slug> .claude/skills/<slug>
ln -s ../.agents/skills/<slug> skills/<slug>
```

For rules, symlink each new `.mdc` from `.agents/rules/` into the matching `.cursor/rules/` path. Details: [agent-assets-canonical-layout.md](docs/monorepo/agent-assets-canonical-layout.md).

## General Guidelines

- **Code style and preferences:** Follow the coding conventions defined in [`.agents/rules/`](.agents/rules/). See [.agents/rules/README.md](.agents/rules/README.md) for the full style guide: `coding/` holds TypeScript/JS and structure rules; `commands/` holds rules for OpenThrottle (OT), GitHub, and agents. Cursor loads the same bodies via `.cursor/rules/` symlinks — edit `.agents/rules/` only.
- Use conventional commits for commit messages
- Ensure all tests pass before submitting changes
- Update documentation when adding new features
- See [MONOREPO.md](./MONOREPO.md) for project structure and organization guidelines

### Formatting (Prettier)

Prettier configuration lives in **one place**: `prettierConfig` in [`@tools/dotfiles`](tools/dotfiles/README.md) (subpath `@tools/dotfiles/prettier-config`). The repo's single root `.prettierrc.mjs` re-exports it, and Prettier resolves that root config from every directory — **do not add per-app `.prettierrc.mjs` files**. The shared config wires `prettier-plugin-tailwindcss` and pins YAML to **single quotes**; the root `.editorconfig` matches with `quote_type = single` so editors and Prettier never fight over YAML quotes.

Format the whole repo with **`pnpm format`** and check it with **`pnpm format:check`** (these wrap `pnpm nx run monorepo:format-write` / `monorepo:format-check`). `format:check` also runs as part of `pnpm run check:local`.

### Knip and public exports

When you add or keep an export that is part of a **package public API** (see `package.json` → `exports`) or a documented cross-workspace helper, tag it with JSDoc **`@publicApi`** so Knip does not report or auto-remove it. Component prop types (`*Props`, `*Options`) do not need this tag; intentional `export` on those types is expected. See [docs/monorepo/Knip.md](docs/monorepo/Knip.md) for the full report-vs-fix workflow. Run **`pnpm nx run monorepo:knip`** for reports only—do not run **`knip --fix-type exports`** on application UI. **`knip --fix-type dependencies`** is optional and only after reviewing the `package.json` diff.

## Nx targets: projects without `build`

As of the current workspace graph, **16 of 59** Nx projects do **not** expose a `build` target. That is intentional—not missing CI coverage. These projects are validated with **`lint`**, **`typecheck`**, **`typecheck-tests`**, and (where present) **`test`**, and their output is produced when a **consumer** runs `build`, `dev`, or Vite production bundling.

### Why React Router workspace libraries skip `build`

Most no-build packages are **`technology:react-router`** workspace libraries under `packages/react-router-*` (plus two React-related codegen/MCP helpers). They follow a **source-first** pattern:

- `package.json` **`main`**, **`module`**, and **`types`** point at **`./src/index.ts`** (TypeScript source, not a precompiled `dist/`).
- React Router applications (Vite) **transpile workspace dependencies** when you run `dev` or `build` on the app.
- Their `nx.targets` use **`__build`** and **`__build-package`** placeholders so the `@nx/js/typescript` plugin does **not** infer a library `build` target. Packages that _do_ ship compiled output use the real **`build-package`** target instead (see `nx.json` `targetDefaults`).

Do **not** add a standalone `build` target to these libraries unless you are deliberately moving them to a publishable `dist/` workflow.

### All projects without `build` (16)

| Nx project                                     | Role                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| `@openthrottle/react-router-auth`              | Shared React Router auth UI and hooks                                   |
| `@openthrottle/react-router-chat`              | Shared chat UI                                                          |
| `@openthrottle/react-router-editor`            | Monaco-based editor                                                     |
| `@openthrottle/react-router-graphql`           | GraphQL client helpers for React Router apps                            |
| `@openthrottle/react-router-notifications`     | Notifications UI                                                        |
| `@openthrottle/react-router-profiling`         | Profiling utilities                                                     |
| `@openthrottle/react-router-shadcn`            | shadcn-based primitives for OpenThrottle apps                           |
| `@openthrottle/react-router-ui`                | Shared UI components                                                    |
| `@openthrottle/react-router-ui-global`         | Global UI shell pieces                                                  |
| `@openthrottle/react-router-utils`             | Config, env, logging, metadata utilities                                |
| `@openthrottle/openthrottle-developer-codegen` | GraphQL/codegen outputs for `openthrottle-developer`                    |
| `@openthrottle/openthrottle-mcp`               | MCP-related React Router package (source consumed by apps/tools)        |
| `@openthrottle/graphql-codegen`                | Shared GraphQL codegen utilities                                        |
| `@openthrottle/openthrottle-skills`            | Skills package (TypeScript source)                                      |
| `@openthrottle/openthrottle-vscode`            | VS Code extension sources (built via extension tooling, not Nx `build`) |
| `infra`                                        | Terraform (`type:infrastructure`); no application bundle                |

The **12** projects tagged `technology:react-router` in this list are the shared UI/library layer for OpenThrottle React Router apps.

### What to run when you change these projects

1. **Package-level checks** (always applicable):

   ```bash
   pnpm nx run <project>:lint
   pnpm nx run <project>:typecheck
   pnpm nx run <project>:typecheck-tests
   # When the project defines test:
   pnpm nx run <project>:test
   ```

2. **Integration check** — run **`build`** or **`dev`** on a **consumer** React Router application (for example `openthrottle-developer`, `openthrottle-admin`) so Vite compiles your library changes end-to-end.

3. **Affected workflows** — `pnpm nx affected --target=build` will **not** schedule these 16 projects. Use **`lint`**, **`typecheck`**, and **`typecheck-tests`** on affected projects instead (as in [docs/monorepo/CI-quality-gates.md](docs/monorepo/CI-quality-gates.md)).

### Auditing the graph locally

```bash
# Projects that expose build (43 today; count may change as projects are added)
pnpm nx show projects --with-target=build

# Compare to full project list
pnpm nx show projects
```

## GraphQL schema and codegen

The API schema is **code-first** in `openthrottle-server` (NestJS `autoSchemaFile`). Consumers (React Router apps, MCP, workflows, and other packages) read the committed **`schema.gql` at the repo root**. CI fails when schema or generated client code drifts; use this checklist after changing GraphQL types, resolvers, or `.graphql` documents.

### When you change the server schema

1. **Regenerate the server copy** — Start the server so NestJS writes `applications/openthrottle-server/schema.gql` (for example `pnpm nx run openthrottle-server:dev`, wait for bootstrap, then stop).
2. **Sync the repo-root schema** — Root `schema.gql` must match the server file byte-for-byte:

   ```bash
   cp applications/openthrottle-server/schema.gql schema.gql
   ```

3. **Regenerate consumer outputs** — Run GraphQL and React Router codegen for affected projects:

   ```bash
   pnpm nx affected --target=codegen-graphql,codegen-react-router --parallel
   ```

   To refresh all production-tagged consumers in one pass:

   ```bash
   pnpm run build:graphql
   ```

4. **Commit schema and generated files** — Include `schema.gql`, `applications/openthrottle-server/schema.gql`, and any updated `__generated__` trees under apps or packages you touched.

**Schema compatibility:** Do not remove or change types on existing GraphQL fields without a migration plan. Mark unused fields **`@deprecated(reason: "...")`** instead. See [personal-general.mdc](.cursor/rules/personal-general.mdc) (API applications) and `applications/openthrottle-server/docs/SCHEMA_AUDIT.md`.

### Projects with committed GraphQL codegen

These targets read root `schema.gql` via each project’s `codegen.ts`:

| Area                    | Nx project(s)                                                                                                        | Generated output (typical)                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Developer UI            | `openthrottle-developer`, `@openthrottle/openthrottle-developer-codegen`                                             | `app/__generated__/` or package `src/__generated__/` |
| Other React Router apps | `openthrottle-admin`, `openthrottle-email`, `openthrottle-website`                                                   | `app/__generated__/`                                 |
| MCP / Ralph / workflows | `@openthrottle/openthrottle-mcp`, `@openthrottle/openthrottle-agentic-ralph`, `@openthrottle/openthrottle-workflows` | `src/__generated__/`                                 |
| Editor extension        | `@openthrottle/vscode-openthrottle`                                                                                  | extension `src/__generated__/`                       |

**CI drift guards for committed package output:** `@openthrottle/openthrottle-mcp` and `@openthrottle/openthrottle-agentic-ralph` must keep `src/__generated__/` in sync with the schema (regenerate with `pnpm nx run <project>:codegen-graphql` and commit, or CI’s `verify-graphql-codegen` fails).

Per-project watch mode during development: `pnpm nx run <project>:codegen-graphql-watch` (and `codegen-react-router-watch` for React Router apps).

### Verify locally (mirror CI)

From the repo root after `pnpm install`:

```bash
# Schema sync (root vs server)
pnpm nx run openthrottle-server:verify-graphql-schema-sync

# Package-specific generated GraphQL clients
pnpm nx run-many --target=verify-graphql-codegen \
  --projects=@openthrottle/openthrottle-agentic-ralph,@openthrottle/openthrottle-mcp

# Affected codegen + ensure working tree is clean
pnpm nx affected --target=codegen-graphql,codegen-react-router --parallel
git diff --exit-code
```

`pnpm run check:local:verify` runs the schema-sync and package verify targets; `pnpm run check:local:codegen` runs affected codegen. Full contributor parity with CI gates: `pnpm run check:local` (see [docs/monorepo/CI-quality-gates.md](docs/monorepo/CI-quality-gates.md)).

### Further reading

- [docs/monorepo/CI-quality-gates.md](docs/monorepo/CI-quality-gates.md) — P0/P1 gate commands and owners
- [applications/openthrottle-server/README.md](applications/openthrottle-server/README.md) — running the API
- [.agents/skills/openthrottle-stack/SKILL.md](.agents/skills/openthrottle-stack/SKILL.md) — server GraphQL conventions

## Testing: `typecheck-tests` versus `test`

Nx exposes two different targets for test-related work. They are **not** interchangeable.

| Target                | What it does                                                                              | Executes test bodies?                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **`typecheck-tests`** | `tsc --noEmit -p tsconfig.test.json` in the project root (see `nx.json` `targetDefaults`) | **No** — only type-checks `*.test.ts`, `*.spec.ts`, and other files included by `tsconfig.test.json` |
| **`test`**            | Vitest via `@nx/vitest:test` and each project’s `vitest.config.ts`                        | **Yes** — runs `describe` / `it` / `expect` and reports pass or fail                                 |

**`typecheck-tests` does not run Vitest and does not execute test bodies.** A green `typecheck-tests` result only means test files compile; it does not prove assertions pass or that mocks behave correctly. Use **`pnpm nx run <project>:test`** (or `pnpm nx affected --target=test`) when you need real test execution.

CI runs both at different priorities: P0 affected **`lint`**, **`typecheck`**, and **`typecheck-tests`** on every PR; P2 runs **`test`** only for phased projects (see [docs/monorepo/CI-quality-gates.md](docs/monorepo/CI-quality-gates.md)). Locally, **`pnpm run check:local`** runs affected `typecheck-tests` and affected `test` as separate steps.

## Additional Resources

- **[MONOREPO.md](./MONOREPO.md)**: Comprehensive monorepo structure, organization, and contribution guidelines
- **[Technology Tags Reference](docs/monorepo/NX/tags.md)**: Complete technology tag definitions
- **[NX Documentation](https://nx.dev/)**: Official NX documentation
- **[NX Tags Documentation](https://nx.dev/concepts/more-concepts/tags)**: NX tags and filtering

## Questions?

If you have questions about tags, project structure, or other contribution guidelines, please:

- Check the [MONOREPO.md](./MONOREPO.md) for structure and organization questions
- Review the [technology tags reference](docs/monorepo/NX/tags.md) for technology tag questions
- Review existing projects for examples
- Open an issue for clarification
