# Monorepo Structure and Contribution Guidelines

This document provides comprehensive guidance on the monorepo structure, organization rationale, and contribution guidelines.

**Related Documentation:**

- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Project tags, technology tags, and contribution guidelines
- **[docs/monorepo/NX/tags.md](./docs/monorepo/NX/tags.md)**: Complete technology tag reference

## Table of Contents

- [Architecture Overview](#architecture-overview)
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

## Directory Structure

```bash
monorepo/
├── applications/          # Standalone deployable applications
├── databases/             # Database schemas and migrations
├── docs/                  # Documentation
│   └── monorepo/          # Monorepo-specific documentation
├── infra/                 # Infrastructure as code
├── packages/              # Reusable libraries and packages
│   ├── barguide/          # Domain-specific packages for BarGuide
│   ├── intouch/           # Domain-specific packages for InTouch
│   ├── mattscholta/       # Domain-specific packages
│   ├── rocketcms/         # Domain-specific packages for RocketCMS
│   └── visormatt/         # Personal/shared packages
├── scripts/               # Utility scripts (Bash + TypeScript)
└── tools/                 # Development tools and generators
```

### Key Directories Explained

- **`applications/`**: Contains all standalone, deployable applications. Each application is a complete project that can be built and deployed independently.
- **`docs/monorepo/`**: Contains monorepo-specific documentation including technology tags reference, dependency relationships, and NX documentation.
- **`packages/`**: Contains reusable libraries. Can be organized by domain (e.g., `packages/barguide/`) or as top-level shared packages (e.g., `packages/visormatt/`).
- **`scripts/`**: Utility scripts for common tasks like setup, validation, and automation.
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

- `barguide` - React Router web application (deployed to barguide.io)
- `nestjs-rest-api` - NestJS REST API (deployed as a service)
- `intouch` - React Native mobile app (published to app stores)

### When to Create a Package

Create a **package** when you need:

- ✅ Reusable code shared across multiple applications
- ✅ A library that could be published to npm
- ✅ Shared utilities, components, or services
- ✅ Code that doesn't have its own deployment target
- ✅ Domain-specific logic that multiple apps consume

**Examples:**

- `@barguide/react-native-ui` - React Native components for BarGuide apps
- `@openthrottle/nestjs-auth` - NestJS authentication utilities
- `@visormatt/react-goodies` - React utilities used across multiple apps

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

### Domain-Specific Packages

Packages can be organized under a domain/application namespace when they're specific to that domain:

```bash
packages/
├── barguide/              # BarGuide-specific packages
│   ├── react-router/      # React Router utilities for BarGuide
│   ├── react-native-ui/   # React Native components for BarGuide apps
│   └── supabase/          # Supabase utilities for BarGuide
│
└── intouch/               # InTouch-specific packages
    └── react-native-ui/   # React Native components for InTouch
```

**When to use domain-specific organization:**

- Package is only used by one application or domain
- Package contains domain-specific business logic
- Package is tightly coupled to a specific application

### Shared Packages

Packages at the top level (or under personal namespaces) are shared across domains:

```bash
packages/
└── visormatt/             # Shared/personal packages
    ├── react-goodies/     # React utilities (used by multiple apps)
    ├── react-router-utils/ # React Router utilities (used by multiple apps)
    └── nestjs-auth/       # NestJS utilities (used by multiple APIs)
```

**When to use shared organization:**

- Package is used by multiple applications/domains
- Package contains generic, reusable functionality
- Package could be published independently

### Package Discovery

Before creating a new package, check if similar functionality exists:

1. **Search existing packages**: Look for similar functionality in `packages/`
2. **Check domain packages**: Review domain-specific packages (e.g., `packages/barguide/`)
3. **Review shared packages**: Check top-level shared packages
4. **Consider extending**: If similar functionality exists, consider extending it rather than creating new

## Naming Conventions

### Applications

- **Format**: `kebab-case`
- **Examples**: `barguide`, `nestjs-rest-api`, `intouch`
- **Location**: `applications/<name>/`

### Packages

- **Format**: Scoped packages (`@<namespace>/<name>`) or unscoped (`<name>`)
- **Scoped Examples**: `@visormatt/react-goodies`, `@barguide/react-native-ui`
- **Unscoped Examples**: (rare, typically for published packages)
- **Location**: `packages/<namespace>/<name>/` or `packages/<name>/`

### Nested Packages

When organizing packages under a domain:

- **Format**: `packages/<domain>/<package-name>/`
- **Examples**:
  - `packages/barguide/react-router/` → `@barguide/react-router`
  - `packages/intouch/react-native-ui/` → `@intouch/react-native-ui`

### Code-Level Conventions

For code-level naming conventions (variables, functions, classes), see [`.cursor/rules/coding/naming-conventions.mdc`](.cursor/rules/coding/naming-conventions.mdc).

## Creating New Projects

### Using Generators

**Always use generators when available** to ensure consistent project structure:

```bash
# List available generators
nx list @tools/generators

# Generate a new project
nx generate @tools/generators:<GENERATOR_NAME>
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

### Internal Package References

Applications and packages can reference each other directly:

```json
{
  "dependencies": {
    "@visormatt/react-goodies": "workspace:*",
    "@barguide/react-native-ui": "workspace:*"
  }
}
```

The `workspace:*` protocol tells pnpm to use the local workspace version.

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
nx run <project-name>:test

# Run tests for changed projects
nx run <project-name>:test --changed

# Watch mode
nx run <project-name>:test --watch
```

### Test Coverage Expectations

- All new code should have corresponding tests
- Test edge cases and error conditions
- Use model factories and entity factories when available
- Follow testing conventions from [`.cursor/rules/`](.cursor/rules/)

## Project Setup Examples

### React Router Application

**Example**: `applications/barguide/`

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
    "name:barguide",
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

### React Native/Expo Application

**Example**: `applications/intouch/`

**Key Files:**

- `package.json` - NX configuration with Expo/React Native tags
- `app.json` / `app.config.ts` - Expo configuration
- `src/` - Application source code
- `assets/` - Images, fonts, etc.

**Tags:**

```json
{
  "tags": [
    "name:intouch",
    "production:true",
    "technology:expo",
    "technology:react-native",
    "type:application"
  ]
}
```

**NX Targets:**

- `dev` - Development server
- `build` - Build for iOS/Android
- `test` - Run tests
- `test-e2e` - End-to-end tests

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

## Additional Resources

### Documentation

- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Project tags (name, type, production, technology), tag usage, and contribution guidelines
- **[docs/monorepo/NX/tags.md](./docs/monorepo/NX/tags.md)**: Complete technology tag reference
- **[docs/monorepo/NX/dependencies.md](./docs/monorepo/NX/dependencies.md)**: Dependency relationship documentation
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
- Open an issue for clarification or questions
