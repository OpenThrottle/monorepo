# Monorepo Structure and Contribution Guidelines

This document provides comprehensive guidance on the monorepo structure, organization rationale, and contribution guidelines.

**Related Documentation:**

- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Project tags, technology tags, and contribution guidelines
- **[docs/monorepo/NX/tags.md](./docs/monorepo/NX/tags.md)**: Complete technology tag reference

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Development Loop: Three Planes](#development-loop-three-planes)
- [Directory Structure](#directory-structure)
- [Applications vs Packages](#applications-vs-packages)
- [Package Organization](#package-organization)
- [Naming Conventions](#naming-conventions)
- [Creating New Projects](#creating-new-projects)
- [Dependency Management](#dependency-management)
- [Testing Requirements](#testing-requirements)
- [Project Setup Examples](#project-setup-examples)
- [Additional Resources](#additional-resources)

## Architecture Overview

This monorepo leverages [NX](https://nx.dev/) for both **task running** and **package publishing**. This dual approach enables:

- **Internal Development**: Applications and packages can reference each other seamlessly
- **External Publishing**: Packages can be published to npm for use in external projects
- **Unified Tooling**: Consistent build, test, and lint processes across all projects
- **Dependency Management**: Centralized dependency resolution via pnpm workspaces

### Key Principles

1. **Applications** are standalone, deployable projects (web apps, APIs, mobile apps)
2. **Packages** are reusable libraries shared across applications or published externally
3. **Domain Organization**: Packages can be organized by domain/application when they're application-specific
4. **Shared Packages**: Cross-cutting concerns live in top-level package directories

## Development Loop: Three Planes

Local development decouples three planes so restarting one never disturbs the
others:

- **DATA plane** — Postgres (`:6010`) + Redis (`:6011`) via
  `pnpm run database:start`. Always-on docker containers, **shared across every
  checkout and worktree**. Worktrees do not run their own databases (see
  [docs/monorepo/worktree-port-allocation.md](docs/monorepo/worktree-port-allocation.md)).
- **APP PROCESS plane** — the code you're iterating on. Two intentional,
  first-class modes:
  - **Native mode** (fast OT-dev inner loop): `pnpm run dev:native` runs
    `openthrottle-server` on the host with the SWC builder (~150 ms rebuilds)
    against the shared data plane. Use
    `pnpm run dev:native:split` to run it as **two processes** — API in watch
    mode (`PROCESS_ROLE=api`) and a BullMQ worker (`PROCESS_ROLE=worker`, no
    watch) — so editing API code never restarts an in-flight job or detaches
    the worker's debugger. `PROCESS_ROLE=all` (the default everywhere else)
    keeps today's single-process behavior.
  - **Docker fidelity mode** (what self-hosters actually run):
    `docker compose --profile dev up` (plus the worktree override files when in
    a worktree). Use it to validate workspace mounting, the host-exec bridge,
    and prod parity — not for day-to-day iteration.
- **TOOLING plane** — the OpenThrottle MCP (plans/tasks CRUD for agents) pins
  to the **stable** (main-checkout) server, not your worktree's
  server-under-test, so restarting the SUT never interrupts tooling. CRUD is
  checkout-agnostic because Postgres is shared; opt into your worktree's
  server with `OT_MCP_TARGET=worktree`.

Because every checkout shares one Redis, BullMQ queues are **namespaced per
checkout** (`OT_QUEUE_PREFIX`, derived from the worktree's
`OT_CONTAINER_PREFIX`, default `bull` on the main checkout) — a worktree's
worker can only consume its own checkout's jobs, never another's. Execution
isolation lives in that prefix, not in server or MCP targeting.

## Directory Structure

```bash
monorepo/
├── applications/          # Standalone deployable applications
├── databases/             # Database schemas and migrations
├── docs/                  # Documentation
│   └── monorepo/          # Monorepo-specific documentation
├── infra/                 # Infrastructure as code
├── packages/              # Reusable libraries and packages
├── scripts/               # Utility scripts (TypeScript via tsx; POSIX shims for pre-install bootstrap)
└── tools/                 # Development tools and generators
```

### Key Directories Explained

- **`applications/`**: Contains all standalone, deployable applications. Each application is a complete project that can be built and deployed independently.
- **`docs/monorepo/`**: Contains monorepo-specific documentation including technology tags reference, dependency relationships, and NX documentation.
- **`packages/`**: Contains reusable libraries shared across applications and used between packages.
- **`scripts/`**: Utility scripts for common tasks like setup, validation, and automation. **Convention:** new repo scripts are TypeScript, executed directly via `tsx` (wired through root `package.json` scripts), import shared helpers from `scripts/lib/` (chalk logger, .env reader, exec/arg helpers), and ship a Vitest spec in `scripts/__tests__/` for their extractable logic (export pure functions; keep `main()` thin). The exception is the pre-install bootstrap: anything that must run before `pnpm install` has populated node_modules (`setup.sh`, the `setup_worktree.sh` / `.worktree/teardown.sh` / `setup_environment.sh` / `run-openthrottle-mcp.sh` shims, `vercel.sh`) stays a thin POSIX shim that resolves `tsx` (from this checkout, falling back to the primary checkout for fresh worktrees) and delegates to the `.ts`. Scripts with a stdout contract (the WorktreeCreate hook, MCP stdio launchers, anything piped) construct their logger with `stream: process.stderr` so stdout stays clean.
- **`tools/`**: Development tools including NX generators and custom tooling.

## Applications vs Packages

### When to Create an Application

Create an **application** when you need:

- ✅ A standalone, deployable service or app
- ✅ User-facing applications (web, mobile, desktop)
- ✅ Backend APIs or services
- ✅ Independent deployment lifecycle
- ✅ Own domain/subdomain or deployment target

**Examples:**

- `openthrottle-developer` - React Router web application (deployed to https://developer.openthrottle.ai)
- `openthrottle-server` - React Router web application (deployed to https://api.openthrottle.ai)

### When to Create a Package

Create a **package** when you need:

- ✅ Reusable code shared across multiple applications
- ✅ A library that could be published to npm
- ✅ Shared utilities, components, or services
- ✅ Code that doesn't have its own deployment target
- ✅ Domain-specific logic that multiple apps consume

**Examples:**

- `@openthrottle/react-router-shadcn` - React UI components for OpenThrottle web apps
- `@openthrottle/nestjs-auth` - NestJS authentication utilities

### Decision Flowchart

```bash
# Is it a standalone, deployable service/app?
├─ YES → Create in applications/
│         └─ Examples: web apps, APIs, mobile apps
│
└─ NO → Is it reusable code shared across projects?
        ├─ YES → Create in packages/
        │         └─ Examples: utilities, components, libraries
        │
        └─ NO → Reconsider: Should this be part of an existing application/package?
```

## Package Organization

### Package Discovery

Before creating a new package, check if similar functionality exists:

1. **Search existing packages**: Look for similar functionality in `packages/`
   <!-- 2. **Check domain packages**: Review domain-specific packages (e.g., `packages/`) -->
   <!-- 3. **Review shared packages**: Check top-level shared packages -->
2. **Consider extending**: If similar functionality exists, consider extending it rather than creating new

## Naming Conventions

### Applications

- **Format**: `kebab-case`
- **Examples**: `openthrottle-admin`, `openthrottle-developer`, `openthrottle-server`
- **Location**: `applications/<name>/`

### Packages

- **Scope**: `@openthrottle` — one npm scope for everything, matching the GitHub org and `openthrottle.ai`.
- **Format**: `kebab-case`, and the package name is always `@openthrottle/<directory name>` — no divergence between the two.
- **Location**: `packages/<name>/`
- **Prefix by surface**, so the name says where a package can be consumed: `nestjs-*` (server modules), `react-router-*` (app libs), `nodejs-*` (runtime-agnostic Node), `openthrottle-*` (product surfaces such as `openthrottle-mcp`, `openthrottle-drivers`), `agentic-*` (the agent layer).
- **Do not** re-state the scope in a name for its own sake — `@openthrottle/openthrottle-mcp` earns the repetition because the product surface is itself called "openthrottle-mcp"; a generic library does not.

### Code-Level Conventions

For code-level naming conventions (variables, functions, classes), see [`.cursor/rules/coding/naming-conventions.mdc`](.cursor/rules/coding/naming-conventions.mdc).

## Creating New Projects

### Using Generators

**Always use generators when available** to ensure consistent project structure:

```bash
# List available generators
NX_ISOLATE_PLUGINS=false pnpm nx list @tools/generators

# Generate a new project
NX_ISOLATE_PLUGINS=false pnpm nx generate @tools/generators:<GENERATOR_NAME>
```

### Manual Creation

If no generator exists, follow these guidelines:

1. **Choose the right location**: `applications/` or `packages/`
2. **Follow naming conventions**: Use kebab-case for directories
3. **Set up package.json**: Include proper NX configuration and tags
4. **Add technology tags**: See [CONTRIBUTING.md](./CONTRIBUTING.md) for technology tag requirements
5. **Configure build/test**: Set up appropriate NX targets
6. **Add to workspace**: Ensure `pnpm-workspace.yaml` includes your project path

## Dependency Management

### Workspace Configuration

The monorepo uses [pnpm workspaces](https://pnpm.io/workspaces) for dependency management. Workspace configuration is defined in `pnpm-workspace.yaml`:

```yaml
packages:
  - 'applications/**/*'
  - 'packages/**/*'
  - 'tools/*'
```

### Installing Dependencies

**Root-level dependencies** (shared tooling, dev dependencies):

```bash
pnpm add -w -D <package-name>
```

**Project-specific dependencies**:

```bash
# Using --filter
pnpm add <package-name> --filter <project-name>

# Or navigate to project directory
cd applications/my-app
pnpm add <package-name>
```

### Dependency Catalog (required)

All external dependency versions are managed through the [pnpm catalog](https://pnpm.io/catalogs) defined in `pnpm-workspace.yaml`. Every `dependencies`, `devDependencies`, and `optionalDependencies` entry in every workspace `package.json` must use the `catalog:` protocol — never a literal version:

```json
{
  "dependencies": {
    "zod": "catalog:"
  }
}
```

To add or upgrade a dependency, edit (or add) its entry in the `catalog:` section of `pnpm-workspace.yaml`, reference it with `"<name>": "catalog:"` in the consuming `package.json`, and run `pnpm install`.

**peerDependencies policy:** peer ranges on published packages are part of their public API. A peer entry uses `catalog:` only when its range is intentionally identical to the catalog version; intentionally _wide_ ranges (e.g. `"react": ">=18.0.0"`, `"@nestjs/common": "^11.0.0"`) stay literal so consumers outside this workspace aren't over-constrained.

`pnpm publish` replaces `catalog:` with the concrete version at pack time, so published `@openthrottle/*` manifests never contain the protocol.

Coverage is enforced by `scripts/check-catalog-coverage.ts` (run as part of `pnpm run check:local`).

### Internal Package References

Applications and packages can reference each other directly:

```json
{
  "dependencies": {
    "@openthrottle/xxxxxx": "workspace:^"
  }
}
```

The `workspace:^` protocol tells pnpm to use the local workspace version.

### Dependency Sharing Patterns

- **Shared utilities**: Install in packages, import in applications
- **Framework dependencies**: Install at project level (React, NestJS, etc.)
- **Dev dependencies**: Install at root with `-w` flag when shared, at project level when specific

## Testing Requirements

### Test Structure

- **Test files**: Co-located with source files or in `__tests__/` directories
- **Test framework**: Vitest (configured per project)
- **Test location**: `tests/` directory or alongside source files

### Running Tests

```bash
# Run tests for a specific project
pnpm nx run <project-name>:test

# Run tests for changed projects
pnpm nx run <project-name>:test --changed

# Watch mode
pnpm nx run <project-name>:test --watch
```

### `typecheck` versus `test`

Do not confuse these Nx targets:

- **`typecheck`** — TypeScript only. Type-checks **source and test files** (`tsc --build … --emitDeclarationOnly` plus `tsc --noEmit -p tsconfig.test.json` when a test config exists); **does not execute test bodies** (no Vitest, no assertions run). It is a single target — it replaced the former `typecheck` + `typecheck-tests` split.
- **`test`** — Vitest (`@nx/vitest:test`). **Executes** unit and integration tests.

CI P0 runs affected `typecheck` on every PR; phased Vitest runs use the `test` target (see [docs/monorepo/CI-quality-gates.md](docs/monorepo/CI-quality-gates.md)). Contributor summary: [CONTRIBUTING.md](./CONTRIBUTING.md#testing-typecheck-versus-test).

### Test Coverage Expectations

- All new code should have corresponding tests
- Test edge cases and error conditions
- Use model factories and entity factories when available
- Follow testing conventions from [`.cursor/rules/`](.cursor/rules/)

## Project Setup Examples

### React Router Application

**Example**: `applications/openthrottle-website/`

**Key Files:**

- `package.json` - NX configuration with React Router tags
- `react-router.config.ts` - React Router configuration
- `vite.config.ts` - Vite build configuration
- `app/` - Application source code
- `public/` - Static assets

**Tags:**

```json
{
  "tags": [
    "name:openthrottle-frontend-app",
    "production:true",
    "technology:react",
    "technology:react-router",
    "type:application"
  ]
}
```

**NX Targets:**

- `dev` - Development server
- `build` - Production build
- `test` - Run tests
- `typecheck` - TypeScript type checking

### NestJS API Application

**Example**: `applications/nestjs-rest-api/`

**Key Files:**

- `package.json` - NX configuration with NestJS tags
- `nest-cli.json` - NestJS CLI configuration
- `src/main.ts` - Application entry point
- `src/modules/` - Feature modules
- `src/services/` - Business logic services

**Tags:**

```json
{
  "tags": [
    "name:nestjs-rest-api",
    "production:true",
    "technology:nestjs",
    "type:application"
  ]
}
```

**NX Targets:**

- `dev` - Development server with watch mode
- `build` - Production build
- `start` - Production server
- `test` - Run tests

### TypeScript-Only Package

**Example**: `packages/visormatt/react-router-utils/`

**Key Files:**

- `package.json` - NX configuration with TypeScript tags
- `src/index.ts` - Package entry point
- `tsconfig.json` - TypeScript configuration
- `vitest.config.ts` - Test configuration

**Tags:**

```json
{
  "tags": [
    "name:@openthrottle/react-router-utils",
    "production:true",
    "technology:typescript",
    "type:package"
  ]
}
```

**NX Targets:**

- `build` - Build package
- `test` - Run tests
- `typecheck` - TypeScript type checking

### React Component Library Package

**Example**: `packages/visormatt/react-goodies/`

**Key Files:**

- `package.json` - NX configuration with React tags
- `src/index.ts` - Package entry point
- `src/components/` - React components
- `src/hooks/` - React hooks
- `vite.config.ts` - Build configuration

**Tags:**

```json
{
  "tags": [
    "name:@visormatt/react-goodies",
    "production:true",
    "technology:react",
    "type:package"
  ]
}
```

**NX Targets:**

- `build` - Build package
- `test` - Run tests
- `typecheck` - TypeScript type checking

## Building the full workspace

Build a single project with `pnpm nx run <project>:build`. To build everything at once, use the reliable full-build lane:

```bash
pnpm run build:all   # nx run-many --target=build,typecheck --all --parallel=2
```

### Full builds under `--parallel` (reliability)

Most projects compile through TypeScript **project references** (`composite: true`). Under a cold, high-parallelism full build — e.g. `nx run-many --target=build,typecheck --all --parallel=4 --skip-nx-cache` — multiple `tsc --build` processes can each independently (re)build the **same shared dependency**, because `tsc --build` resolves and rebuilds references on its own, outside Nx's task scheduling. Two processes writing the same `dist/*.d.ts` at once surface as flaky, non-deterministic failures even though every project passes in isolation:

- `TS6305` — `Output file '…/dist/src/index.d.ts' has not been built from source file …`
- `TS2307` / `TS7016` — a dependency's declarations are momentarily missing (or `.js` exists without `.d.ts`) while another process rewrites them.

Two hardening changes reduce this (see `nx.json` `targetDefaults` and the app `vite.config.ts` files):

- **Ordered declaration writes.** `typecheck` depends on `^build`, its own `build`, and `^typecheck`; `build` depends on `^typecheck`. For any project its own build precedes its own typecheck, and a dependent waits for each dependency's build **and** typecheck — so within Nx's scheduling no `dist` is read while another task writes it. This eliminated the `TS6305`/`TS2307` signatures across repeated cold `--parallel=4` runs.
- **No fixed-port build server.** `vite-bundle-analyzer` is gated behind `ANALYZE=true` (and uses `analyzerPort: 'auto'`), so app builds no longer start a server on the fixed port `8888` and collide under `--parallel` (`EADDRINUSE`).

These remove the named signatures, but `tsc --build`'s autonomous reference rebuilds can still occasionally collide at high parallelism. **For a trustworthy cold full build, lower the parallelism** to `--parallel=2` (as `pnpm run build:all` does); `--parallel=4` was intermittently flaky. When reproducing, purge first (`rm -rf .nx/workspace-data` and `dist`/`*.tsbuildinfo`) — stale `.nx/workspace-data` compounds the issue. If you need higher throughput in CI, connect [Nx Cloud and enable automatic flaky-task retry](https://nx.dev/ci/features/flaky-tasks); this workspace currently uses GCS bucket-based remote caching rather than Nx Cloud, so flaky-task retry is not active today.

### Projects without a `build` target

A little under a third of the Nx projects in this workspace do **not** expose a `build` target (audit the exact set with the two `nx show projects` commands at the end of this section — a hardcoded count goes stale every time a package lands). That is intentional — not missing CI coverage. These projects are validated with **`lint`**, **`typecheck`** (which covers source and test files), and (where present) **`test`**, and their output is produced when a **consumer** runs `build`, `dev`, or Vite production bundling.

Most no-build packages are **`technology:react-router`** workspace libraries under `packages/react-router-*` (plus a couple of React-related codegen/MCP helpers). They follow a **source-first** pattern: `package.json` `main`/`module`/`types` point at `./src/index.ts` (not a precompiled `dist/`), and React Router apps (Vite) transpile these workspace dependencies when you run `dev` or `build` on the app. Their `nx.targets` use `__build`/`__build-package` placeholders so the `@nx/js/typescript` plugin does not infer a library `build` target. Do **not** add a standalone `build` target to these libraries unless you are deliberately moving them to a publishable `dist/` workflow.

When you change one of these projects, run its `lint`/`typecheck`/`test`, then run `build` or `dev` on a consumer app (e.g. `openthrottle-developer`) as the integration check — `pnpm nx affected --target=build` will not schedule the no-build projects. Audit the set by grepping `package.json` for the `__build` placeholder: Nx _infers_ a `build` target from a package's `vite.config.ts`, so `pnpm nx show projects --with-target=build` lists source-first packages too and cannot tell you which set is which.

For `@openthrottle/react-router-shadcn` specifically, `applications/openthrottle-workbench` (Storybook) is usually the faster integration check than booting a full app — it consumes the package's `src/` straight through Vite and takes no `build` dependency on it. See [applications/openthrottle-workbench/README.md](./applications/openthrottle-workbench/README.md).

### The component workbench

`applications/openthrottle-workbench` is a Storybook 10 host for the shadcn component library — the place to browse components, exercise `cva` variants, read generated API tables, and view the library under every theme in the registry. It is a local dev tool: `production:false`, not deployed.

It owns **no components and no stories**. Stories are co-located in `packages/react-router-shadcn/src/components/`, beside the component they document — the precedent set by that package's ESLint config, which exempts `**/*.stories.tsx` from the component-shape rule. Scaffold one with `NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react --subGenerator=story --destination=@openthrottle/react-router-shadcn --name=<Name>` (`--name` takes a comma-separated list for batches).

## Additional Resources

### Documentation

- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: How to contribute — setup, the local change loop (`pnpm run check:local`), commit/PR conventions, and the CLA
- **[docs/monorepo/NX/tags.md](./docs/monorepo/NX/tags.md)**: Complete technology tag reference
- **[docs/monorepo/nx-graph.md](./docs/monorepo/nx-graph.md)**: NX graph and dependency visualization (ground truth: `nx graph`, `nx show projects`)
- **[docs/monorepo/component-primitive-shape.md](./docs/monorepo/component-primitive-shape.md)**: The enforced shape every authored React component must follow (derived from the `@tools/generators` component template)
- **[README.md](./README.md)**: General monorepo overview and setup

### NX Resources

- **[NX Documentation](https://nx.dev/)**: Official NX documentation
- **[NX Graph](https://nx.dev/nx-cloud/features/distribute-task-execution)**: Visualize project dependencies
- **Local Graph**: Run `nx graph` to see the project dependency graph

### Validation Scripts

- **Technology Tags**: `pnpm nx:validate-tags` - Validates all project tags
- **Type Checking**: `nx affected --targets typecheck` - Type checks affected projects
- **Linting**: `nx affected --targets lint` - Lints affected projects

### Getting Help

- Review existing projects for examples
- Check [docs/monorepo/](./docs/monorepo/) for detailed documentation
- Open an issue at [`/issues/new/choose`](https://github.com/OpenThrottle/monorepo/issues/new/choose) — a blank issue is still available for questions that fit neither form
